    function urlapElemek() {
        return {
            urlap: document.getElementById('foglalas-urlap'),
            nev: document.getElementById('foglalas-nev'),
            telefon: document.getElementById('foglalas-tel'),
            email: document.getElementById('foglalas-email'),
            szolgaltatas: document.getElementById('foglalas-szolgatatas'),
            datum: document.getElementById('foglalas-datum'),
            ido: document.getElementById('foglalas-ido'),
            komment: document.getElementById('foglalas-komment'),
            kuldes: document.getElementById('foglalas-kuldes'),
            statusz: document.getElementById('foglalas-status'),
            szolgaltatasKartyak: document.getElementById('foglalas-szolgaltatas-kartyak'),
            datumKartyak: document.getElementById('foglalas-datum-kartyak'),
            idoKartyak: document.getElementById('foglalas-ido-kartyak'),
            stilusTipp: document.getElementById('foglalas-stilus-tipp'),
            kepInput: document.getElementById('foglalas-inspiracio-kep'),
            kepEloNezet: document.getElementById('foglalas-kep-elonezet'),
            kuponBlokk: document.getElementById('foglalas-kupon-blokk'),
            kuponInput: document.getElementById('foglalas-kupon'),
            kuponGomb: document.getElementById('foglalas-kupon-ellenorzes'),
            kuponStatusz: document.getElementById('foglalas-kupon-status'),
            osszefoglalo: document.getElementById('foglalas-osszefoglalo')
        };
    }

    function feluletBekotese(elemek) {
        document.querySelector('[data-booking-path="online"]')?.addEventListener('click', event => {
            const cel = document.getElementById('online-foglalas');
            if (cel) {
                event.preventDefault();
                kovetkezoReszhezGordit(cel, 0);
            }
        });

        document.querySelectorAll('input[name="korom-stilus"]').forEach(input => {
            input.addEventListener('change', () => {
                stilusAllapotFrissitese(elemek);
                osszefoglaloFrissitese(elemek);
                kovetkezoReszhezGordit('[data-step="3"]');
            });
        });

        [elemek.nev, elemek.telefon, elemek.email, elemek.komment].filter(Boolean).forEach(mezo => {
            mezo.addEventListener('input', () => {
                hibakTorlese(elemek);
                osszefoglaloFrissitese(elemek);
            });
        });

        elemek.email?.addEventListener('input', () => {
            if (!ujVendegKupon(allapot.aktivKupon)) return;
            allapot.kuponEllenorzesAzonosito += 1;
            allapot.aktivKupon = null;
            kuponStatusz(elemek, kuponUzenet('ujVendegEmailValtozott', 'Az email c\u00edm m\u00f3dosult, ez\u00e9rt \u00e9rv\u00e9nyes\u00edtsd \u00fajra a kupont.'), true);
            osszefoglaloFrissitese(elemek);
        });

        elemek.kepInput?.addEventListener('change', () => {
            hibakTorlese(elemek);
            kepEloNezetFrissitese(elemek);
            osszefoglaloFrissitese(elemek);
            if (elemek.kepInput.files?.length) kovetkezoReszhezGordit('[data-step="5"]', 260);
        });

        elemek.kepEloNezet?.addEventListener('click', event => {
            if (event.target.closest('#foglalas-kep-torles')) {
                kepValasztasTorlese(elemek);
                osszefoglaloFrissitese(elemek);
            }
        });
    }

    function kapcsolatLinkekFrissitese() {
        const kapcsolat = window.lumiAdatok?.kapcsolat || {};
        const instagram = document.querySelector('[data-booking-contact="instagram"]');
        const messenger = document.querySelector('[data-booking-contact="messenger"]');
        const sms = document.querySelector('[data-booking-contact="sms"]');
        const alapMessenger = 'https://m.me/petras.szofi';
        const alapSms = 'sms:+36205636494';

        if (instagram && kapcsolat.instagramUzenet) {
            instagram.href = kapcsolat.instagramUzenet;
        }

        if (messenger) {
            messenger.href = kapcsolat.messenger && !kapcsolat.messenger.includes('61576508698202')
                ? kapcsolat.messenger
                : alapMessenger;
        }

        if (sms) {
            sms.href = kapcsolat.smsUzenet || alapSms;
        }
    }


    async function szolgaltatasokBetoltese(elemek) {
        selectAllapot(elemek.szolgaltatas, 'Szolgáltatások betöltése...');
        selectAllapot(elemek.datum, 'Előbb válassz szolgáltatást...');
        selectAllapot(elemek.ido, 'Előbb válassz szolgáltatást és dátumot...');
        kartyaUzenet(elemek.szolgaltatasKartyak, 'Szolgáltatások betöltése...');
        kartyaUzenet(elemek.datumKartyak, 'Előbb válassz szolgáltatást.');
        kartyaUzenet(elemek.idoKartyak, 'Előbb válassz dátumot.');
        statuszKiirasa(elemek.statusz, '');

        let { data, error } = await allapot.kliens
            .from('services')
            .select('id,name,description,price_text,price_amount,price_unit,price_suffix,duration_minutes')
            .eq('active', true)
            .eq('booking_enabled', true)
            .order('sort_order', { ascending: true });

        if (error && adatbazisOszlopHiany(error, ['price_amount', 'price_unit', 'price_suffix'])) {
            ({ data, error } = await allapot.kliens
                .from('services')
                .select('id,name,description,price_text,duration_minutes')
                .eq('active', true)
                .eq('booking_enabled', true)
                .order('sort_order', { ascending: true }));
        }

        if (error) {
            statuszKiirasa(elemek.statusz, 'A szolgáltatások még nem tölthetők be. Futtasd a Supabase SQL fájlt, majd próbáld újra.', true);
            selectAllapot(elemek.szolgaltatas, 'A szolgáltatások nem érhetők el');
            kartyaUzenet(elemek.szolgaltatasKartyak, 'A szolgáltatások most nem érhetők el.');
            return;
        }

        allapot.szolgaltatasok = (Array.isArray(data) ? data : []).map(szolgaltatasArNormalizalasa);
        elemek.szolgaltatas.innerHTML = '<option value="" disabled selected>Válassz szolgáltatást...</option>';

        allapot.szolgaltatasok.forEach(szolgaltatas => {
            const option = document.createElement('option');
            option.value = szolgaltatas.id;
            option.textContent = szolgaltatasFelirat(szolgaltatas);
            elemek.szolgaltatas.appendChild(option);
        });

        if (allapot.szolgaltatasok.length === 0) {
            selectAllapot(elemek.szolgaltatas, 'Nincs aktív foglalható szolgáltatás');
            kartyaUzenet(elemek.szolgaltatasKartyak, 'Nincs aktív foglalható szolgáltatás.');
            return;
        }

        szolgaltatasKartyakRenderelese(elemek);
    }

    function szolgaltatasKartyakRenderelese(elemek) {
        if (!elemek.szolgaltatasKartyak) return;
        elemek.szolgaltatasKartyak.innerHTML = '';

        allapot.szolgaltatasok.forEach(szolgaltatas => {
            const kartya = document.createElement('button');
            kartya.type = 'button';
            kartya.className = 'foglalas-valaszto-kartya';
            kartya.dataset.value = szolgaltatas.id;
            kartya.innerHTML = `
                <span class="foglalas-kartya-cim">${html(szolgaltatas.description?.trim() || szolgaltatas.name)}</span>
                <span class="foglalas-kartya-meta">${html([szolgaltatas.price_text, idoFelirat(szolgaltatas.duration_minutes)].filter(Boolean).join(' • '))}</span>
            `;
            kartya.addEventListener('click', () => {
                elemek.szolgaltatas.value = szolgaltatas.id;
                kuponSzolgaltatasValtozott(elemek);
                kartyaAktivAllapot(elemek.szolgaltatasKartyak, szolgaltatas.id);
                szabadDatumokBetoltese(elemek);
                osszefoglaloFrissitese(elemek);
                kovetkezoReszhezGordit('[data-step="2"]');
            });
            elemek.szolgaltatasKartyak.appendChild(kartya);
        });
    }

    async function szabadDatumokBetoltese(elemek) {
        const szolgaltatasId = elemek.szolgaltatas.value;

        selectAllapot(elemek.ido, 'Előbb válassz dátumot...');
        kartyaUzenet(elemek.idoKartyak, 'Előbb válassz dátumot.');

        if (!szolgaltatasId) {
            selectAllapot(elemek.datum, 'Előbb válassz szolgáltatást...');
            kartyaUzenet(elemek.datumKartyak, 'Előbb válassz szolgáltatást.');
            return;
        }

        selectAllapot(elemek.datum, 'Szabad dátumok betöltése...');
        kartyaUzenet(elemek.datumKartyak, 'Szabad dátumok betöltése...');
        statuszKiirasa(elemek.statusz, '');

        const { data, error } = await allapot.kliens.rpc('get_available_dates', {
            p_service_id: szolgaltatasId,
            p_start_date: maiDatum(),
            p_days: 90
        });

        if (error) {
            statuszKiirasa(elemek.statusz, 'Most nem sikerült lekérni a szabad dátumokat. Futtasd a legfrissebb Supabase SQL-t, majd próbáld újra.', true);
            selectAllapot(elemek.datum, 'A szabad dátumok nem érhetők el');
            kartyaUzenet(elemek.datumKartyak, 'A szabad dátumok most nem érhetők el.');
            return;
        }

        const datumok = Array.isArray(data) ? data : [];
        elemek.datum.innerHTML = '<option value="" disabled selected>Válassz szabad dátumot...</option>';

        datumok.forEach(datum => {
            const option = document.createElement('option');
            option.value = datum.work_date;
            option.textContent = datumFelirat(datum.work_date);
            elemek.datum.appendChild(option);
        });

        if (datumok.length === 0) {
            selectAllapot(elemek.datum, 'Nincs szabad dátum ehhez a szolgáltatáshoz');
            kartyaUzenet(elemek.datumKartyak, 'Nincs szabad dátum ehhez a szolgáltatáshoz.');
            return;
        }

        valasztoKartyakRenderelese(elemek.datum, elemek.datumKartyak, 'datum', value => {
            elemek.datum.value = value;
            kartyaAktivAllapot(elemek.datumKartyak, value);
            idopontokBetoltese(elemek);
            osszefoglaloFrissitese(elemek);
        });
    }

    async function idopontokBetoltese(elemek) {
        const szolgaltatasId = elemek.szolgaltatas.value;
        const datum = elemek.datum.value;

        if (!szolgaltatasId || !datum) {
            selectAllapot(elemek.ido, 'Előbb válassz szolgáltatást és dátumot...');
            kartyaUzenet(elemek.idoKartyak, 'Előbb válassz dátumot.');
            return;
        }

        if (datum < maiDatum()) {
            selectAllapot(elemek.ido, 'Múltbeli dátum nem választható');
            kartyaUzenet(elemek.idoKartyak, 'Múltbeli dátum nem választható.');
            return;
        }

        selectAllapot(elemek.ido, 'Szabad időpontok betöltése...');
        kartyaUzenet(elemek.idoKartyak, 'Szabad időpontok betöltése...');
        statuszKiirasa(elemek.statusz, '');

        const { data, error } = await allapot.kliens.rpc('get_available_slots', {
            p_service_id: szolgaltatasId,
            p_date: datum
        });

        if (error) {
            statuszKiirasa(elemek.statusz, 'Most nem sikerült lekérni a szabad időpontokat. Kérlek próbáld újra kicsit később.', true);
            selectAllapot(elemek.ido, 'Nem sikerült betölteni');
            kartyaUzenet(elemek.idoKartyak, 'Nem sikerült betölteni az időpontokat.');
            return;
        }

        const idopontok = Array.isArray(data) ? data : [];
        elemek.ido.innerHTML = '<option value="" disabled selected>Válassz időpontot...</option>';

        idopontok.forEach(idopont => {
            const option = document.createElement('option');
            option.value = idopont.starts_at;
            option.textContent = idopont.label;
            elemek.ido.appendChild(option);
        });

        if (idopontok.length === 0) {
            selectAllapot(elemek.ido, 'Erre a napra nincs szabad időpont');
            kartyaUzenet(elemek.idoKartyak, 'Erre a napra nincs szabad időpont.');
            return;
        }

        valasztoKartyakRenderelese(elemek.ido, elemek.idoKartyak, 'ido', value => {
            elemek.ido.value = value;
            kartyaAktivAllapot(elemek.idoKartyak, value);
            osszefoglaloFrissitese(elemek);
            kovetkezoReszhezGordit('[data-step="4"]');
        });
    }

    function valasztoKartyakRenderelese(select, container, tipus, onSelect) {
        if (!container || !select) return;
        container.innerHTML = '';
        container.classList.toggle('foglalas-datum-csik', tipus === 'datum');
        container.classList.toggle('foglalas-mini-racs', tipus !== 'datum' && tipus !== 'ido');
        container.classList.toggle('foglalas-ido-racs', tipus === 'ido');

        const options = Array.from(select.options).filter(option => option.value);

        options.forEach(option => {
            const kartya = document.createElement('button');
            kartya.type = 'button';
            kartya.dataset.value = option.value;

            if (tipus === 'datum') {
                kartya.className = 'foglalas-datum-chip';
                kartya.innerHTML = datumChipHtml(option.value);
            } else {
                kartya.className = tipus === 'ido' ? 'foglalas-idopont-gomb' : 'foglalas-mini-kartya';
                kartya.textContent = option.textContent;
            }

            kartya.addEventListener('click', () => onSelect(option.value));
            container.appendChild(kartya);
        });
    }

    function datumChipHtml(datumSzoveg) {
        const [ev, honap, nap] = datumSzoveg.split('-').map(Number);
        const datum = new Date(ev, honap - 1, nap, 12, 0, 0);
        const honapNev = new Intl.DateTimeFormat('hu-HU', { month: 'short' }).format(datum).replace('.', '');
        const hetnap = new Intl.DateTimeFormat('hu-HU', { weekday: 'long' }).format(datum);

        return `<span class="foglalas-datum-chip-nap">${String(nap).padStart(2, '0')}</span><span class="foglalas-datum-chip-resz">${html(honapNev)} · ${html(hetnap)}</span>`;
    }
    async function foglalasKuldes(elemek) {
        const adatok = foglalasAdatok(elemek);
        const hiba = foglalasHiba(adatok, elemek);

        if (hiba) {
            foglalasHibaMutatasa(elemek, hiba);
            return;
        }

        hibakTorlese(elemek);

        let inspiraciok = [];

        if (adatok.kepFiles.length) {
            gombAllapot(elemek.kuldes, true, 'Inspirációs képek feltöltése...');
            statuszKiirasa(elemek.statusz, 'Képek feltöltése folyamatban...');
            const feltoltes = await inspiraciosKepekFeltoltese(adatok.kepFiles, elemek.statusz);

            if (!feltoltes.ok) {
                statuszKiirasa(elemek.statusz, feltoltes.uzenet || 'A képek feltöltése nem sikerült. Töröld a képeket vagy próbáld újra.', true);
                gombAllapot(elemek.kuldes, false, 'Foglalás elküldése');
                return;
            }

            inspiraciok = feltoltes.kepek;
        }
        gombAllapot(elemek.kuldes, true, 'Foglalás és visszaigazolás küldése...');
        statuszKiirasa(elemek.statusz, '');

        const eredmeny = await foglalasMenteseEmaillel(adatok);

        if (!eredmeny.ok) {
            statuszKiirasa(elemek.statusz, supabaseHiba(eredmeny.error), true);
            kovetkezoReszhezGordit(elemek.statusz, 0);
            gombAllapot(elemek.kuldes, false, 'Foglalás elküldése');
            idopontokBetoltese(elemek);
            return;
        }

        let extraMentve = true;
        if (eredmeny.booking_id && inspiraciok.length) {
            const extra = await foglalasInspiracioMentese(eredmeny.booking_id, adatok, inspiraciok);
            extraMentve = extra.ok;
        }

        const emailEredmeny = eredmeny.email || { ok: false, error: 'missing_email_result' };
        naptarLinkFrissitese(adatok);
        sikeresPopupNyitasa(emailEredmeny);
        elemek.urlap.reset();
        kepValasztasTorlese(elemek);
        stilusAllapotFrissitese(elemek);
        selectAllapot(elemek.datum, 'Előbb válassz szolgáltatást...');
        selectAllapot(elemek.ido, 'Előbb válassz szolgáltatást és dátumot...');
        kartyaUzenet(elemek.datumKartyak, 'Előbb válassz szolgáltatást.');
        kartyaUzenet(elemek.idoKartyak, 'Előbb válassz dátumot.');
        kartyaAktivAllapot(elemek.szolgaltatasKartyak, '');
        osszefoglaloFrissitese(elemek);
        statuszKiirasa(elemek.statusz, emailEredmeny.ok
            ? `A foglalás elküldve. A visszaigazoló emailt is elküldtük.${extraMentve ? '' : ' A képek adminhoz csatolását ellenőrizni kell.'}`
            : `A foglalás elküldve. Az email értesítés most nem biztos, hogy elment, de a foglalás bekerült.${extraMentve ? '' : ' A képek adminhoz csatolását ellenőrizni kell.'}`);
        gombAllapot(elemek.kuldes, false, 'Foglalás elküldése');
    }

    async function foglalasMenteseEmaillel(adatok) {
        if (allapot.kliens.functions?.invoke) {
            try {
                const { data, error } = await allapot.kliens.functions.invoke('create-booking-with-email', {
                    body: {
                        service_id: adatok.szolgaltatasId,
                        customer_name: adatok.nev,
                        customer_phone: adatok.telefon,
                        customer_email: adatok.email,
                        note: adatok.megjegyzes,
                        starts_at: adatok.startsAt,
                        coupon_id: adatok.kupon?.id || null,
                        coupon_code: adatok.kupon?.code || null
                    }
                });

                if (!error && data?.ok && data?.booking_id) {
                    console.info('Lumi Nails booking function result:', data);
                    return data;
                }

                console.warn('Lumi Nails foglalás function nem futott végig, tartalék mentés indul:', error || data);
            } catch (error) {
                console.warn('Lumi Nails foglalás function hiba, tartalék mentés indul:', error);
            }
        }

        return foglalasMenteseKozvetlenul(adatok);
    }

    async function foglalasMenteseKozvetlenul(adatok) {
        const ujRpcAdatok = {
            p_service_id: adatok.szolgaltatasId,
            p_customer_name: adatok.nev,
            p_customer_phone: adatok.telefon,
            p_customer_email: adatok.email,
            p_note: adatok.megjegyzes,
            p_starts_at: adatok.startsAt,
            p_coupon_id: adatok.kupon?.id || null,
            p_coupon_code: adatok.kupon?.code || null
        };
        let { data, error } = await allapot.kliens.rpc('create_booking', ujRpcAdatok);

        if (error && adatbazisOszlopHiany(error, ['p_coupon_id', 'p_coupon_code', 'coupon'])) {
            const { p_coupon_id, p_coupon_code, ...regiRpcAdatok } = ujRpcAdatok;
            ({ data, error } = await allapot.kliens.rpc('create_booking', regiRpcAdatok));
        }

        if (error) {
            return { ok: false, error };
        }

        console.info('Lumi Nails booking saved with fallback RPC:', data);

        return {
            ok: true,
            booking_id: data,
            fallback: true,
            email: {
                ok: false,
                skipped: true,
                fallback: true,
                reason: 'A foglalás tartalék módban került mentésre, ezért az automatikus email nem indult el.'
            }
        };
    }

    async function inspiraciosKepekFeltoltese(files, statuszElem) {
        const kepek = [];

        for (let index = 0; index < files.length; index += 1) {
            statuszKiirasa(statuszElem, `Képek feltöltése: ${index + 1}/${files.length}`);
            const feltoltes = await inspiraciosKepFeltoltese(files[index]);

            if (!feltoltes.ok) {
                return feltoltes;
            }

            kepek.push(feltoltes.adat);
        }

        return { ok: true, kepek };
    }
    async function inspiraciosKepFeltoltese(file) {
        const hiba = kepFajlHiba(file);
        if (hiba) return { ok: false, uzenet: hiba };

        try {
            const optimalizalt = await kepOptimalizalasa(file, {
                maxSide: IMAGE_UPLOAD_MAX_SIDE,
                quality: IMAGE_UPLOAD_WEBP_QUALITY
            });
            const feltoltendo = optimalizalt.file;
            const ext = optimalizalt.extension;
            const azonosito = randomAzonosito();
            const path = `${INSPIRATION_FOLDER}/${maiDatum()}/${Date.now()}-${azonosito}.${ext}`;
            const { error } = await allapot.kliens.storage
                .from(MEDIA_BUCKET)
                .upload(path, feltoltendo, {
                    cacheControl: '31536000',
                    upsert: false,
                    contentType: feltoltendo.type || `image/${ext}`
                });

            if (error) {
                console.error('Inspir?ci?s k?p felt?lt?si hiba:', error);
                return { ok: false, uzenet: 'A k?p felt?lt?se nem siker?lt. Lehet, hogy m?g nem futott le a foglal?si k?p SQL.' };
            }

            const { data } = allapot.kliens.storage.from(MEDIA_BUCKET).getPublicUrl(path);
            return {
                ok: true,
                adat: {
                    url: data?.publicUrl || '',
                    path,
                    name: file.name,
                    type: feltoltendo.type || '',
                    size: feltoltendo.size,
                    originalName: file.name,
                    originalType: file.type || '',
                    originalSize: file.size,
                    optimized: optimalizalt.optimized
                }
            };
        } catch (error) {
            console.error('Inspir?ci?s k?p felt?lt?si kiv?tel:', error);
            return { ok: false, uzenet: 'A k?p felt?lt?se nem siker?lt. K?rlek pr?b?ld ?jra.' };
        }
    }

    async function foglalasInspiracioMentese(bookingId, adatok, inspiraciok) {
        try {
            const { error } = await allapot.kliens.rpc('attach_booking_inspiration', {
                p_booking_id: bookingId,
                p_images: inspiraciok,
                p_nail_style: adatok.koromStilus,
                p_nail_style_note: adatok.eredetiMegjegyzes
            });

            if (error) {
                console.warn('Inspirációs képek csatolása nem sikerült:', error);
                return { ok: false, error };
            }

            return { ok: true };
        } catch (error) {
            console.warn('Inspirációs képek csatolási kivétel:', error);
            return { ok: false, error };
        }
    }
    function foglalasAdatok(elemek) {
        const koromStilus = document.querySelector('input[name="korom-stilus"]:checked')?.value || '';
        const eredetiMegjegyzes = elemek.komment.value.trim();
        const szolgaltatas = allapot.szolgaltatasok.find(szolgaltatas => szolgaltatas.id === elemek.szolgaltatas.value);
        const kupon = kuponOsszegAdatok(szolgaltatas, allapot.aktivKupon);
        const megjegyzes = foglalasMegjegyzes(koromStilus, eredetiMegjegyzes, kupon);

        return {
            nev: elemek.nev.value.trim(),
            telefon: `+36 ${elemzesTelefon(elemek.telefon.value)}`,
            telefonSzamok: elemzesTelefon(elemek.telefon.value),
            email: elemek.email.value.trim().toLowerCase(),
            szolgaltatasId: elemek.szolgaltatas.value,
            szolgaltatas,
            kupon,
            datum: elemek.datum.value,
            startsAt: elemek.ido.value,
            koromStilus,
            eredetiMegjegyzes,
            megjegyzes,
            kepFiles: Array.from(elemek.kepInput?.files || [])
        };
    }

    function foglalasMegjegyzes(koromStilus, megjegyzes, kupon) {
        const sorok = [];
        if (koromStilus) sorok.push(`Köröm stílus: ${koromStilus}`);
        if (megjegyzes) sorok.push(`Elképzelés / megjegyzés: ${megjegyzes}`);
        if (kupon?.code) {
            sorok.push(`Kupon: ${kupon.code} (${kupon.title || kupon.discountLabel || 'kedvezmény'})`);
            if (kupon.baseLabel) sorok.push(`Alapár: ${kupon.baseLabel}`);
            if (kupon.discountAmount > 0) sorok.push(`Kedvezmény: -${arFelirat(kupon.discountAmount, kupon.unit)}`);
            if (kupon.finalLabel) sorok.push(`Végösszeg: ${kupon.finalLabel}`);
        }
        return sorok.join('\n');
    }

    function foglalasHiba(adatok, elemek) {
        if (!adatok.szolgaltatasId) {
            return hibaAdat('Kérlek válassz szolgáltatást.', '[data-step="1"]', elemek.szolgaltatasKartyak);
        }

        if (!adatok.koromStilus) {
            return hibaAdat('Kérlek jelöld, hogy egyszerű, francia vagy festett/díszített körmöt szeretnél.', '[data-step="2"]', document.getElementById('foglalas-stilus-racs'));
        }

        if (!adatok.datum) {
            return hibaAdat('Kérlek válassz dátumot.', '[data-step="3"]', elemek.datumKartyak);
        }

        if (!adatok.startsAt) {
            return hibaAdat('Kérlek válassz időpontot.', '[data-step="3"]', elemek.idoKartyak);
        }

        if (!adatok.nev) {
            return hibaAdat('Kérlek add meg a neved.', '[data-step="5"]', elemek.nev, elemek.nev);
        }

        if (!adatok.telefonSzamok) {
            return hibaAdat('Kérlek add meg a telefonszámod.', '[data-step="5"]', elemek.telefon.closest('.tel-csoport') || elemek.telefon, elemek.telefon);
        }

        if (adatok.telefonSzamok.length !== 9) {
            return hibaAdat('Kérlek 9 számjegyű magyar mobilszámot adj meg, országkód nélkül. Példa: 301234567', '[data-step="5"]', elemek.telefon.closest('.tel-csoport') || elemek.telefon, elemek.telefon);
        }

        if (!adatok.email) {
            return hibaAdat('Kérlek add meg az email címed.', '[data-step="5"]', elemek.email, elemek.email);
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adatok.email)) {
            return hibaAdat('Kérlek valós email címet adj meg.', '[data-step="5"]', elemek.email, elemek.email);
        }

        if (elemek.kuponInput?.value.trim() && !adatok.kupon?.code) {
            return hibaAdat('A kuponkódot előbb érvényesítsd, vagy töröld a mezőből.', '[data-step="5"]', elemek.kuponBlokk, elemek.kuponInput);
        }

        if (ujVendegKupon(allapot.aktivKupon) && allapot.aktivKupon.ellenorzottEmail !== adatok.email) {
            return hibaAdat('Az \u00faj vend\u00e9g kupont az aktu\u00e1lis email c\u00edmmel \u00fajra kell \u00e9rv\u00e9nyes\u00edteni.', '[data-step="5"]', elemek.kuponBlokk, elemek.kuponInput);
        }

        if (adatok.datum < maiDatum()) {
            return hibaAdat('Múltbeli dátumra nem lehet időpontot foglalni.', '[data-step="3"]', elemek.datumKartyak);
        }

        if (adatok.kepFiles.length > MAX_IMAGE_COUNT) {
            return hibaAdat(`Legfeljebb ${MAX_IMAGE_COUNT} inspirációs képet tölthetsz fel.`, '[data-step="4"]', document.querySelector('.foglalas-kepfeltoltes'), elemek.kepInput);
        }

        for (const file of adatok.kepFiles) {
            const kepHiba = kepFajlHiba(file);
            if (kepHiba) {
                return hibaAdat(kepHiba, '[data-step="4"]', document.querySelector('.foglalas-kepfeltoltes'), elemek.kepInput);
            }
        }

        return null;
    }

    function hibaAdat(uzenet, cel, elem, fokusz) {
        return { uzenet, cel, elem, fokusz };
    }

    function foglalasHibaMutatasa(elemek, hiba) {
        hibakTorlese(elemek);
        statuszKiirasa(elemek.statusz, hiba.uzenet, true);

        const cel = typeof hiba.cel === 'string' ? document.querySelector(hiba.cel) : hiba.cel;
        const elem = hiba.elem || cel;

        cel?.classList.add('foglalas-hiba-szekcio');
        elem?.classList.add('foglalas-hibas-mezo');
        elem?.setAttribute?.('aria-invalid', 'true');

        kovetkezoReszhezGordit(cel || elem, 0);

        if (hiba.fokusz && typeof hiba.fokusz.focus === 'function') {
            window.setTimeout(() => hiba.fokusz.focus({ preventScroll: true }), 260);
        }
    }

    function hibakTorlese(elemek) {
        elemek.urlap?.querySelectorAll('.foglalas-hiba-szekcio, .foglalas-hibas-mezo').forEach(elem => {
            elem.classList.remove('foglalas-hiba-szekcio', 'foglalas-hibas-mezo');
            elem.removeAttribute('aria-invalid');
        });
    }

    function kepFajlHiba(file) {
        if (!file) return '';

        if (file.size > MAX_IMAGE_SIZE) {
            return 'A feltöltött kép legfeljebb 12 MB lehet.';
        }

        const type = String(file.type || '').toLowerCase();
        const name = String(file.name || '').toLowerCase();
        const extensionOk = /\.(jpe?g|png|webp|avif|heic|heif)$/.test(name);

        if (type && !SUPPORTED_IMAGE_TYPES.includes(type) && !extensionOk) {
            return 'Kérlek JPG, PNG, WebP, AVIF vagy HEIC képet tölts fel.';
        }

        if (!type && !extensionOk) {
            return 'Kérlek képfájlt tölts fel.';
        }

        return '';
    }

    function kepEloNezetFrissitese(elemek) {
        const files = Array.from(elemek.kepInput?.files || []);

        if (files.length > MAX_IMAGE_COUNT) {
            statuszKiirasa(elemek.statusz, `Legfeljebb ${MAX_IMAGE_COUNT} inspirációs képet tölthetsz fel.`, true);
            kepValasztasTorlese(elemek);
            return;
        }

        for (const file of files) {
            const hiba = kepFajlHiba(file);
            if (hiba) {
                statuszKiirasa(elemek.statusz, hiba, true);
                kepValasztasTorlese(elemek);
                return;
            }
        }

        statuszKiirasa(elemek.statusz, '');
        allapot.kepPreviewUrls.forEach(url => URL.revokeObjectURL(url));
        allapot.kepPreviewUrls = [];

        if (!files.length || !elemek.kepEloNezet) {
            kepValasztasTorlese(elemek);
            return;
        }

        const kepekHtml = files.map(file => {
            const url = URL.createObjectURL(file);
            allapot.kepPreviewUrls.push(url);
            return `
                <figure class="foglalas-kep-mini">
                    <img src="${url}" alt="Inspirációs kép előnézet">
                    <figcaption>${html(file.name)}<br><small>${Math.round(file.size / 1024)} KB</small></figcaption>
                </figure>
            `;
        }).join('');

        elemek.kepEloNezet.innerHTML = `
            <div class="foglalas-kep-elonezet-racs">${kepekHtml}</div>
            <button type="button" id="foglalas-kep-torles" class="bezaro-link">Képek eltávolítása</button>
        `;
        elemek.kepEloNezet.hidden = false;
    }

    function kepValasztasTorlese(elemek) {
        allapot.kepPreviewUrls.forEach(url => URL.revokeObjectURL(url));
        allapot.kepPreviewUrls = [];
        if (elemek.kepInput) elemek.kepInput.value = '';
        if (elemek.kepEloNezet) {
            elemek.kepEloNezet.innerHTML = '';
            elemek.kepEloNezet.hidden = true;
        }
    }
    function stilusAllapotFrissitese(elemek) {
        const valasztott = document.querySelector('input[name="korom-stilus"]:checked')?.value || '';
        document.querySelectorAll('.foglalas-stilus-kartya').forEach(kartya => {
            const input = kartya.querySelector('input');
            kartya.classList.toggle('aktiv', Boolean(input?.checked));
        });

        if (elemek.stilusTipp) {
            elemek.stilusTipp.hidden = !valasztott || valasztott.includes('Egyszerű');
        }
    }
