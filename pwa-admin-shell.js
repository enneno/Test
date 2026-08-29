(() => {
  const isAdminPath = location.pathname === '/admin' || location.pathname.startsWith('/admin/');
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

  if (!isAdminPath || !isStandalone) return;

  const viewportMeta = document.querySelector('meta[name="viewport"]');
  if (viewportMeta) {
    viewportMeta.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover');
  }

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

    function mountNotificationPanel() {
      const panel = document.querySelector('[data-admin-v2-notification-panel]');
      if (panel && panel.parentElement !== tartalom) tartalom.append(panel);
      return panel;
    }

    mountNotificationPanel();

    const tabbar = document.createElement('nav');
    tabbar.id = 'pwa-admin-tabbar';
    tabbar.className = 'pwa-admin-toolbar-dock';
    tabbar.setAttribute('aria-label', 'Admin alkalmazás navigáció');
    tabbar.innerHTML = `
      ${appButton('menu', 'Menü', 'data-pwa-admin-menu')}
      ${appButton('calendar', 'Foglalások', 'data-admin-v2-nav="foglalasok"', '<span class="pwa-admin-toolbar-count" data-admin-v2-pending-count hidden>0</span>')}
      ${appButton('overview', 'Áttekintés', 'data-admin-v2-nav="attekintes"')}
      ${appButton('calculator', 'Árkalkulátor', 'data-admin-v2-nav="arkalkulator"')}
      ${appButton('chevron-up', 'További menük', 'data-pwa-admin-more aria-expanded="false" aria-controls="pwa-admin-more-menu"', '<span class="pwa-admin-toolbar-dot" data-pwa-admin-more-alert hidden></span>')}
      ${appButton('save', 'Mentés', 'data-pwa-admin-save', '', 'pwa-admin-toolbar-save')}
    `;

    const moreMenu = document.createElement('nav');
    moreMenu.id = 'pwa-admin-more-menu';
    moreMenu.className = 'pwa-admin-toolbar-more';
    moreMenu.setAttribute('aria-label', 'További admin műveletek');
    moreMenu.hidden = true;
    moreMenu.innerHTML = `
      ${appButton('plus', 'Kézi idő', 'data-admin-v2-panel="tiltasok"')}
      ${appButton('clock', 'Munkaidő', 'data-admin-v2-nav="munkaido"')}
      ${appButton('website', 'Weboldal', 'data-admin-v2-nav="weboldal"')}
      ${appButton('users', 'Vendégek', 'data-admin-v2-nav="vendegek"')}
      ${appButton('bell', 'Értesítések', 'data-pwa-admin-notifications aria-expanded="false" aria-controls="admin-v2-notification-panel"', '<span class="pwa-admin-toolbar-dot" data-admin-v2-email-alert data-admin-v2-notification-alert hidden></span>')}
    `;

    tartalom.append(tabbar, moreMenu);
    removeLegacyFloatingSave();

    const toolbarClick = event => {
      const moreButton = event.target.closest('[data-pwa-admin-more]');
      if (moreButton) {
        setMoreMenuOpen(moreMenu.hidden, { focusFirst: moreMenu.hidden });
        queueRefresh();
        return;
      }

      const menuButton = event.target.closest('[data-pwa-admin-menu]');
      if (menuButton) {
        setMoreMenuOpen(false);
        document.querySelector('.admin-v2-topbar [data-admin-v2-menu]')?.click();
        queueRefresh();
        return;
      }

      const notificationButton = event.target.closest('[data-pwa-admin-notifications]');
      if (notificationButton) {
        event.stopPropagation();
        mountNotificationPanel();
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
        return;
      }

      if (event.target.closest('[data-admin-v2-nav], [data-admin-v2-panel]')) {
        setMoreMenuOpen(false);
        queueRefresh();
      }
    };

    tabbar.addEventListener('click', toolbarClick);
    moreMenu.addEventListener('click', toolbarClick);

    document.addEventListener('pointerdown', event => {
      if (moreMenu.hidden || tabbar.contains(event.target) || moreMenu.contains(event.target)) return;
      if (document.querySelector('[data-admin-v2-notification-panel]')?.contains(event.target)) return;
      setMoreMenuOpen(false);
      queueRefresh();
    });

    document.addEventListener('keydown', event => {
      if (event.key !== 'Escape' || moreMenu.hidden) return;
      setMoreMenuOpen(false, { restoreFocus: true });
      queueRefresh();
    });

    function setMoreMenuOpen(open, { focusFirst = false, restoreFocus = false } = {}) {
      const moreButton = tabbar.querySelector('[data-pwa-admin-more]');
      moreMenu.hidden = !open;
      body.classList.toggle('pwa-admin-more-open', open);
      moreButton?.classList.toggle('is-open', open);
      moreButton?.setAttribute('aria-expanded', String(open));
      if (focusFirst && open) moreMenu.querySelector('button')?.focus({ preventScroll: true });
      if (restoreFocus && !open) moreButton?.focus({ preventScroll: true });
    }

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
      const notificationPanel = mountNotificationPanel();

      const activeGroup = body.dataset.adminV2Group || body.dataset.adminV2Tab || 'attekintes';
      [...tabbar.querySelectorAll('[data-admin-v2-nav]'), ...moreMenu.querySelectorAll('[data-admin-v2-nav]')].forEach(button => {
        const active = button.dataset.adminV2Nav === activeGroup;
        button.classList.toggle('is-active', active);
        button.setAttribute('aria-current', active ? 'page' : 'false');
      });

      const menu = tabbar.querySelector('[data-pwa-admin-menu]');
      const menuOpen = body.classList.contains('admin-v2-menu-open');
      menu?.classList.toggle('is-open', menuOpen);
      menu?.setAttribute('aria-expanded', String(menuOpen));

      const notification = moreMenu.querySelector('[data-pwa-admin-notifications]');
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
      const alertTargets = [
        moreMenu.querySelector('[data-admin-v2-notification-alert]'),
        tabbar.querySelector('[data-pwa-admin-more-alert]')
      ];
      alertTargets.forEach(alertTarget => {
        if (alertTarget && alertSource && alertTarget !== alertSource) alertTarget.hidden = alertSource.hidden;
      });
    }

    const bodyObserver = new MutationObserver(queueRefresh);
    bodyObserver.observe(body, {
      childList: true,
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
      <button type="button" class="pwa-admin-toolbar-button ${extraClass}" ${attributes} aria-label="${label}" title="${label}">
        ${appIcon(icon)}${suffix}<span class="pwa-admin-sr-only">${label}</span>
      </button>
    `;
  }

  function appIcon(name) {
    const paths = {
      menu: '<path d="M5 7h14M5 12h14M5 17h14"></path>',
      calendar: '<path d="M6 2v4M18 2v4M3 9h18M5 4h14a2 2 0 0 1 2 2v14H3V6a2 2 0 0 1 2-2zM7 13h3M14 13h3M7 17h3"></path>',
      save: '<path d="M5 3h11l3 3v15H5zM8 3v6h8V3M8 21v-7h8v7"></path>',
      clock: '<circle cx="12" cy="12" r="8"></circle><path d="M12 8v5l3 2"></path>',
      calculator: '<rect x="5" y="3" width="14" height="18" rx="2"></rect><path d="M8 7h8M8 11h2M14 11h2M8 15h2M14 15h2M8 18h2M14 18h2"></path>',
      website: '<path d="M4 5h16v14H4zM4 9h16M8 5v4"></path>',
      users: '<circle cx="9" cy="9" r="3"></circle><circle cx="17" cy="10" r="2.5"></circle><path d="M3.5 20v-2a4.5 4.5 0 0 1 9 0v2M14 15.5a4 4 0 0 1 6.5 3.1V20"></path>',
      'chevron-up': '<path d="m6 15 6-6 6 6"></path>',
      bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"></path>',
      plus: '<path d="M12 5v14M5 12h14"></path>',
      overview: '<rect x="4" y="4" width="6" height="6" rx="1"></rect><rect x="14" y="4" width="6" height="6" rx="1"></rect><rect x="4" y="14" width="6" height="6" rx="1"></rect><rect x="14" y="14" width="6" height="6" rx="1"></rect>'
    };
    return `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${paths[name] || paths.menu}</svg>`;
  }
})();
