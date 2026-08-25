window.LUMI_SUPABASE = {
    url: 'https://htbpzvmlegapaphsipax.supabase.co',
    publishableKey: 'sb_publishable_vrbNMFIQN4KGLzV9fQMyqg_PHtcRAZI'
};

window.lumiSupabaseClient = (() => {
    let client = null;

    return () => {
        if (client) return client;

        const config = window.LUMI_SUPABASE;
        const supabaseLib = window.supabase;

        if (!config?.url || !config?.publishableKey || !supabaseLib?.createClient) {
            return null;
        }

        client = supabaseLib.createClient(config.url, config.publishableKey);
        return client;
    };
})();

(() => {
    const isAdminPath = location.pathname === '/admin' || location.pathname.startsWith('/admin/');
    if (isAdminPath || document.querySelector('link[data-lumi-typography-tuning]')) return;
    const style = document.createElement('link');
    style.rel = 'stylesheet';
    style.href = '/typography-tuning.css?v=2';
    style.dataset.lumiTypographyTuning = 'true';
    document.head.appendChild(style);
})();

(() => {
    // Load the verified self-service booking manager before booking.js registers
    // its legacy one-reference-only handler. Parser-time loading keeps the order deterministic.
    const isBookingPath = location.pathname === '/foglalas' || location.pathname.startsWith('/foglalas/');
    if (!isBookingPath || document.querySelector('script[data-lumi-secure-booking-manager]')) return;

    if (document.readyState === 'loading') {
        document.write('<link rel="stylesheet" href="/booking-manage.css?v=1" data-lumi-secure-booking-manager-style>');
        document.write('<script src="/booking-manage.js?v=1" data-lumi-secure-booking-manager><\/script>');
        return;
    }

    if (!document.querySelector('link[data-lumi-secure-booking-manager-style]')) {
        const style = document.createElement('link');
        style.rel = 'stylesheet';
        style.href = '/booking-manage.css?v=1';
        style.dataset.lumiSecureBookingManagerStyle = 'true';
        document.head.appendChild(style);
    }

    const script = document.createElement('script');
    script.src = '/booking-manage.js?v=1';
    script.dataset.lumiSecureBookingManager = 'true';
    document.head.appendChild(script);
})();

(() => {
    const isHomePath = location.pathname === '/' || location.pathname === '/index.html';
    if (!isHomePath) return;

    if (!document.querySelector('link[data-lumi-home-account-strip]')) {
        const style = document.createElement('link');
        style.rel = 'stylesheet';
        style.href = '/home-account-strip.css?v=2';
        style.dataset.lumiHomeAccountStrip = 'true';
        document.head.appendChild(style);
    }

    if (!document.querySelector('script[data-lumi-home-account-strip]')) {
        const script = document.createElement('script');
        script.src = '/home-account-strip.js?v=1';
        script.dataset.lumiHomeAccountStrip = 'true';
        document.head.appendChild(script);
    }
})();

(() => {
    const isAccountPath = location.pathname === '/fiokom' || location.pathname.startsWith('/fiokom/');
    if (!isAccountPath || document.querySelector('script[data-lumi-account-entry]')) return;

    if (document.readyState === 'loading') {
        document.write('<script src="/account-entry.js?v=1" data-lumi-account-entry><\/script>');
        return;
    }

    const script = document.createElement('script');
    script.src = '/account-entry.js?v=1';
    script.dataset.lumiAccountEntry = 'true';
    document.head.appendChild(script);
})();

(() => {
    // The CMS module already owns the real save logic and binds it to #admin-cms-save.
    // Keep that target present before admin-content.js initializes so the Admin v2
    // page-level save button can call the existing save path instead of duplicating it.
    const isAdminPath = location.pathname === '/admin' || location.pathname.startsWith('/admin/');
    if (isAdminPath && !document.getElementById('admin-cms-save')) {
        const cmsPanel = document.getElementById('admin-panel-szovegek');
        if (cmsPanel) {
            const saveTarget = document.createElement('button');
            saveTarget.type = 'button';
            saveTarget.id = 'admin-cms-save';
            saveTarget.hidden = true;
            saveTarget.tabIndex = -1;
            saveTarget.setAttribute('aria-hidden', 'true');
            cmsPanel.appendChild(saveTarget);
        }
    }

    if (document.querySelector('script[data-lumi-pwa]')) return;
    const script = document.createElement('script');
    script.src = '/pwa.js?v=5';
    script.defer = true;
    script.dataset.lumiPwa = 'true';
    document.head.appendChild(script);
})();

(() => {
    const isAdminPath = location.pathname === '/admin' || location.pathname.startsWith('/admin/');
    if (!isAdminPath || document.querySelector('script[data-lumi-pwa-admin-shell]')) return;

    const script = document.createElement('script');
    script.src = '/pwa-admin-shell.js?v=2';
    script.defer = true;
    script.dataset.lumiPwaAdminShell = 'true';
    document.head.appendChild(script);
})();
