    async function kuponokBetoltese(elemek) {
        if (!elemek.kuponBlokk || !allapot.kliens) return;

        try {
            let { data, error } = await allapot.kliens
                .from('coupons')
                .select('id,code,title,description,discount_type,discount_value,discount_text,service_id,service_category,customer_scope,valid_from,valid_until,active,show_on_home,sort_order')
                .eq('active', true)
                .order('sort_order', { ascending: true })
                .order('created_at', { ascending: true });

            if (error && adatbazisOszlopHiany(error, ['service_category', 'customer_scope'])) {
                ({ data, error } = await allapot.kliens
                    .from('coupons')
                    .select('id,code,title,description,discount_type,discount_value,discount_text,service_id,valid_from,valid_until,active,show_on_home,sort_order')
                    .eq('active', true)
                    .order('sort_order', { ascending: true })
                    .order('created_at', { ascending: true }));
            }

            if (error) {
                kuponMezoLathatosag(elemek, false);
                return;
            }

            allapot.kuponok = aktivKuponok(data || []);
            kuponMezoLathatosag(elemek, allapot.kuponok.length > 0);
            kuponUrlbolBetoltese(elemek);
        } catch (_error) {
            allapot.kuponok = [];
            kuponMezoLathatosag(elemek, false);
        }
    }

    function aktivKuponok(kuponok) {
        const ma = maiDatum();
        return kuponok.filter(kupon => kupon.active !== false)
            .filter(kupon => !kupon.valid_from || kupon.valid_from <= ma)
            .filter(kupon => !kupon.valid_until || kupon.valid_until >= ma);
    }

    function kuponUrlbolBetoltese(elemek) {
        if (!elemek.kuponInput || elemek.kuponInput.value.trim()) return;
        const params = new URLSearchParams(window.location.search);
        const kod = (params.get('kupon') || params.get('coupon') || '').trim().toUpperCase();
        if (!kod) return;

        elemek.kuponInput.value = kod;
        kuponEllenorzese(elemek, { varakozzSzolgaltatasra: true }).catch(error => {
            console.warn('Kupon URL ellen\u0151rz\u00e9si hiba:', error);
            kuponStatusz(elemek, supabaseHiba(error), true);
        });
    }

    function kuponMezoLathatosag(elemek, lathato) {
        if (!elemek.kuponBlokk) return;
        elemek.kuponBlokk.hidden = !lathato;
        if (!lathato) {
            allapot.aktivKupon = null;
            if (elemek.kuponInput) elemek.kuponInput.value = '';
            kuponStatusz(elemek, '');
        }
    }

    async function kuponEllenorzese(elemek, opciok = {}) {
        const kod = elemek.kuponInput?.value.trim().toUpperCase() || '';
        const ellenorzesAzonosito = allapot.kuponEllenorzesAzonosito + 1;
        allapot.kuponEllenorzesAzonosito = ellenorzesAzonosito;
        allapot.aktivKupon = null;

        if (!kod) {
            kuponStatusz(elemek, kuponUzenet('ures', '\u00cdrd be a kuponk\u00f3dot.'), true);
            osszefoglaloFrissitese(elemek);
            return;
        }

        const szolgaltatasId = elemek.szolgaltatas.value;
        const szolgaltatasObj = allapot.szolgaltatasok.find(szolgaltatas => szolgaltatas.id === szolgaltatasId);
        const kupon = allapot.kuponok.find(elem => String(elem.code || '').toUpperCase() === kod);

        if (!kupon) {
            kuponStatusz(elemek, kuponUzenet('nincsAktiv', 'Nem tal\u00e1ltam ilyen akt\u00edv kupont.'), true);
            osszefoglaloFrissitese(elemek);
            return;
        }

        if (szolgaltatasId && !kuponSzolgaltatasraErvenyes(kupon, szolgaltatasObj, szolgaltatasId)) {
            kuponStatusz(elemek, kuponUzenet('masikSzolgaltatas', 'Ez a kupon nem ehhez a szolg\u00e1ltat\u00e1shoz vagy kateg\u00f3ri\u00e1hoz \u00e9rv\u00e9nyes.'), true);
            osszefoglaloFrissitese(elemek);
            return;
        }

        if (ujVendegKupon(kupon)) {
            const email = elemek.email?.value.trim().toLowerCase() || '';
            if (!email) {
                kuponStatusz(elemek, kuponUzenet('ujVendegEmailHiany', 'Ehhez a kuponhoz add meg el\u0151bb az email c\u00edmed, mert csak \u00faj vend\u00e9geknek \u00e9rv\u00e9nyes.'), true);
                elemek.email?.classList.add('foglalas-hibas-mezo');
                elemek.email?.setAttribute('aria-invalid', 'true');
                osszefoglaloFrissitese(elemek);
                return;
            }

            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                kuponStatusz(elemek, kuponUzenet('ujVendegEmailHibas', 'A kupon ellen\u0151rz\u00e9s\u00e9hez val\u00f3s email c\u00edmet adj meg.'), true);
                elemek.email?.classList.add('foglalas-hibas-mezo');
                elemek.email?.setAttribute('aria-invalid', 'true');
                osszefoglaloFrissitese(elemek);
                return;
            }

            kuponStatusz(elemek, kuponUzenet('ujVendegEllenorzes', 'Kupon ellen\u0151rz\u00e9se email alapj\u00e1n...'));
            const ujVendegEredmeny = await ujVendegKuponEllenorzese(email);
            if (ellenorzesAzonosito !== allapot.kuponEllenorzesAzonosito) return;

            if (!ujVendegEredmeny.ok) {
                kuponStatusz(elemek, kuponUzenet('ujVendegEllenorzesHiba', 'Most nem siker\u00fclt ellen\u0151rizni az \u00faj vend\u00e9g kupont. K\u00e9rlek pr\u00f3b\u00e1ld \u00fajra.'), true);
                osszefoglaloFrissitese(elemek);
                return;
            }

            if (ujVendegEredmeny.vanKorabbiFoglalas) {
                kuponStatusz(elemek, kuponUzenet('ujVendegMarVolt', 'Ez a kupon csak \u00faj vend\u00e9geknek \u00e9rv\u00e9nyes. Ezzel az email c\u00edmmel m\u00e1r volt foglal\u00e1s.'), true);
                osszefoglaloFrissitese(elemek);
                return;
            }

            kupon.ellenorzottEmail = email;
        }

        allapot.aktivKupon = kupon;
        kuponStatusz(elemek, szolgaltatasId
            ? kuponUzenet('ervenyes', '{kod} kupon \u00e9rv\u00e9nyes\u00edtve.', { kod: kupon.code })
            : kuponUzenet('ervenyes', '{kod} kupon el\u0151k\u00e9sz\u00edtve. V\u00e1lassz szolg\u00e1ltat\u00e1st, \u00e9s ellen\u0151rz\u00f6m.', { kod: kupon.code }));
        osszefoglaloFrissitese(elemek);
    }

    function kuponSzolgaltatasValtozott(elemek) {
        const szolgaltatasId = elemek.szolgaltatas.value;
        const szolgaltatasObj = allapot.szolgaltatasok.find(szolgaltatas => szolgaltatas.id === szolgaltatasId);

        if (allapot.aktivKupon && !kuponSzolgaltatasraErvenyes(allapot.aktivKupon, szolgaltatasObj, szolgaltatasId)) {
            allapot.aktivKupon = null;
            kuponStatusz(elemek, kuponUzenet('szolgaltatasValtozott', 'A v\u00e1lasztott kupon m\u00e1sik szolg\u00e1ltat\u00e1shoz vagy kateg\u00f3ri\u00e1hoz tartozik.'), true);
        } else if (elemek.kuponInput?.value.trim() && !allapot.aktivKupon) {
            kuponEllenorzese(elemek).catch(error => {
                console.warn('Kupon \u00fajraellen\u0151rz\u00e9si hiba:', error);
                kuponStatusz(elemek, supabaseHiba(error), true);
            });
        }

        osszefoglaloFrissitese(elemek);
    }

    function kuponSzolgaltatasraErvenyes(kupon, szolgaltatas, szolgaltatasId) {
        if (!kupon) return false;
        if (!kupon.service_id && !kupon.service_category) return true;
        if (!szolgaltatasId) return true;
        if (kupon.service_id) return kupon.service_id === szolgaltatasId;
        return szolgaltatasKuponKategoria(szolgaltatas) === kupon.service_category;
    }


    function ujVendegKupon(kupon) {
        return String(kupon?.customer_scope || 'all') === 'new_customer';
    }

    async function ujVendegKuponEllenorzese(email) {
        if (!allapot.kliens?.rpc) return { ok: false };

        const { data, error } = await allapot.kliens.rpc('lumi_customer_has_previous_booking', {
            p_customer_email: email
        });

        if (error) {
            console.warn('\u00daj vend\u00e9g kupon ellen\u0151rz\u00e9si hiba:', error);
            return { ok: false, error };
        }

        return { ok: true, vanKorabbiFoglalas: Boolean(data) };
    }

    function szolgaltatasKuponKategoria(szolgaltatas) {
        const szoveg = `${szolgaltatas?.name || ''} ${szolgaltatas?.description || ''}`.toLocaleLowerCase('hu-HU');
        if (szoveg.includes('\u00e9p\u00edt')) return '\u00c9p\u00edt\u00e9s';
        if (szoveg.includes('t\u00f6lt')) return 'T\u00f6lt\u00e9s';
        if (szoveg.includes('g\u00e9l lakk') || szoveg.includes('g\u00e9llakk') || szoveg.includes('gel lakk')) return 'G\u00e9l lakk';
        if (szoveg.includes('manik')) return 'Manik\u0171r';
        if (szoveg.includes('d\u00edsz') || szoveg.includes('nail art') || szoveg.includes('k\u0151')) return 'D\u00edsz\u00edt\u00e9s';
        if (szoveg.includes('leszed')) return 'Leszed\u00e9s';
        return '';
    }

    function kuponStatusz(elemek, uzenet, hiba = false) {
        if (!elemek.kuponStatusz) return;
        elemek.kuponStatusz.textContent = uzenet;
        elemek.kuponStatusz.classList.toggle('hiba', Boolean(hiba));
    }

    function kuponUzenet(kulcs, alap, adatok = {}) {
        const sablon = window.lumiAdatok?.foglalas?.kuponUzenetek?.[kulcs] || alap;
        return String(sablon || '')
            .replace(/\{kod\}/g, adatok.kod || '')
            .replace(/\{email\}/g, adatok.email || '');
    }

    function kuponOsszegAdatok(szolgaltatas, kupon) {
        const amount = Number(szolgaltatas?.price_amount) || 0;
        const unit = szolgaltatas?.price_unit || 'Ft';
        const baseLabel = amount ? arFelirat(amount, unit) : szolgaltatasArFelirat(szolgaltatas);

        if (!kupon?.code) {
            return { baseAmount: amount, unit, baseLabel };
        }

        const discountLabel = kupon.discount_text || kuponKedvezmenyFelirat(kupon);
        const discountAmount = kuponKedvezmenyOsszeg(amount, kupon);
        const finalAmount = amount ? Math.max(0, amount - discountAmount) : 0;

        return {
            id: kupon.id,
            code: kupon.code,
            title: kupon.title,
            discountLabel,
            discountType: kupon.discount_type,
            discountValue: Number(kupon.discount_value) || 0,
            baseAmount: amount,
            unit,
            baseLabel,
            discountAmount,
            finalAmount,
            finalLabel: amount && kupon.discount_type !== 'text' ? arFelirat(finalAmount, unit) : ''
        };
    }

    function kuponKedvezmenyOsszeg(amount, kupon) {
        if (!amount || !kupon) return 0;
        const value = Number(kupon.discount_value) || 0;
        if (kupon.discount_type === 'percent') return Math.min(amount, Math.round(amount * value / 100));
        if (kupon.discount_type === 'fixed') return Math.min(amount, value);
        return 0;
    }

    function kuponKedvezmenyFelirat(kupon) {
        const value = Number(kupon?.discount_value) || 0;
        if (kupon?.discount_type === 'percent') return `${value}% kedvezmény`;
        if (kupon?.discount_type === 'fixed') return `${arFelirat(value, 'Ft')} kedvezmény`;
        return kupon?.title || 'Akció';
    }

    function szolgaltatasArNormalizalasa(szolgaltatas) {
        const priceText = szolgaltatas.price_text || '';
        const priceAmount = Number.isFinite(Number(szolgaltatas.price_amount)) && Number(szolgaltatas.price_amount) > 0
            ? Number(szolgaltatas.price_amount)
            : arOsszegKinyerese(priceText);
        const priceUnit = szolgaltatas.price_unit || arEgysegKinyerese(priceText) || 'Ft';

        return {
            ...szolgaltatas,
            price_amount: priceAmount || null,
            price_unit: priceUnit,
            price_suffix: '',
            price_text: priceText || arFelirat(priceAmount, priceUnit)
        };
    }

    function szolgaltatasArFelirat(szolgaltatas) {
        if (!szolgaltatas) return '';
        return arFelirat(szolgaltatas.price_amount, szolgaltatas.price_unit) || szolgaltatas.price_text || '';
    }

    function arFelirat(osszeg, egyseg = 'Ft') {
        const nyers = String(osszeg ?? '').trim();
        if (!nyers) return '';
        if (/[^\d\s.,\-\u2013]/.test(nyers)) return nyers;

        const csakSzam = nyers.replace(/[\s.]/g, '');
        const ertek = /^\d+$/.test(csakSzam)
            ? Number.parseInt(csakSzam, 10).toLocaleString('hu-HU')
            : nyers;

        return `${ertek} ${egyseg || 'Ft'}`.trim();
    }

    function arSzamolhatoOsszeg(ertek) {
        const nyers = String(ertek || '').trim();
        if (!nyers || /[-\u2013]/.test(nyers)) return null;
        const csakSzam = nyers.replace(/\D/g, '');
        const szam = Number.parseInt(csakSzam, 10);
        return Number.isFinite(szam) && szam > 0 ? szam : null;
    }

    function arErtekKinyerese(szoveg) {
        const tiszta = String(szoveg || '').replace(/\s+/g, ' ').trim();
        const tartomany = tiszta.match(/\d[\d\s.]*(?:[-\u2013]\s*\d[\d\s.]*)/);
        if (tartomany) return tartomany[0].replace(/[\s.]/g, '');
        const egyszeru = tiszta.match(/\d[\d\s.]*/);
        return egyszeru ? egyszeru[0].replace(/[\s.]/g, '') : '';
    }

    function arOsszegKinyerese(szoveg) {
        return arSzamolhatoOsszeg(arErtekKinyerese(szoveg)) || 0;
    }

    function arEgysegKinyerese(szoveg) {
        const kis = String(szoveg || '').toLowerCase();
        if (kis.includes('/ db')) return 'Ft / db';
        if (kis.includes('/ ujj')) return 'Ft / ujj';
        if (kis.includes('-tól') || kis.includes('-tol')) return 'Ft-tól';
        if (kis.includes('ft')) return 'Ft';
        if (kis.includes('db')) return 'db';
        if (kis.includes('ujj')) return 'ujj';
        return 'Ft';
    }

    function adatbazisOszlopHiany(error, oszlopok = []) {
        const uzenet = `${error?.message || ''} ${error?.details || ''} ${error?.hint || ''}`.toLowerCase();
        return oszlopok.some(oszlop => uzenet.includes(oszlop.toLowerCase())) || uzenet.includes('schema cache') && (uzenet.includes('column') || uzenet.includes('function'));
    }
