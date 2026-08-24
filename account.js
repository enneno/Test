// Generated from src/account by npm run build. Edit the source parts, not this file.

(function () {
    'use strict';

    const ACCOUNT_REDIRECT_PATH = '/fiokom/';
    const RECOVERY_QUERY = '?recovery=1';
    let supabaseClient = null;
    let recoveryMode = false;
    let accountReady = false;
    let authRefreshId = 0;

    document.addEventListener('DOMContentLoaded', () => {
        if (!document.body?.classList.contains('fiok-oldal')) return;

        bindAccountUi();

        if (!window.LUMI_SUPABASE?.url
            || !window.LUMI_SUPABASE?.publishableKey
            || !window.supabase?.createClient
            || !window.LUMI_PASSWORD_POLICY?.isValid) {
            setGlobalStatus('A vendégfiók jelenleg nem érhető el. Kérlek, próbáld újra később.', true);
            disableForms(true);
            return;
        }

        supabaseClient = window.lumiSupabaseClient();
        initializeAccount();
    });

    async function initializeAccount() {
        const { data: ready, error } = await supabaseClient.rpc('customer_accounts_ready');

        if (error || ready !== true) {
            showSignedOutState();
            disableForms(true);
            setGlobalStatus('A vendégfiók biztonságos élesítése még folyamatban van. A felület megtekinthető, de regisztráció és belépés még nem indítható.', false);
            return;
        }

        accountReady = true;
        disableForms(false);
        recoveryMode = new URLSearchParams(window.location.search).get('recovery') === '1';

        supabaseClient.auth.onAuthStateChange((event) => {
            if (event === 'PASSWORD_RECOVERY') recoveryMode = true;
            window.setTimeout(() => refreshAccountState(), 0);
        });

        refreshAccountState();
    }

    function bindAccountUi() {
        document.querySelectorAll('[data-account-view]').forEach(button => {
            button.addEventListener('click', () => showAuthView(button.dataset.accountView));
        });

        document.getElementById('fiok-belepes-form')?.addEventListener('submit', handleSignIn);
        document.getElementById('fiok-regisztracio-form')?.addEventListener('submit', handleSignUp);
        document.getElementById('fiok-elfelejtett-form')?.addEventListener('submit', handlePasswordResetRequest);
        document.getElementById('fiok-uj-jelszo-form')?.addEventListener('submit', handlePasswordUpdate);
        document.getElementById('fiok-profil-form')?.addEventListener('submit', handleProfileSave);
        document.getElementById('fiok-kijelentkezes')?.addEventListener('click', handleSignOut);
        document.getElementById('fiok-megerosites-ujrakuldes')?.addEventListener('click', handleConfirmationResend);
    }

    async function refreshAccountState() {
        const refreshId = ++authRefreshId;
        setGlobalStatus('Fiók ellenőrzése…');

        const { data, error } = await supabaseClient.auth.getUser();
        if (refreshId !== authRefreshId) return;

        const user = error ? null : data?.user;
        if (!user) {
            showSignedOutState();
            return;
        }

        if (!user.email_confirmed_at || user.is_anonymous) {
            await supabaseClient.auth.signOut({ scope: 'local' });
            showSignedOutState();
            setGlobalStatus('A fiók használatához előbb erősítsd meg az e-mail-címedet.', true);
            return;
        }

        if (recoveryMode) {
            showRecoveryState(user);
            return;
        }

        const profileResult = await supabaseClient.rpc('ensure_customer_account');
        if (refreshId !== authRefreshId) return;

        if (profileResult.error) {
            showSignedInState(user, null, true);
            setGlobalStatus('A fiók biztonságos befejezéséhez add meg a nevedet és a telefonszámodat.', false);
            return;
        }

        const profile = singleRow(profileResult.data);
        showSignedInState(user, profile, false);
        await loadBookingHistory(refreshId);
    }

    function showSignedOutState() {
        setHidden('fiok-auth-panel', false);
        setHidden('fiok-megerosites-panel', true);
        setHidden('fiok-uj-jelszo-panel', true);
        setHidden('fiok-iranyitopult', true);
        setGlobalStatus('');
        showAuthView('belepes');
    }

    function showSignedInState(user, profile, needsCompletion) {
        setHidden('fiok-auth-panel', true);
        setHidden('fiok-megerosites-panel', true);
        setHidden('fiok-uj-jelszo-panel', true);
        setHidden('fiok-iranyitopult', false);
        setHidden('fiok-elozmenyek-panel', needsCompletion);

        const email = document.getElementById('fiok-aktualis-email');
        const greeting = document.getElementById('fiok-udvozles');
        const name = document.getElementById('fiok-profil-nev');
        const phone = document.getElementById('fiok-profil-telefon');
        const displayName = profile?.full_name || String(user.user_metadata?.full_name || '').trim();
        if (email) email.textContent = user.email || '';
        if (greeting) greeting.textContent = displayName ? 'Üdv újra, ' + displayName + '!' : 'Üdv újra!';
        if (name) name.value = displayName;
        if (phone) phone.value = nationalPhone(profile?.phone || user.user_metadata?.phone || '');
        setGlobalStatus(needsCompletion ? 'Töltsd ki a profilodat a foglalási előzmények megnyitásához.' : '');
    }

    function showRecoveryState(user) {
        setHidden('fiok-auth-panel', true);
        setHidden('fiok-megerosites-panel', true);
        setHidden('fiok-iranyitopult', true);
        setHidden('fiok-uj-jelszo-panel', false);
        const email = document.getElementById('fiok-helyreallitas-email');
        if (email) email.textContent = user.email || '';
        setGlobalStatus(`Adj meg egy új jelszót: ${window.LUMI_PASSWORD_POLICY.hint}`);
    }

    function showAuthView(view) {
        const selected = ['belepes', 'regisztracio', 'elfelejtett'].includes(view) ? view : 'belepes';
        document.querySelectorAll('[data-account-auth-panel]').forEach(panel => {
            panel.hidden = panel.dataset.accountAuthPanel !== selected;
        });
        document.querySelectorAll('[data-account-view]').forEach(button => {
            const active = button.dataset.accountView === selected;
            button.classList.toggle('aktiv', active);
            button.setAttribute('aria-selected', String(active));
        });
        if (accountReady) setGlobalStatus('');
    }

    async function handleSignIn(event) {
        event.preventDefault();
        const form = event.currentTarget;
        const submit = form.querySelector('button[type="submit"]');
        const email = normalizedEmail(form.elements.email.value);
        const password = String(form.elements.password.value || '');

        setButtonBusy(submit, true, 'Belépés…');
        setGlobalStatus('Biztonságos belépés…');

        const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (error || !data?.user) {
            setGlobalStatus('A belépési adatok nem megfelelőek, vagy a fiók még nincs megerősítve.', true);
            setButtonBusy(submit, false, 'Belépés');
            return;
        }

        if (!data.user.email_confirmed_at) {
            await supabaseClient.auth.signOut({ scope: 'local' });
            setGlobalStatus('A belépés előtt erősítsd meg az e-mail-címedet.', true);
            setButtonBusy(submit, false, 'Belépés');
            return;
        }

        form.reset();
        setButtonBusy(submit, false, 'Belépés');
        await refreshAccountState();
    }

    async function handleSignUp(event) {
        event.preventDefault();
        const form = event.currentTarget;
        const submit = form.querySelector('button[type="submit"]');
        const fullName = normalizedName(form.elements.full_name.value);
        const phone = normalizedHungarianPhone(form.elements.phone.value);
        const email = normalizedEmail(form.elements.email.value);
        const password = String(form.elements.password.value || '');
        const passwordAgain = String(form.elements.password_again.value || '');

        if (!fullName || !phone || !validEmail(email)) {
            setGlobalStatus('Ellenőrizd a nevet, a telefonszámot és az e-mail-címet.', true);
            return;
        }
        if (!window.LUMI_PASSWORD_POLICY.isValid(password)) {
            setGlobalStatus(`A jelszó követelményei: ${window.LUMI_PASSWORD_POLICY.hint}`, true);
            return;
        }
        if (password !== passwordAgain) {
            setGlobalStatus('A két jelszó nem egyezik.', true);
            return;
        }

        setButtonBusy(submit, true, 'Fiók létrehozása…');
        setGlobalStatus('A megerősítő e-mail előkészítése…');

        const { data, error } = await supabaseClient.auth.signUp({
            email,
            password,
            options: {
                emailRedirectTo: accountRedirectUrl(),
                data: { full_name: fullName, phone }
            }
        });

        setButtonBusy(submit, false, 'Fiók létrehozása');

        if (error) {
            setGlobalStatus('A regisztráció most nem indítható el. Próbáld újra később.', true);
            return;
        }

        if (data?.session) {
            await supabaseClient.auth.signOut({ scope: 'local' });
            setGlobalStatus('A regisztráció biztonsági beállítása hiányos: e-mail-megerősítés nélkül nem engedélyezünk fiókot.', true);
            return;
        }

        window.sessionStorage.setItem('lumiPendingConfirmationEmail', email);
        form.reset();
        setHidden('fiok-auth-panel', true);
        setHidden('fiok-megerosites-panel', false);
        const pendingEmail = document.getElementById('fiok-megerosites-email');
        if (pendingEmail) pendingEmail.textContent = email;
        setGlobalStatus('Ha az adatok megfelelőek, elküldtük a megerősítő e-mailt. A fiók csak a link megnyitása után használható.');
    }

    async function handleConfirmationResend(event) {
        const button = event.currentTarget;
        const email = normalizedEmail(window.sessionStorage.getItem('lumiPendingConfirmationEmail'));
        if (!validEmail(email)) {
            setHidden('fiok-megerosites-panel', true);
            setHidden('fiok-auth-panel', false);
            showAuthView('regisztracio');
            setGlobalStatus('Add meg újra az e-mail-címedet a megerősítés kéréséhez.', true);
            return;
        }

        setButtonBusy(button, true, 'Küldés…');
        await supabaseClient.auth.resend({
            type: 'signup',
            email,
            options: { emailRedirectTo: accountRedirectUrl() }
        });
        setButtonBusy(button, false, 'Megerősítő e-mail újraküldése');
        setGlobalStatus('Ha a fiók megerősítésre vár, új e-mailt küldtünk. Néhány percig is eltarthat.');
    }

    async function handlePasswordResetRequest(event) {
        event.preventDefault();
        const form = event.currentTarget;
        const submit = form.querySelector('button[type="submit"]');
        const email = normalizedEmail(form.elements.email.value);

        if (!validEmail(email)) {
            setGlobalStatus('Adj meg egy érvényes e-mail-címet.', true);
            return;
        }

        setButtonBusy(submit, true, 'Küldés…');
        await supabaseClient.auth.resetPasswordForEmail(email, {
            redirectTo: `${accountRedirectUrl()}${RECOVERY_QUERY}`
        });
        setButtonBusy(submit, false, 'Jelszó-visszaállító e-mail küldése');
        form.reset();
        setGlobalStatus('Ha ehhez az e-mail-címhez tartozik fiók, elküldtük a jelszó-visszaállító linket.');
    }

    async function handlePasswordUpdate(event) {
        event.preventDefault();
        const form = event.currentTarget;
        const submit = form.querySelector('button[type="submit"]');
        const password = String(form.elements.password.value || '');
        const passwordAgain = String(form.elements.password_again.value || '');

        if (!window.LUMI_PASSWORD_POLICY.isValid(password)) {
            setGlobalStatus(`Az új jelszó követelményei: ${window.LUMI_PASSWORD_POLICY.hint}`, true);
            return;
        }
        if (password !== passwordAgain) {
            setGlobalStatus('A két jelszó nem egyezik.', true);
            return;
        }

        setButtonBusy(submit, true, 'Jelszó mentése…');
        const { error } = await supabaseClient.auth.updateUser({ password });
        if (error) {
            setGlobalStatus('Az új jelszó nem menthető. Kérj új visszaállító linket.', true);
            setButtonBusy(submit, false, 'Új jelszó mentése');
            return;
        }

        await supabaseClient.auth.signOut({ scope: 'global' });
        recoveryMode = false;
        window.history.replaceState(null, '', ACCOUNT_REDIRECT_PATH);
        form.reset();
        setButtonBusy(submit, false, 'Új jelszó mentése');
        showSignedOutState();
        setGlobalStatus('A jelszavad megváltozott, és a korábbi munkameneteket kijelentkeztettük. Lépj be az új jelszóval.');
    }

    async function handleProfileSave(event) {
        event.preventDefault();
        const form = event.currentTarget;
        const submit = form.querySelector('button[type="submit"]');
        const fullName = normalizedName(form.elements.full_name.value);
        const phone = normalizedHungarianPhone(form.elements.phone.value);

        if (!fullName || !phone) {
            setProfileStatus('Ellenőrizd a nevet és a telefonszámot.', true);
            return;
        }

        setButtonBusy(submit, true, 'Mentés…');
        const { error } = await supabaseClient.rpc('save_customer_profile', {
            p_full_name: fullName,
            p_phone: phone
        });
        setButtonBusy(submit, false, 'Adatok mentése');

        if (error) {
            setProfileStatus('Az adatok most nem menthetők. Ellenőrizd őket, majd próbáld újra.', true);
            return;
        }

        setProfileStatus('Az adataidat biztonságosan elmentettük.');
        await refreshAccountState();
    }

    async function handleSignOut(event) {
        const button = event.currentTarget;
        setButtonBusy(button, true, 'Kijelentkezés…');
        await supabaseClient.auth.signOut({ scope: 'local' });
        setButtonBusy(button, false, 'Kijelentkezés');
        showSignedOutState();
        setGlobalStatus('Kijelentkeztél.');
    }

    async function loadBookingHistory(refreshId) {
        const list = document.getElementById('fiok-foglalas-lista');
        if (!list) return;

        list.replaceChildren(statusParagraph('Foglalási előzmények betöltése…'));
        const { data, error } = await supabaseClient.rpc('get_my_booking_history', {
            p_limit: 50,
            p_offset: 0
        });
        if (refreshId !== authRefreshId) return;

        if (error) {
            list.replaceChildren(statusParagraph('A foglalási előzmények most nem tölthetők be.', true));
            return;
        }

        const bookings = Array.isArray(data) ? data : [];
        if (!bookings.length) {
            list.replaceChildren(statusParagraph('Még nincs ehhez a hitelesített e-mailhez kapcsolódó foglalás.'));
            return;
        }

        list.replaceChildren(...bookings.map(bookingCard));
    }

    function bookingCard(booking) {
        const article = document.createElement('article');
        article.className = 'fiok-foglalas-kartya';

        const heading = document.createElement('div');
        heading.className = 'fiok-foglalas-fej';

        const titleGroup = document.createElement('div');
        const title = document.createElement('h3');
        title.textContent = booking.service_name || 'Időpont';
        const date = document.createElement('p');
        date.textContent = bookingDate(booking.starts_at, booking.ends_at);
        titleGroup.append(title, date);

        const status = document.createElement('span');
        status.className = `fiok-statusz fiok-statusz-${safeStatus(booking.status)}`;
        status.textContent = bookingStatusLabel(booking.status);
        heading.append(titleGroup, status);
        article.appendChild(heading);

        const meta = document.createElement('div');
        meta.className = 'fiok-foglalas-meta';
        appendMeta(meta, 'Azonosító', booking.public_reference || '—');
        if (booking.nail_style) appendMeta(meta, 'Stílus', booking.nail_style);
        const price = bookingPrice(booking);
        if (price) appendMeta(meta, 'Összeg', price);
        article.appendChild(meta);

        if (booking.public_reference && ['pending', 'confirmed'].includes(booking.status)) {
            const manage = document.createElement('a');
            manage.className = 'fiok-szoveges-link';
            manage.href = `/foglalas/?foglalas=${encodeURIComponent(booking.public_reference)}#foglalas-ellenorzes`;
            manage.textContent = 'Foglalás kezelése';
            article.appendChild(manage);
        }

        return article;
    }

    function appendMeta(container, label, value) {
        const item = document.createElement('div');
        const term = document.createElement('span');
        const detail = document.createElement('strong');
        term.textContent = label;
        detail.textContent = value;
        item.append(term, detail);
        container.appendChild(item);
    }

    function bookingDate(startValue, endValue) {
        const start = new Date(startValue);
        const end = new Date(endValue);
        if (Number.isNaN(start.getTime())) return 'Időpont nélkül';

        const date = new Intl.DateTimeFormat('hu-HU', {
            timeZone: 'Europe/Budapest', year: 'numeric', month: 'long', day: 'numeric', weekday: 'long'
        }).format(start);
        const time = new Intl.DateTimeFormat('hu-HU', {
            timeZone: 'Europe/Budapest', hour: '2-digit', minute: '2-digit'
        }).format(start);
        const endTime = Number.isNaN(end.getTime()) ? '' : new Intl.DateTimeFormat('hu-HU', {
            timeZone: 'Europe/Budapest', hour: '2-digit', minute: '2-digit'
        }).format(end);
        return `${date}, ${time}${endTime ? `–${endTime}` : ''}`;
    }

    function bookingPrice(booking) {
        if (!Number.isFinite(Number(booking.final_price_amount))) return '';
        const amount = new Intl.NumberFormat('hu-HU').format(Number(booking.final_price_amount));
        return `${amount} ${booking.service_price_unit || 'Ft'}${booking.service_price_suffix || ''}`.trim();
    }

    function bookingStatusLabel(status) {
        return ({
            pending: 'Megerősítésre vár',
            confirmed: 'Visszaigazolva',
            done: 'Teljesítve',
            cancelled: 'Lemondva',
            cancelled_by_customer: 'Általad lemondva'
        })[status] || 'Ismeretlen állapot';
    }

    function safeStatus(status) {
        return ['pending', 'confirmed', 'done', 'cancelled', 'cancelled_by_customer'].includes(status)
            ? status
            : 'unknown';
    }

    function singleRow(data) {
        if (Array.isArray(data)) return data[0] || null;
        return data || null;
    }

    function normalizedName(value) {
        const name = String(value || '').trim().replace(/\s+/g, ' ');
        return name.length >= 2 && name.length <= 120 ? name : '';
    }

    function normalizedHungarianPhone(value) {
        let digits = String(value || '').replace(/\D/g, '');
        if (digits.length === 11 && digits.startsWith('36')) digits = digits.slice(2);
        return digits.length === 9 ? `+36 ${digits}` : '';
    }

    function nationalPhone(value) {
        let digits = String(value || '').replace(/\D/g, '');
        if (digits.length === 11 && digits.startsWith('36')) digits = digits.slice(2);
        return digits.length === 9 ? digits : '';
    }

    function normalizedEmail(value) {
        return String(value || '').trim().toLowerCase();
    }

    function validEmail(value) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254;
    }

    function accountRedirectUrl() {
        return `${window.location.origin}${ACCOUNT_REDIRECT_PATH}`;
    }

    function statusParagraph(message, error = false) {
        const paragraph = document.createElement('p');
        paragraph.className = `fiok-ures${error ? ' fiok-hiba' : ''}`;
        paragraph.textContent = message;
        return paragraph;
    }

    function setHidden(id, hidden) {
        const element = document.getElementById(id);
        if (element) element.hidden = hidden;
    }

    function setGlobalStatus(message, error = false) {
        const status = document.getElementById('fiok-globalis-statusz');
        if (!status) return;
        status.textContent = message || '';
        status.classList.toggle('fiok-hiba', error);
        status.hidden = !message;
    }

    function setProfileStatus(message, error = false) {
        const status = document.getElementById('fiok-profil-statusz');
        if (!status) return;
        status.textContent = message || '';
        status.classList.toggle('fiok-hiba', error);
        status.hidden = !message;
    }

    function setButtonBusy(button, busy, label) {
        if (!button) return;
        button.disabled = busy;
        button.textContent = label;
    }

    function disableForms(disabled) {
        document.querySelectorAll('.fiok-form input, .fiok-form button[type="submit"], #fiok-megerosites-ujrakuldes, #fiok-kijelentkezes').forEach(element => {
            element.disabled = disabled;
        });
    }
})();
