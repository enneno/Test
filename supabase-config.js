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
