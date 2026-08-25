(() => {
    'use strict';

    if (!(location.pathname === '/fiokom' || location.pathname.startsWith('/fiokom/'))) return;

    const requestedView = new URLSearchParams(location.search).get('view');
    if (requestedView !== 'regisztracio') return;

    document.addEventListener('DOMContentLoaded', () => {
        queueMicrotask(() => {
            const registrationTab = document.querySelector('[data-account-view="regisztracio"]');
            if (registrationTab instanceof HTMLElement) {
                registrationTab.click();
                registrationTab.focus({ preventScroll: true });
            }
        });
    });
})();
