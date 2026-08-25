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

  addLink('manifest', '/manifest.webmanifest');
  addMeta('theme-color', '#b9858f');
  addMeta('mobile-web-app-capable', 'yes');
  addMeta('apple-mobile-web-app-capable', 'yes');
  addMeta('apple-mobile-web-app-status-bar-style', 'default');
  addMeta('apple-mobile-web-app-title', 'Lumi Nails');
  addMeta('format-detection', 'telephone=yes');
  ensureViewportFit();

  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    if (document.readyState === 'complete') {
      registerServiceWorker();
    } else {
      window.addEventListener('load', registerServiceWorker, { once: true });
    }
  }

  if (location.pathname === '/admin' || location.pathname.startsWith('/admin/')) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', setupAdminPushControls, { once: true });
    } else {
      setupAdminPushControls();
    }
  }

  async function registerServiceWorker() {
    try {
      PWA.registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    } catch (error) {
      console.warn('Lumi PWA service worker registration failed:', error);
    }
  }

  function setupAdminPushControls() {
    const attach = () => {
      const actions = document.querySelector('.admin-akciok');
      if (!actions || document.getElementById('admin-push-toggle')) return false;

      const button = document.createElement('button');
      button.type = 'button';
      button.id = 'admin-push-toggle';
      button.className = 'gomb admin-gomb';
      button.textContent = 'Értesítések bekapcsolása';

      const status = document.createElement('span');
      status.id = 'admin-push-status';
      status.setAttribute('aria-live', 'polite');
      status.style.display = 'block';
      status.style.width = '100%';
      status.style.fontSize = '13px';

      actions.appendChild(button);
      actions.appendChild(status);

      refreshPushButton(button, status);
      button.addEventListener('click', async () => {
        button.disabled = true;
        status.textContent = '';
        try {
          if (await PWA.hasPushSubscription()) {
            await PWA.disableAdminPush();
            status.textContent = 'Az értesítések ki vannak kapcsolva ezen az eszközön.';
          } else {
            await PWA.enableAdminPush();
            status.textContent = 'Az értesítések be vannak kapcsolva ezen az eszközön.';
          }
        } catch (error) {
          status.textContent = error instanceof Error ? error.message : 'Az értesítési beállítás nem sikerült.';
        } finally {
          button.disabled = false;
          await refreshPushButton(button, status, false);
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

  async function refreshPushButton(button, status, updateStatus = true) {
    if (!PWA.supportsNotifications()) {
      button.textContent = 'Értesítések nem támogatottak';
      button.disabled = true;
      if (updateStatus) status.textContent = 'Ezen az eszközön a Web Push nem érhető el.';
      return;
    }

    try {
      const active = await PWA.hasPushSubscription();
      button.textContent = active ? 'Értesítések kikapcsolása' : 'Értesítések bekapcsolása';
      if (updateStatus && active) status.textContent = 'Ez az eszköz fel van iratkozva a Lumi Nails értesítésekre.';
    } catch {
      button.textContent = 'Értesítések bekapcsolása';
    }
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

  function ensureViewportFit() {
    const viewport = document.head.querySelector('meta[name="viewport"]');
    if (!viewport) return;
    if (!viewport.content.includes('viewport-fit=')) {
      viewport.content = `${viewport.content}, viewport-fit=cover`;
    }
  }

  function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = atob(base64);
    return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
  }
})();
