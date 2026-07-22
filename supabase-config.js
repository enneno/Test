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