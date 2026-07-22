function lablecAdatokAlkalmazasa(adatok) {
    const kapcsolat = adatok.kapcsolat;
    const marka = adatok.marka;

    if (!kapcsolat && !marka) {
        return;
    }

    szovegBeallitasa('.footer-logo', marka?.nev);
    szovegBeallitasa('.footer-brand p', marka?.rovidLeiras);
    szovegBeallitasa('.footer-kapcsolat h3', kapcsolat?.cimke);
    szovegBeallitasa('.footer-jogi-link', adatok.lablec?.jogiLink);
    szovegBeallitasa('.footer-jogok', adatok.lablec?.jogok);

    const cimLink = document.querySelector('[data-footer-address]');
    const telefonLink = document.querySelector('[data-footer-phone]');
    const emailLink = document.querySelector('[data-footer-email]');
    const instagramLink = document.querySelector('.social-gomb[href*="instagram"]');
    const facebookLink = document.querySelector('.social-gomb[href*="facebook"]');
    const messengerPopup = document.querySelector('.popup-gomb[href*="m.me"]');
    const instagramPopup = document.querySelector('.popup-gomb[href*="ig.me"]');

    if (cimLink && kapcsolat?.cim) {
        cimLink.textContent = kapcsolat.cim;
        cimLink.href = kapcsolat.terkepUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(kapcsolat.cim)}`;
        cimLink.hidden = false;
        cimLink.style.display = '';
    }

    if (telefonLink && kapcsolat?.telefon) {
        const telefonLathato = kapcsolat.telefonLathato !== false;
        telefonLink.textContent = kapcsolat.telefon;
        telefonLink.href = `tel:${kapcsolat.telefonLink || kapcsolat.telefon.replace(/\s/g, '')}`;
        telefonLink.hidden = !telefonLathato;
        telefonLink.style.display = telefonLathato ? '' : 'none';
    }

    if (emailLink && kapcsolat?.email) {
        emailLink.textContent = kapcsolat.email;
        emailLink.href = `mailto:${kapcsolat.email}`;
        emailLink.hidden = false;
        emailLink.style.display = '';
    }

    if (instagramLink && kapcsolat?.instagram) {
        instagramLink.href = kapcsolat.instagram;
    }

    if (facebookLink && kapcsolat?.facebook) {
        facebookLink.href = kapcsolat.facebook;
    }

    if (messengerPopup && kapcsolat?.messenger) {
        messengerPopup.href = kapcsolat.messenger;
    }

    if (instagramPopup && kapcsolat?.instagramUzenet) {
        instagramPopup.href = kapcsolat.instagramUzenet;
    }
}

async function onlineTelefonLathatosagAlkalmazasa() {
    const telefonLink = document.querySelector('[data-footer-phone]');
    const config = window.LUMI_SUPABASE;
    const supabaseLib = window.supabase;

    if (!telefonLink || !config?.url || !config?.publishableKey || !supabaseLib?.createClient) {
        return;
    }

    try {
        const kliens = window.lumiSupabaseClient();
        const { data, error } = await kliens
            .from('site_settings')
            .select('value')
            .eq('key', 'telefon_lathato')
            .maybeSingle();

        if (error || !data) {
            return;
        }

        const lathato = data.value?.visible !== false;
        telefonLink.hidden = !lathato;
        telefonLink.style.display = lathato ? '' : 'none';
    } catch (_error) {
        // Ha az online beallitas meg nincs elesitve, a JSON szerinti alapertek marad.
    }
}

document.addEventListener('click', function (event) {
    const menu = document.getElementById('mobil-nav');
    const hamburger = document.querySelector('.hamburger');

    if (!menu || !hamburger) {
        return;
    }

    if (menu.classList.contains('open') && !menu.contains(event.target) && !hamburger.contains(event.target)) {
        menuBezarasa();
    }
});

function csakSzamokatEnged(input) {
    let szamok = input.value.replace(/[^0-9]/g, '');

    if (szamok.startsWith('0036')) {
        szamok = szamok.substring(4);
    } else if (szamok.startsWith('36')) {
        szamok = szamok.substring(2);
    } else if (szamok.startsWith('06')) {
        szamok = szamok.substring(2);
    }

    while (szamok.startsWith('0')) {
        szamok = szamok.substring(1);
    }

    input.value = szamok.substring(0, 9);
}

function idopontokGeneralasa() {
    const idoValaszto = document.getElementById('foglalas-ido');

    if (!idoValaszto || document.body.dataset.bookingMode === 'supabase') {
        return;
    }

    const kezdoOra = 8;
    const vegOra = 18;

    for (let ora = kezdoOra; ora <= vegOra; ora++) {
        for (let perc = 0; perc < 60; perc += 15) {
            if (ora === vegOra && perc > 0) break;

            const pStr = String(perc).padStart(2, '0');
            const oStr = String(ora).padStart(2, '0');
            const idopont = `${oStr}:${pStr}`;

            const option = document.createElement('option');
            option.value = idopont;
            option.textContent = idopont;
            idoValaszto.appendChild(option);
        }
    }
}

function datumMinimumBeallitasa() {
    const datumMezo = document.getElementById('foglalas-datum');

    if (!datumMezo) {
        return;
    }

    datumMezo.min = maiDatum();
}

function maiDatum() {
    const ma = new Date();
    const ev = ma.getFullYear();
    const honap = String(ma.getMonth() + 1).padStart(2, '0');
    const nap = String(ma.getDate()).padStart(2, '0');

    return `${ev}-${honap}-${nap}`;
}

function foglalasiUrlapBekotese() {
    const telefonMezo = document.getElementById('foglalas-tel');
    const kuldesGomb = document.getElementById('foglalas-kuldes');
    const popupBezarasGomb = document.getElementById('popup-bezaras');
    const supabaseFoglalas = document.body.dataset.bookingMode === 'supabase';

    if (telefonMezo) {
        telefonMezo.addEventListener('input', () => csakSzamokatEnged(telefonMezo));
    }

    if (kuldesGomb && !supabaseFoglalas) {
        kuldesGomb.addEventListener('click', foglalasInditasa);
    }

    if (popupBezarasGomb) {
        popupBezarasGomb.addEventListener('click', popupBezarasa);
    }
}

function lebegoFoglalasLetrehozasa() {
    if (foglalasOldal() || adminOldal() || document.getElementById('lebego-foglalas-gomb')) {
        return;
    }

    const gomb = document.createElement('a');
    gomb.href = '/foglalas/';
    gomb.id = 'lebego-foglalas-gomb';
    gomb.className = 'gomb lebego-foglalas-gomb';
    gomb.textContent = 'Időpontfoglalás';
    document.body.appendChild(gomb);
}

function foglalasOldal() {
    const utvonal = window.location.pathname.toLowerCase();
    return utvonal === '/foglalas/' || utvonal.endsWith('/foglalas.html') || utvonal.endsWith('/foglalas/index.html');
}

function adminOldal() {
    const utvonal = window.location.pathname.toLowerCase();
    return utvonal === '/admin/' || utvonal.endsWith('/admin.html') || utvonal.endsWith('/admin/index.html');
}
