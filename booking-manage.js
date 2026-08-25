(() => {
    'use strict';

    const RATE_LIMIT_MESSAGE = 'Túl sok próbálkozás. Próbáld újra 1 perc múlva.';
    const GENERIC_NOT_FOUND = 'A megadott adatokkal nem található foglalás.';
    let aktualisFoglalas = null;

    window.LUMI_SECURE_BOOKING_MANAGER_ACTIVE = true;
    document.addEventListener('DOMContentLoaded', biztonsagosFoglalasKezeloElokeszitese);

    function biztonsagosFoglalasKezeloElokeszitese() {
        const form = document.getElementById('foglalas-ellenorzes-urlap');
        if (!form) return;

        // A régi booking.js ugyanebben a DOMContentLoaded körben keresné ezt az ID-t.
        // Ideiglenesen elrejtjük előle, majd a dispatch után visszaállítjuk és az új kezelőt kötjük rá.
        form.id = 'foglalas-ellenorzes-urlap-secure-init';
        feluletBiztonsagosraAlakitasa(form);

        queueMicrotask(() => {
            form.id = 'foglalas-ellenorzes-urlap';
            biztonsagosFoglalasKezeloBekotese(form);
        });
    }

    function feluletBiztonsagosraAlakitasa(form) {
        const bevezeto = document.querySelector('.foglalas-kezelo-bevezeto p');
        if (bevezeto) {
            bevezeto.textContent = 'Add meg a visszaigazoló e-mailben található LUMI azonosítót, valamint a foglalásnál használt e-mail-címedet vagy telefonszámodat. Csak a két adat együttes egyezésekor jelennek meg a foglalás részletei.';
        }

        const kartyaLeiras = document.querySelector('.foglalas-ut-kartya-kezelo .foglalas-ut-leiras');
        if (kartyaLeiras) {
            kartyaLeiras.textContent = 'A LUMI azonosító és a foglalásnál használt e-mail-cím vagy telefonszám megadásával megnézheted az időpontod részleteit, és le is mondhatod.';
        }

        const segitseg = form.querySelector('.foglalas-kezelo-segitseg');
        if (segitseg) {
            segitseg.textContent = 'A telefonszámot bármilyen megszokott formában megadhatod, például +36 20 123 4567, 06 20 123 4567 vagy 201234567.';
        }

        const input = document.getElementById('foglalas-azonosito');
        const sor = form.querySelector('.foglalas-kezelo-bevitel');
        const kodCimke = form.querySelector('label[for="foglalas-azonosito"]');
        const gomb = sor?.querySelector('button[type="submit"]');
        if (input && sor && kodCimke && gomb && !document.getElementById('foglalas-elerhetoseg')) {
            const mezok = document.createElement('div');
            mezok.className = 'foglalas-kezelo-biztonsagi-mezok';

            const kodCsoport = document.createElement('div');
            kodCsoport.className = 'foglalas-kezelo-mezocsoport';
            kodCsoport.append(kodCimke, input);

            const kontaktCsoport = document.createElement('div');
            kontaktCsoport.className = 'foglalas-kezelo-mezocsoport';
            const kontaktCimke = document.createElement('label');
            kontaktCimke.htmlFor = 'foglalas-elerhetoseg';
            kontaktCimke.textContent = 'E-mail-cím vagy telefonszám';
            const kontakt = document.createElement('input');
            kontakt.type = 'text';
            kontakt.id = 'foglalas-elerhetoseg';
            kontakt.className = 'urlap-mezo';
            kontakt.placeholder = 'pelda@email.hu vagy +36 20 123 4567';
            kontakt.autocomplete = 'off';
            kontakt.inputMode = 'email';
            kontakt.maxLength = 254;
            kontakt.required = true;
            kontaktCsoport.append(kontaktCimke, kontakt);

            mezok.append(kodCsoport, kontaktCsoport);
            sor.classList.add('foglalas-kezelo-bevitel-biztonsagos');
            sor.replaceChildren(mezok, gomb);
        }

        const popupKodBlokk = document.getElementById('foglalas-popup-azonosito');
        if (popupKodBlokk && !popupKodBlokk.querySelector('.foglalas-popup-biztonsagi-segitseg')) {
            const p = document.createElement('p');
            p.className = 'foglalas-popup-biztonsagi-segitseg';
            p.textContent = 'A későbbi ellenőrzéshez az azonosító mellett a foglalásnál használt e-mail-címed vagy telefonszámod is szükséges.';
            popupKodBlokk.appendChild(p);
        }
    }

    function biztonsagosFoglalasKezeloBekotese(form) {
        const input = document.getElementById('foglalas-azonosito');
        const kontakt = document.getElementById('foglalas-elerhetoseg');
        const eredmeny = document.getElementById('foglalas-ellenorzes-eredmeny');
        const statusz = document.getElementById('foglalas-ellenorzes-status');
        const lemondas = document.getElementById('foglalas-lemondas');
        const lemondasMegjegyzesBlokk = document.getElementById('foglalas-lemondas-megjegyzes-blokk');
        const lemondasMegjegyzes = document.getElementById('foglalas-lemondas-megjegyzes');
        const kuldes = form.querySelector('button[type="submit"]');
        if (!input || !kontakt || !eredmeny || !statusz || !lemondas || !lemondasMegjegyzesBlokk || !lemondasMegjegyzes || !kuldes) return;

        const elemek = { input, kontakt, eredmeny, statusz, lemondas, lemondasMegjegyzesBlokk, lemondasMegjegyzes, kuldes };

        form.addEventListener('submit', event => {
            event.preventDefault();
            foglalasStatuszLekerdezese(elemek);
        });
        input.addEventListener('input', () => {
            input.value = foglalasAzonositoFormazasa(input.value);
            aktualisFoglalas = null;
            eredmeny.hidden = true;
            uzenet(statusz, '');
        });
        kontakt.addEventListener('input', () => {
            aktualisFoglalas = null;
            eredmeny.hidden = true;
            uzenet(statusz, '');
        });
        lemondas.addEventListener('click', () => foglalasLemondasa(elemek));

        const urlKod = new URLSearchParams(window.location.search).get('foglalas');
        if (urlKod) {
            input.value = foglalasAzonositoFormazasa(urlKod);
            uzenet(statusz, 'Add meg a foglalásnál használt e-mail-címedet vagy telefonszámodat is a folytatáshoz.');
            kontakt.focus();
        }
    }

    async function foglalasStatuszLekerdezese(elemek) {
        const kod = foglalasAzonositoFormazasa(elemek.input.value);
        const kontakt = elemek.kontakt.value.trim();
        if (!foglalasAzonositoErvenyes(kod)) {
            uzenet(elemek.statusz, 'Írd be a teljes, LUMI kezdetű foglalási azonosítót.', true);
            elemek.eredmeny.hidden = true;
            return;
        }
        if (!elerhetosegErvenyes(kontakt)) {
            uzenet(elemek.statusz, 'Adj meg egy érvényes e-mail-címet vagy magyar telefonszámot.', true);
            elemek.eredmeny.hidden = true;
            elemek.kontakt.focus();
            return;
        }

        elemek.input.value = kod;
        keresiAllapot(elemek, true, 'Foglalás lekérése...');
        const valasz = await apiKeres('lookup', kod, kontakt);
        keresiAllapot(elemek, false, 'Foglalás lekérése');

        if (!valasz.ok) {
            aktualisFoglalas = null;
            elemek.eredmeny.hidden = true;
            uzenet(elemek.statusz, valasz.message || GENERIC_NOT_FOUND, true);
            return;
        }

        aktualisFoglalas = valasz.booking;
        foglalasKezeloRenderelese(aktualisFoglalas, elemek);
        uzenet(elemek.statusz, '');
    }

    async function foglalasLemondasa(elemek) {
        const kod = foglalasAzonositoFormazasa(elemek.input.value);
        const kontakt = elemek.kontakt.value.trim();
        const megjegyzes = elemek.lemondasMegjegyzes.value.trim().slice(0, 500);
        if (!aktualisFoglalas || !foglalasAzonositoErvenyes(kod) || !elerhetosegErvenyes(kontakt)) {
            uzenet(elemek.statusz, 'A lemondás előtt kérd le újra a foglalást a két azonosító adattal.', true);
            return;
        }
        if (elemek.lemondasMegjegyzes.dataset.requiredWithin24h === 'true' && !megjegyzes) {
            uzenet(elemek.statusz, 'A 24 órán belüli lemondáshoz írj rövid indokot.', true);
            elemek.lemondasMegjegyzes.focus();
            return;
        }
        if (!window.confirm('Biztosan lemondod ezt a foglalást? Ez a művelet nem vonható vissza.')) return;

        elemek.lemondas.disabled = true;
        elemek.lemondas.textContent = 'Lemondás folyamatban...';
        const valasz = await apiKeres('cancel', kod, kontakt, megjegyzes);
        if (!valasz.ok) {
            uzenet(elemek.statusz, valasz.message || 'A lemondás most nem sikerült. Kérlek, próbáld újra később.', true);
            elemek.lemondas.disabled = false;
            elemek.lemondas.textContent = elemek.lemondas.dataset.felirat || 'Foglalás lemondása';
            return;
        }

        elemek.lemondasMegjegyzes.value = '';
        aktualisFoglalas = {
            ...aktualisFoglalas,
            status: 'cancelled_by_customer',
            status_label: 'Általad lemondva',
            can_cancel: false,
            cancellation_note_required: false
        };
        foglalasKezeloRenderelese(aktualisFoglalas, elemek);
        uzenet(elemek.statusz, valasz.message || 'A foglalást sikeresen lemondtad.');
    }

    async function apiKeres(action, reference, contact, note = '') {
        const config = window.LUMI_SUPABASE;
        if (!config?.url || !config?.publishableKey) {
            return { ok: false, message: 'A foglaláskezelés átmenetileg nem érhető el.' };
        }

        try {
            const response = await fetch(`${config.url}/functions/v1/manage-booking`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': config.publishableKey,
                    'x-client-info': 'luminails-booking-manager/1'
                },
                body: JSON.stringify({ action, reference, contact, note }),
                cache: 'no-store'
            });
            const data = await response.json().catch(() => ({}));
            if (response.status === 429 || data?.code === 'rate_limited') {
                return { ok: false, message: RATE_LIMIT_MESSAGE, code: 'rate_limited' };
            }
            if (response.status === 404 || data?.code === 'not_found') {
                return { ok: false, message: GENERIC_NOT_FOUND, code: 'not_found' };
            }
            if (!response.ok || data?.ok === false) {
                return { ok: false, message: data?.message || 'A művelet most nem sikerült. Kérlek, próbáld újra később.', code: data?.code };
            }
            return data;
        } catch (error) {
            console.warn('Biztonságos foglaláskezelési hiba:', error);
            return { ok: false, message: 'A foglaláskezelés átmenetileg nem érhető el. Kérlek, próbáld újra később.' };
        }
    }

    function foglalasKezeloRenderelese(foglalas, elemek) {
        const idopont = datumIdo(foglalas.starts_at, false);
        const idopontVege = datumIdo(foglalas.ends_at, true);
        const arOsszeg = foglalas.final_price_amount ?? foglalas.service_price_amount;
        const arSzam = Number(arOsszeg);
        const ar = arOsszeg !== null && arOsszeg !== undefined && Number.isFinite(arSzam)
            ? `${new Intl.NumberFormat('hu-HU').format(arSzam)} ${foglalas.service_price_unit || 'Ft'}`
            : foglalas.service_price_text || '';
        const reszletek = [
            ['Szolgáltatás', foglalas.service_name],
            ['Ár', ar],
            ['Körömstílus', foglalas.nail_style],
            ['Időpont', `${idopont} – ${idopontVege}`],
            ['Kupon', foglalas.coupon_label]
        ].filter(([, ertek]) => Boolean(ertek));
        const kotelezoIndok = Boolean(foglalas.cancellation_note_required);
        const lemondasSzoveg = foglalas.can_cancel && kotelezoIndok
            ? 'Az időpont 24 órán belül kezdődik, ezért a lemondás rövid indoklása kötelező.'
            : foglalas.can_cancel
                ? elemek.lemondas.dataset.leiras || 'Ha mégsem megfelelő az időpont, itt lemondhatod.'
                : 'Ez a foglalás már nem mondható le online.';
        const statuszFelirat = ({
            pending: 'Függőben',
            confirmed: 'Visszaigazolva',
            done: 'Teljesítve',
            cancelled: 'Lemondva',
            cancelled_by_customer: 'Általad lemondva'
        })[foglalas.status] || foglalas.status_label || 'Ismeretlen';

        elemek.eredmeny.innerHTML = `
            <div class="foglalas-kezelo-fej">
                <span class="foglalas-statusz-jelzo foglalas-statusz-${html(foglalas.status)}">${html(statuszFelirat)}</span>
                <strong>${html(foglalas.booking_reference)}</strong>
            </div>
            <dl>
                ${reszletek.map(([cimke, ertek]) => `<div><dt>${html(cimke)}</dt><dd>${html(ertek)}</dd></div>`).join('')}
            </dl>
            <p class="foglalas-lemondas-hatarido">${html(lemondasSzoveg)}</p>
        `;
        elemek.eredmeny.appendChild(elemek.lemondasMegjegyzesBlokk);
        elemek.eredmeny.appendChild(elemek.lemondas);
        elemek.lemondasMegjegyzesBlokk.hidden = !foglalas.can_cancel;
        const megjegyzesCimke = elemek.lemondasMegjegyzesBlokk.querySelector('span');
        if (megjegyzesCimke) {
            megjegyzesCimke.textContent = kotelezoIndok
                ? 'Lemondás oka vagy megjegyzés (24 órán belül kötelező)'
                : 'Lemondás oka vagy megjegyzés (opcionális)';
        }
        elemek.lemondasMegjegyzes.required = kotelezoIndok;
        elemek.lemondasMegjegyzes.dataset.requiredWithin24h = String(kotelezoIndok);
        elemek.lemondasMegjegyzes.placeholder = kotelezoIndok
            ? 'Kérlek, röviden írd meg a lemondás okát.'
            : 'Ha szeretnéd, írd meg röviden a lemondás okát.';
        elemek.lemondas.hidden = !foglalas.can_cancel;
        elemek.lemondas.disabled = false;
        elemek.lemondas.textContent = elemek.lemondas.dataset.felirat || 'Foglalás lemondása';
        elemek.eredmeny.hidden = false;
    }

    function foglalasAzonositoFormazasa(ertek) {
        let kod = String(ertek || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
        if (kod.startsWith('LUMI')) kod = kod.slice(4);
        kod = kod.slice(0, 20);
        const csoportok = kod.match(/.{1,4}/g) || [];
        return kod ? `LUMI-${csoportok.join('-')}` : '';
    }

    function foglalasAzonositoErvenyes(kod) {
        return /^LUMI-[A-Z0-9]{4}$/.test(kod) || /^LUMI(?:-[A-Z0-9]{4}){5}$/.test(kod);
    }

    function elerhetosegErvenyes(ertek) {
        const kontakt = String(ertek || '').trim();
        if (!kontakt || kontakt.length > 254) return false;
        if (kontakt.includes('@')) return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(kontakt);
        return telefonszamKulcs(kontakt).length === 9;
    }

    function telefonszamKulcs(ertek) {
        let szamok = String(ertek || '').replace(/\D/g, '');
        if (szamok.length === 13 && szamok.startsWith('0036')) szamok = szamok.slice(4);
        else if (szamok.length === 11 && szamok.startsWith('36')) szamok = szamok.slice(2);
        else if (szamok.length === 11 && szamok.startsWith('06')) szamok = szamok.slice(2);
        return szamok.length === 9 ? szamok : '';
    }

    function datumIdo(value, csakIdo) {
        const opciok = csakIdo
            ? { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Budapest' }
            : { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Budapest' };
        return new Intl.DateTimeFormat('hu-HU', opciok).format(new Date(value));
    }

    function keresiAllapot(elemek, folyamatban, felirat) {
        elemek.input.disabled = folyamatban;
        elemek.kontakt.disabled = folyamatban;
        elemek.kuldes.disabled = folyamatban;
        elemek.kuldes.textContent = felirat;
        if (folyamatban) uzenet(elemek.statusz, felirat);
    }

    function uzenet(elem, szoveg, hiba = false) {
        elem.textContent = szoveg;
        elem.classList.toggle('hiba', Boolean(hiba));
    }

    function html(ertek) {
        return String(ertek ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
})();
