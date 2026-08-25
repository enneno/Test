(() => {
  const isAdminPath = location.pathname === '/admin' || location.pathname.startsWith('/admin/');
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

  if (!isAdminPath || !isStandalone) return;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupStandaloneAdminShell, { once: true });
  } else {
    setupStandaloneAdminShell();
  }

  function setupStandaloneAdminShell() {
    const body = document.body;
    const tartalom = document.getElementById('admin-tartalom');
    if (!body || !tartalom || document.getElementById('pwa-admin-tabbar')) return;

    body.classList.add('lumi-admin-standalone');

    const tabbar = document.createElement('nav');
    tabbar.id = 'pwa-admin-tabbar';
    tabbar.className = 'pwa-admin-tabbar';
    tabbar.setAttribute('aria-label', 'Admin alkalmazás navigáció');
    tabbar.innerHTML = `
      ${appButton('menu', 'Menü', 'data-pwa-admin-menu')}
      ${appButton('overview', 'Áttekintés', 'data-admin-v2-nav="attekintes"')}
      ${appButton('calendar', 'Foglalások', 'data-admin-v2-nav="foglalasok"', '<span class="pwa-admin-tabbar-count" data-admin-v2-pending-count hidden>0</span>')}
      ${appButton('save', 'Mentés', 'data-pwa-admin-save', '', 'pwa-admin-tabbar-save')}
      ${appButton('clock', 'Munkaidő', 'data-admin-v2-nav="munkaido"')}
      ${appButton('bell', 'Értesítések', 'data-pwa-admin-notifications', '<span class="pwa-admin-tabbar-dot" data-admin-v2-email-alert data-admin-v2-notification-alert hidden></span>')}
    `;

    const quickAdd = document.createElement('button');
    quickAdd.type = 'button';
    quickAdd.id = 'pwa-admin-quick-add';
    quickAdd.className = 'pwa-admin-quick-add';
    quickAdd.dataset.adminV2Panel = 'tiltasok';
    quickAdd.setAttribute('aria-label', 'Kézzel felvett idő hozzáadása');
    quickAdd.title = 'Kézzel felvett idő hozzáadása';
    quickAdd.innerHTML = `${appIcon('plus')}<span class="pwa-admin-sr-only">Kézzel felvett idő hozzáadása</span>`;

    tartalom.append(tabbar, quickAdd);
    removeLegacyFloatingSave();

    tabbar.addEventListener('click', event => {
      const menuButton = event.target.closest('[data-pwa-admin-menu]');
      if (menuButton) {
        document.querySelector('.admin-v2-topbar [data-admin-v2-menu]')?.click();
        queueRefresh();
        return;
      }

      const notificationButton = event.target.closest('[data-pwa-admin-notifications]');
      if (notificationButton) {
        document.querySelector('.admin-v2-topbar [data-admin-v2-notifications-toggle]')?.click();
        queueRefresh();
        return;
      }

      const saveButton = event.target.closest('[data-pwa-admin-save]');
      if (saveButton) {
        const source = getActiveAdminSaveButton();
        if (!source || source.disabled) return;
        source.click();
        queueRefresh();
      }
    });

    let refreshQueued = false;
    function queueRefresh() {
      if (refreshQueued) return;
      refreshQueued = true;
      requestAnimationFrame(() => {
        refreshQueued = false;
        refreshStandaloneAdminShell();
      });
    }

    function refreshStandaloneAdminShell() {
      removeLegacyFloatingSave();

      const activeGroup = body.dataset.adminV2Group || body.dataset.adminV2Tab || 'attekintes';
      tabbar.querySelectorAll('[data-admin-v2-nav]').forEach(button => {
        const active = button.dataset.adminV2Nav === activeGroup;
        button.classList.toggle('is-active', active);
        button.setAttribute('aria-current', active ? 'page' : 'false');
      });

      const menu = tabbar.querySelector('[data-pwa-admin-menu]');
      const menuOpen = body.classList.contains('admin-v2-menu-open');
      menu?.classList.toggle('is-open', menuOpen);
      menu?.setAttribute('aria-expanded', String(menuOpen));

      const notificationPanel = document.querySelector('[data-admin-v2-notification-panel]');
      const notification = tabbar.querySelector('[data-pwa-admin-notifications]');
      const notificationOpen = Boolean(notificationPanel && !notificationPanel.hidden);
      notification?.classList.toggle('is-active', notificationOpen);
      notification?.setAttribute('aria-expanded', String(notificationOpen));

      const save = tabbar.querySelector('[data-pwa-admin-save]');
      const saveSource = getActiveAdminSaveButton();
      const saveDisabled = !saveSource || saveSource.disabled;
      if (save) {
        save.disabled = saveDisabled;
        const label = saveSource?.textContent?.trim() || 'Ezen a nézeten nincs menthető módosítás';
        save.setAttribute('aria-label', label);
        save.title = label;
      }

      const pendingSource = document.querySelector('.admin-v2-nav [data-admin-v2-pending-count]');
      const pendingTarget = tabbar.querySelector('[data-admin-v2-pending-count]');
      if (pendingTarget && pendingSource && pendingTarget !== pendingSource) {
        pendingTarget.textContent = pendingSource.textContent || '0';
        pendingTarget.hidden = pendingSource.hidden;
      }

      const alertSource = document.querySelector('.admin-v2-topbar [data-admin-v2-notification-alert]');
      const alertTarget = tabbar.querySelector('[data-admin-v2-notification-alert]');
      if (alertTarget && alertSource && alertTarget !== alertSource) {
        alertTarget.hidden = alertSource.hidden;
      }
    }

    const bodyObserver = new MutationObserver(queueRefresh);
    bodyObserver.observe(body, {
      attributes: true,
      attributeFilter: ['class', 'data-admin-v2-group', 'data-admin-v2-tab']
    });

    const contentObserver = new MutationObserver(queueRefresh);
    contentObserver.observe(tartalom, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'hidden', 'disabled']
    });

    queueRefresh();
  }

  function removeLegacyFloatingSave() {
    document.getElementById('pwa-admin-floating-save')?.remove();
  }

  function getActiveAdminSaveButton() {
    const panels = Array.from(document.querySelectorAll('.admin-db-panel'));
    const activePanel = panels.find(panel => {
      if (!panel.classList.contains('aktiv') || panel.hidden) return false;
      return window.getComputedStyle(panel).display !== 'none';
    });
    return activePanel?.querySelector('[data-admin-v2-save]') || null;
  }

  function appButton(icon, label, attributes, suffix = '', extraClass = '') {
    return `
      <button type="button" class="pwa-admin-tabbar-button ${extraClass}" ${attributes} aria-label="${label}" title="${label}">
        ${appIcon(icon)}${suffix}<span class="pwa-admin-sr-only">${label}</span>
      </button>
    `;
  }

  function appIcon(name) {
    const paths = {
      menu: '<path d="M5 7h14M5 12h14M5 17h14"></path>',
      overview: '<path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z"></path>',
      calendar: '<path d="M6 3v3M18 3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v14H4V6a1 1 0 0 1 1-1z"></path>',
      save: '<path d="M5 4h12l2 2v14H5zM8 4v6h8V4M8 20v-6h8v6"></path>',
      clock: '<circle cx="12" cy="12" r="8"></circle><path d="M12 8v5l3 2"></path>',
      bell: '<path d="M7 17h10M9 20h6M6.5 17c1-1.2 1.5-2.8 1.5-4.5V10a4 4 0 0 1 8 0v2.5c0 1.7.5 3.3 1.5 4.5"></path>',
      plus: '<path d="M12 5v14M5 12h14"></path>'
    };
    return `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${paths[name] || paths.overview}</svg>`;
  }
})();
