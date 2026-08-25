(() => {
  const PWA = {
    registration: null,
    isStandalone() {
      return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    },
    supportsNotifications() {
      return 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
    },
    async requestNotificationPermission() {
      if (!this.supportsNotifications()) return 'unsupported';
      return Notification.requestPermission();
    },
    async setBadge(count) {
      if (!('setAppBadge' in navigator)) return false;
      const value = Number(count);
      if (!Number.isFinite(value) || value <= 0) {
        await navigator.clearAppBadge?.();
      } else {
        await navigator.setAppBadge(Math.floor(value));
      }
      return true;
    },
    async clearBadge() {
      if (!('clearAppBadge' in navigator)) return false;
      await navigator.clearAppBadge();
      return true;
    },
    async subscribeToPush(applicationServerKey) {
      if (!applicationServerKey || !this.supportsNotifications()) return null;
      if (Notification.permission !== 'granted') return null;

      const registration = this.registration || await navigator.serviceWorker.ready;
      this.registration = registration;
      const existing = await registration.pushManager.getSubscription();
      if (existing) return existing;

      return registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(applicationServerKey)
      });
    },
    async enableAdminPush() {
      if (!this.supportsNotifications()) {
        throw new Error('Ezen az eszközön a Web Push nem támogatott.');
      }

      if (isIosDevice() && !this.isStandalone()) {
        throw new Error('iPhone-on előbb add a Lumi Nails oldalt a Főképernyőhöz, majd onnan nyisd meg.');
      }

      const permission = await this.requestNotificationPermission();
      if (permission !== 'granted') {
        throw new Error('Az értesítési engedély nincs megadva.');
      }

      const client = getSupabaseClient();
      const { data: config, error: configError } = await client.functions.invoke('web-push-subscription', {
        body: { action: 'config' }
      });
      if (configError || !config?.vapid_public_key) {
        throw new Error('A push szolgáltatás még nincs bekapcsolva a szerveren.');
      }

      const subscription = await this.subscribeToPush(config.vapid_public_key);
      if (!subscription) throw new Error('Nem sikerült létrehozni a push feliratkozást.');

      const serialized = typeof subscription.toJSON === 'function'
        ? subscription.toJSON()
        : subscription;
      const { data, error } = await client.functions.invoke('web-push-subscription', {
        body: { action: 'subscribe', subscription: serialized }
      });
      if (error || !data?.ok) {
        throw new Error('A push feliratkozás mentése nem sikerült.');
      }

      return true;
    },
    async disableAdminPush() {
      if (!('serviceWorker' in navigator)) return false;
      const registration = this.registration || await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (!subscription) return true;

      const client = getSupabaseClient();
      const { error } = await client.functions.invoke('web-push-subscription', {
        body: { action: 'unsubscribe', endpoint: subscription.endpoint }
      });
      if (error) throw new Error('A push feliratkozás törlése nem sikerült.');

      await subscription.unsubscribe();
      return true;
    },
    async hasPushSubscription() {
      if (!this.supportsNotifications()) return false;
      const registration = this.registration || await navigator.serviceWorker.ready;
      this.registration = registration;
      return Boolean(await registration.pushManager.getSubscription());
    }
  };

  window.LumiPWA = PWA;

  // Only installation/push metadata. Do not alter viewport, phone-number rendering,
  // navigation, requests, styles or any normal website behavior.
  addLink('manifest', '/manifest.webmanifest');
  addMeta('theme-color', '#b9858f');
  addMeta('mobile-web-app-capable', 'yes');
  addMeta('apple-mobile-web-app-capable', 'yes');
  addMeta('apple-mobile-web-app-status-bar-style', 'default');
  addMeta('apple-mobile-web-app-title', 'Lumi Nails');

  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    if (document.readyState === 'complete') {
      registerServiceWorker();
    } else {
      window.addEventListener('load', registerServiceWorker, { once: true });
    }
  }

  const isAdminPath = location.pathname === '/admin' || location.pathname.startsWith('/admin/');

  if (isAdminPath) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', setupAdminPwaControls, { once: true });
    } else {
      setupAdminPwaControls();
    }
  }

  async function registerServiceWorker() {
    try {
      PWA.registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    } catch (error) {
      console.warn('Lumi PWA service worker registration failed:', error);
    }
  }

  function setupAdminPwaControls() {
    setupAdminPushControls();
    if (PWA.isStandalone()) setupStandaloneAdminFloatingSave();
  }

  function setupAdminPushControls() {
    const attach = () => {
      const actions = document.querySelector('.admin-v2-account-actions');
      if (!actions || document.getElementById('admin-push-toggle')) return false;

      ensurePushSwitchStyles();

      const control = document.createElement('label');
      control.id = 'admin-push-toggle';
      control.className = 'lumi-push-switch-row';
      control.innerHTML = `
        <span class="lumi-push-switch-copy">
          <strong>Értesítések</strong>
          <small>Ezen az eszközön</small>
        </span>
        <span class="lumi-push-switch-control">
          <input id="admin-push-toggle-input" type="checkbox" role="switch" aria-label="Értesítések ezen az eszközön">
          <span class="lumi-push-switch-track" aria-hidden="true"><span class="lumi-push-switch-thumb"></span></span>
          <span id="admin-push-state" class="lumi-push-switch-state">KI</span>
        </span>
      `;

      const input = control.querySelector('#admin-push-toggle-input');
      const state = control.querySelector('#admin-push-state');
      const status = document.createElement('span');
      status.id = 'admin-push-status';
      status.className = 'lumi-push-switch-status';
      status.setAttribute('aria-live', 'polite');

      actions.insertAdjacentElement('afterend', control);
      control.insertAdjacentElement('afterend', status);

      refreshPushSwitch(input, state, status);
      input.addEventListener('change', async () => {
        const requestedState = input.checked;
        input.disabled = true;
        state.textContent = '…';
        status.textContent = requestedState ? 'Értesítések bekapcsolása…' : 'Értesítések kikapcsolása…';

        try {
          if (requestedState) {
            await PWA.enableAdminPush();
            status.textContent = 'Az értesítések be vannak kapcsolva ezen az eszközön.';
          } else {
            await PWA.disableAdminPush();
            status.textContent = 'Az értesítések ki vannak kapcsolva ezen az eszközön.';
          }
        } catch (error) {
          status.textContent = error instanceof Error ? error.message : 'Az értesítési beállítás nem sikerült.';
        } finally {
          await refreshPushSwitch(input, state, status, false);
        }
      });

      return true;
    };

    if (attach()) return;
    const observer = new MutationObserver(() => {
      if (attach()) observer.disconnect();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
    window.setTimeout(() => observer.disconnect(), 10000);
  }

  function ensurePushSwitchStyles() {
    if (document.getElementById('lumi-push-switch-styles')) return;
    const style = document.createElement('style');
    style.id = 'lumi-push-switch-styles';
    style.textContent = `
      .lumi-push-switch-row {
        margin-top: 14px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 18px;
        width: 100%;
        padding: 14px 16px;
        border: 1px solid rgba(42, 31, 33, .12);
        border-radius: 14px;
        background: rgba(255, 255, 255, .55);
        box-sizing: border-box;
        cursor: pointer;
        -webkit-tap-highlight-color: transparent;
      }
      .lumi-push-switch-copy {
        display: flex;
        flex-direction: column;
        gap: 2px;
        min-width: 0;
      }
      .lumi-push-switch-copy strong { font-size: 14px; }
      .lumi-push-switch-copy small { font-size: 12px; opacity: .65; }
      .lumi-push-switch-control {
        display: inline-flex;
        align-items: center;
        gap: 9px;
        flex: 0 0 auto;
      }
      #admin-push-toggle-input {
        position: absolute;
        width: 1px;
        height: 1px;
        opacity: 0;
        pointer-events: none;
      }
      .lumi-push-switch-track {
        position: relative;
        width: 48px;
        height: 28px;
        border-radius: 999px;
        background: rgba(42, 31, 33, .22);
        transition: background .18s ease, opacity .18s ease;
      }
      .lumi-push-switch-thumb {
        position: absolute;
        top: 3px;
        left: 3px;
        width: 22px;
        height: 22px;
        border-radius: 50%;
        background: #fff;
        box-shadow: 0 2px 6px rgba(0, 0, 0, .2);
        transition: transform .18s ease;
      }
      #admin-push-toggle-input:checked + .lumi-push-switch-track {
        background: #b9858f;
      }
      #admin-push-toggle-input:checked + .lumi-push-switch-track .lumi-push-switch-thumb {
        transform: translateX(20px);
      }
      #admin-push-toggle-input:focus-visible + .lumi-push-switch-track {
        outline: 3px solid rgba(185, 133, 143, .28);
        outline-offset: 2px;
      }
      #admin-push-toggle-input:disabled + .lumi-push-switch-track { opacity: .55; }
      .lumi-push-switch-state {
        min-width: 22px;
        font-size: 12px;
        font-weight: 700;
        text-align: right;
      }
      .lumi-push-switch-status {
        display: block;
        width: 100%;
        margin-top: 8px;
        font-size: 12px;
        opacity: .72;
      }
    `;
    document.head.appendChild(style);
  }

  async function refreshPushSwitch(input, state, status, updateStatus = true) {
    if (!PWA.supportsNotifications()) {
      input.checked = false;
      input.disabled = true;
      state.textContent = 'N/A';
      if (updateStatus) status.textContent = 'Ezen az eszközön a Web Push nem érhető el.';
      return;
    }

    try {
      const active = await PWA.hasPushSubscription();
      input.checked = active;
      input.disabled = false;
      state.textContent = active ? 'BE' : 'KI';
      if (updateStatus) {
        status.textContent = active
          ? 'Ez az eszköz fel van iratkozva a Lumi Nails értesítésekre.'
          : 'Az értesítések ki vannak kapcsolva ezen az eszközön.';
      }
    } catch {
      input.checked = false;
      input.disabled = false;
      state.textContent = 'KI';
      if (updateStatus) status.textContent = 'Az értesítési állapot nem olvasható.';
    }
  }

  function setupStandaloneAdminFloatingSave() {
    if (!PWA.isStandalone() || document.getElementById('pwa-admin-floating-save')) return;

    const button = document.createElement('button');
    button.type = 'button';
    button.id = 'pwa-admin-floating-save';
    button.className = 'admin-v2-button admin-v2-button-primary';
    button.textContent = 'Mentés';
    button.hidden = true;
    button.style.cssText = [
      'position:fixed',
      'right:18px',
      'bottom:calc(18px + env(safe-area-inset-bottom, 0px))',
      'z-index:1200',
      'min-width:112px',
      'box-shadow:0 10px 30px rgba(0,0,0,.18)'
    ].join(';');

    button.addEventListener('click', () => {
      const source = getActiveAdminSaveButton();
      if (!source || source.disabled) return;
      source.click();
    });

    document.body.appendChild(button);

    const refresh = () => {
      const source = getActiveAdminSaveButton();
      const shouldHide = !source;
      const shouldDisable = !source || source.disabled;
      if (button.hidden !== shouldHide) button.hidden = shouldHide;
      if (button.disabled !== shouldDisable) button.disabled = shouldDisable;
      button.setAttribute('aria-label', source?.textContent?.trim() || 'Mentés');
    };

    refresh();
    const observer = new MutationObserver((mutations) => {
      if (mutations.every((mutation) => mutation.target === button)) return;
      refresh();
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'hidden', 'disabled']
    });
  }

  function getActiveAdminSaveButton() {
    const panels = Array.from(document.querySelectorAll('.admin-db-panel'));
    const activePanel = panels.find(panel => {
      if (!panel.classList.contains('aktiv') || panel.hidden) return false;
      return window.getComputedStyle(panel).display !== 'none';
    });
    return activePanel?.querySelector('[data-admin-v2-save]') || null;
  }

  function getSupabaseClient() {
    const client = typeof window.lumiSupabaseClient === 'function'
      ? window.lumiSupabaseClient()
      : null;
    if (!client) throw new Error('A Supabase kapcsolat nem érhető el.');
    return client;
  }

  function isIosDevice() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent)
      || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  }

  function addLink(rel, href) {
    if (document.head.querySelector(`link[rel="${rel}"]`)) return;
    const link = document.createElement('link');
    link.rel = rel;
    link.href = href;
    document.head.appendChild(link);
  }

  function addMeta(name, content) {
    let meta = document.head.querySelector(`meta[name="${name}"]`);
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = name;
      document.head.appendChild(meta);
    }
    meta.content = content;
  }

  function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = atob(base64);
    return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
  }
})();
