    async function vendegFiokFoglalasElokitese(elemek) {
        if (!allapot.kliens?.auth || !elemek.nev || !elemek.telefon || !elemek.email) return;

        const { data: accountsReady, error: readinessError } = await allapot.kliens.rpc('customer_accounts_ready');
        if (readinessError || accountsReady !== true) return;

        const { data, error } = await allapot.kliens.auth.getUser();
        const user = error ? null : data?.user;
        if (!user?.email || !user.email_confirmed_at || user.is_anonymous) return;

        const profileResult = await allapot.kliens.rpc('ensure_customer_account');
        if (profileResult.error) {
            console.warn('A hitelesített vendégprofil nem készíthető elő:', profileResult.error.message);
            return;
        }

        const profile = Array.isArray(profileResult.data)
            ? profileResult.data[0]
            : profileResult.data;
        const nationalPhone = vendegNemzetiTelefonszam(profile?.phone);

        elemek.nev.value = profile?.full_name || String(user.user_metadata?.full_name || '');
        if (nationalPhone) elemek.telefon.value = nationalPhone;
        elemek.email.value = String(user.email).trim().toLowerCase();
        elemek.email.readOnly = true;
        elemek.email.setAttribute('aria-readonly', 'true');
        elemek.email.dataset.accountVerified = 'true';

        vendegFiokJelzesMegjelenitese(elemek);
        osszefoglaloFrissitese(elemek);
    }

    function vendegNemzetiTelefonszam(value) {
        let digits = String(value || '').replace(/\D/g, '');
        if (digits.length === 11 && digits.startsWith('36')) digits = digits.slice(2);
        return digits.length === 9 ? digits : '';
    }

    function vendegFiokJelzesMegjelenitese(elemek) {
        const container = elemek.email.closest('.foglalas-adat-racs');
        if (!container || container.querySelector('.foglalas-fiok-jelzes')) return;

        const message = document.createElement('p');
        message.className = 'foglalas-fiok-jelzes';
        message.append('A hitelesített vendégfiókod adatait előre kitöltöttük. ');

        const accountLink = document.createElement('a');
        accountLink.href = '/fiokom/';
        accountLink.textContent = 'Adatok módosítása';
        message.appendChild(accountLink);
        container.appendChild(message);
    }
