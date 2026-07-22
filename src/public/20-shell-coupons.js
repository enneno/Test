function tisztaUrlBeallitasa() {
    const tisztaUtvonalak = {
        '/index.html': '/',
        '/arlista.html': '/arlista/',
        '/arlista/index.html': '/arlista/',
        '/galeria.html': '/galeria/',
        '/galeria/index.html': '/galeria/',
        '/foglalas.html': '/foglalas/',
        '/foglalas/index.html': '/foglalas/',
        '/admin.html': '/admin/',
        '/admin/index.html': '/admin/'
    };
    const tisztaUtvonal = tisztaUtvonalak[window.location.pathname];

    if (tisztaUtvonal) {
        window.history.replaceState(null, '', tisztaUtvonal + window.location.search + window.location.hash);
    }
}

function fejlecBetoltese() {
    const fejlecHelye = document.getElementById('fejlec-helye');

    if (!fejlecHelye) {
        return Promise.resolve();
    }

    fejlecHelye.innerHTML = `
        <header>
            <a href="/" class="logo" aria-label="Lumi Nails kezdőlap">Lumi Nails</a>

            <nav class="menu-pontok" aria-label="Fő navigáció">
                <a href="/">Kezdőlap</a>
                <a href="/#szolgaltatasok">Szolgáltatások</a>
                <a href="/arlista/">Árlista</a>
                <a href="/galeria/">Galéria</a>
                <a href="/foglalas/">Foglalás</a>
            </nav>

            <button type="button" class="hamburger" aria-label="Menü megnyitása">
                <span></span>
                <span></span>
                <span></span>
            </button>
        </header>

        <nav id="mobil-nav" class="mobile-menu" aria-label="Mobil navigáció">
            <a href="/">Kezdőlap</a>
            <a href="/#szolgaltatasok">Szolgáltatások</a>
            <a href="/arlista/">Árlista</a>
            <a href="/galeria/">Galéria</a>
            <a href="/foglalas/">Foglalás</a>
        </nav>
    `;

    menuEsemenyekBekotese();
    aktivMenuJelolese();
    return Promise.resolve();
}

function lablecBetoltese() {
    const lablecHelye = document.getElementById('lablec-helye');

    if (!lablecHelye) {
        return Promise.resolve();
    }

    lablecHelye.innerHTML = `
        <footer class="site-footer">
            <div class="footer-belso">
                <div class="footer-brand">
                    <a href="/" class="footer-logo">Lumi Nails</a>
                    <p>Letisztult, nőies körmök Tatabányán, személyes figyelemmel és precíz részletekkel.</p>
                </div>

                <div class="footer-kapcsolat">
                    <h3>Elérhetőség</h3>
                    <address>
                        <a href="https://www.google.com/maps/search/?api=1&query=2800%20Tatab%C3%A1nya%2C%20K%C3%B3s%20K%C3%A1roly%20%C3%BAt" target="_blank" rel="noopener">2800 Tatabánya, Kós Károly út</a>
                        <a data-footer-phone href="#" hidden style="display: none;"></a>
                        <a data-footer-email href="#" hidden style="display: none;"></a>
                        <a class="footer-jogi-link" href="/adatkezeles/">Adatkezelési tájékoztató</a>
                    </address>
                </div>

                <div class="footer-social">
                    <div class="social-linkek">
                        <a class="social-gomb" href="https://www.instagram.com/luminails.xx/" target="_blank" rel="noopener" aria-label="Lumi Nails Instagram" title="Instagram">
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                                <rect x="3" y="3" width="18" height="18" rx="5"></rect>
                                <circle cx="12" cy="12" r="4"></circle>
                                <circle cx="17.5" cy="6.5" r="1"></circle>
                            </svg>
                        </a>
                        <a class="social-gomb" href="https://www.facebook.com/profile.php?id=61576508698202" target="_blank" rel="noopener" aria-label="Lumi Nails Facebook" title="Facebook">
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                                <path d="M13.7 21v-8h2.7l.4-3h-3.1V8.2c0-.9.3-1.5 1.6-1.5H17V3.1C16.2 3 15.5 3 14.7 3c-2.5 0-4.2 1.5-4.2 4.2V10H8v3h2.5v8h3.2z"></path>
                            </svg>
                        </a>
                    </div>
                </div>
            </div>
            <p class="footer-jogok">© Lumi Nails. Minden jog fenntartva.</p>
        </footer>
    `;

    const kezdoCimLink = lablecHelye.querySelector('.footer-kapcsolat address a:not(.footer-jogi-link)');

    if (kezdoCimLink) {
        kezdoCimLink.dataset.footerAddress = '';
        kezdoCimLink.textContent = '';
        kezdoCimLink.href = '#';
        kezdoCimLink.hidden = true;
        kezdoCimLink.style.display = 'none';
    }

    return Promise.resolve();
}


async function onlineKuponokBetolteseEsMegjelenitese() {
    const banner = document.getElementById('akcios-banner');
    const config = window.LUMI_SUPABASE;
    const supabaseLib = window.supabase;

    if (!banner || !config?.url || !config?.publishableKey || !supabaseLib?.createClient) {
        return;
    }

    try {
        const kliens = window.lumiSupabaseClient();
        const { data, error } = await kliens
            .from('coupons')
            .select('id,code,title,description,discount_type,discount_value,discount_text,valid_from,valid_until,active,show_on_home,sort_order')
            .eq('active', true)
            .eq('show_on_home', true)
            .order('sort_order', { ascending: true })
            .order('created_at', { ascending: true })
            .limit(12);

        const kuponok = Array.isArray(data) ? data.filter(kuponErvenyes) : [];
        if (error || !kuponok.length) {
            banner.hidden = true;
            return;
        }

        akciosBannerekRenderelese(banner, kuponok);
    } catch (_error) {
        banner.hidden = true;
    }
}

function kuponErvenyes(kupon) {
    const ma = new Date().toISOString().slice(0, 10);
    return kupon?.active !== false
        && kupon?.show_on_home !== false
        && (!kupon.valid_from || kupon.valid_from <= ma)
        && (!kupon.valid_until || kupon.valid_until >= ma);
}

function akciosBannerekRenderelese(banner, kuponok) {
    const valodiKuponok = Array.isArray(kuponok) ? kuponok.filter(Boolean) : [];
    if (!valodiKuponok.length) {
        banner.hidden = true;
        return;
    }

    const slideres = valodiKuponok.length > 1;
    const renderLista = slideres ? [valodiKuponok[0]] : valodiKuponok;

    banner.innerHTML = `
        <div class="akcios-banner-slider" data-kupon-slider>
            <div class="akcios-banner-track" data-kupon-track>
                ${renderLista.map((kupon, index) => akciosBannerKartyaHtml(kupon, index, valodiKuponok.length)).join('')}
            </div>
            ${slideres ? `
            <div class="akcios-banner-vezerlok" aria-label="Kuponk\u00e1rty\u00e1k lapoz\u00e1sa">
                <button type="button" class="akcios-banner-nyil" data-kupon-lepes="elozo" aria-label="El\u0151z\u0151 kupon">${akciosBannerNyilSvg('bal')}</button>
                <div class="akcios-banner-pontok">
                    ${valodiKuponok.map((_, index) => `<button type="button" class="akcios-banner-pont${index === 0 ? ' aktiv' : ''}" data-kupon-index="${index}" aria-label="${index + 1}. kupon" aria-current="${index === 0 ? 'true' : 'false'}"></button>`).join('')}
                </div>
                <button type="button" class="akcios-banner-nyil" data-kupon-lepes="kovetkezo" aria-label="K\u00f6vetkez\u0151 kupon">${akciosBannerNyilSvg('jobb')}</button>
            </div>` : ''}
        </div>
    `;

    akciosBannerMasolasokBekotese(banner);

    if (slideres) {
        akciosBannerSliderBekotese(banner, valodiKuponok);
    }

    banner.hidden = false;
}

function akciosBannerMasolasokBekotese(scope) {
    if (!scope) return;
    scope.querySelectorAll('[data-kupon-masolas]').forEach(gomb => {
        if (gomb.dataset.kuponMasolasBekotve === '1') return;
        gomb.dataset.kuponMasolasBekotve = '1';
        gomb.addEventListener('click', () => kuponKodMasolasa(gomb.dataset.kuponMasolas || '', gomb));
    });
}

function akciosBannerKartyaHtml(kupon, index, osszes) {
    const kedvezmeny = String(kupon.discount_text || 'Kuponk\u00f3d').trim();
    const kod = String(kupon.code || '').trim().toUpperCase();
    const foglalasUrl = kod ? `/foglalas/?kupon=${encodeURIComponent(kod)}#online-foglalas` : '/foglalas/';

    return `
        <article class="akcios-banner-belso" data-kupon-slide aria-label="${index + 1}. kupon ${osszes} k\u00f6z\u00fcl">
            <div class="akcios-banner-feny" aria-hidden="true"></div>
            <div class="akcios-banner-szoveg">
                <span class="akcios-banner-kicker">Aktu&aacute;lis aj&aacute;nlat</span>
                ${akciosBannerCimHtml(kupon)}
                <p>${html(kupon.description || 'Haszn\u00e1ld a kuponk\u00f3dot online foglal\u00e1sn\u00e1l, \u00e9s az \u00f6sszefoglal\u00f3 kisz\u00e1molja a kedvezm\u00e9nyt.')}</p>
            </div>
            ${kod ? `
            <div class="akcios-banner-kupon" aria-label="Kuponk\u00f3d">
                <button type="button" class="akcios-banner-masolas" data-kupon-masolas="${attr(kod)}" aria-label="Kuponk\u00f3d m\u00e1sol\u00e1sa" title="M\u00e1sol\u00e1s">
                    <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false">
                        <path d="M8 7.5A2.5 2.5 0 0 1 10.5 5h6A2.5 2.5 0 0 1 19 7.5v8A2.5 2.5 0 0 1 16.5 18h-6A2.5 2.5 0 0 1 8 15.5v-8Zm2.5-.7a.7.7 0 0 0-.7.7v8c0 .39.31.7.7.7h6a.7.7 0 0 0 .7-.7v-8a.7.7 0 0 0-.7-.7h-6Z"/>
                        <path d="M5 10.5A2.5 2.5 0 0 1 7.5 8H8v1.8h-.5a.7.7 0 0 0-.7.7v8c0 .39.31.7.7.7h6c.39 0 .7-.31.7-.7V18H16v.5a2.5 2.5 0 0 1-2.5 2.5h-6A2.5 2.5 0 0 1 5 18.5v-8Z"/>
                    </svg>
                </button>
                <span>${html(kedvezmeny)}</span>
                <strong data-kupon-kod>${html(kod)}</strong>
            </div>` : ''}
            <a href="${attr(foglalasUrl)}" class="gomb akcios-banner-gomb">Foglal\u00e1s kuponnal</a>
        </article>
    `;
}

function akciosBannerCimHtml(kupon) {
    const cim = String(kupon.title || kuponKedvezmenyFelirat(kupon) || 'Lumi Nails kupon').trim();
    const reszek = akciosBannerCimReszek(cim);
    if (reszek.alcim) {
        return `<h2 class="akcios-banner-cim akcios-banner-cim-osztott"><span class="akcios-banner-cim-fo">${html(reszek.fo)}</span><span class="akcios-banner-cim-al">${html(reszek.alcim)}</span></h2>`;
    }
    return `<h2 class="akcios-banner-cim"><span class="akcios-banner-cim-fo">${html(reszek.fo)}</span></h2>`;
}

function akciosBannerCimReszek(cim) {
    const tiszta = String(cim || '').replace(/\s+/g, ' ').trim();
    const manualis = tiszta.match(/^(.+?)\s*(?:\||\/|\u2013|\u2014)\s*(.+)$/);
    if (manualis) return { fo: manualis[1].trim(), alcim: manualis[2].trim() };
    const kotjeles = tiszta.match(/^(.+?)\s+-\s+(.+)$/);
    if (kotjeles) return { fo: kotjeles[1].trim(), alcim: kotjeles[2].trim() };
    const kedvezmenyMinta = tiszta.match(/^(.+?kedvezm[e\u00e9]ny[.!?]?)\s+(.+)$/i);
    if (kedvezmenyMinta) return { fo: kedvezmenyMinta[1].trim(), alcim: kedvezmenyMinta[2].trim() };
    return { fo: tiszta, alcim: '' };
}

function akciosBannerNyilSvg(irany) {
    const pontok = irany === 'jobb' ? '9 5 16 12 9 19' : '15 5 8 12 15 19';
    return `<svg aria-hidden="true" viewBox="0 0 24 24" focusable="false"><polyline points="${pontok}" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

function akciosBannerSliderBekotese(banner, kuponok) {
    const track = banner.querySelector('[data-kupon-track]');
    const slider = banner.querySelector('[data-kupon-slider]');
    const lista = Array.isArray(kuponok) ? kuponok.filter(Boolean) : [];
    const osszes = lista.length;
    if (!track || !slider || osszes < 2) return;

    let aktualis = 0;
    let timer = null;
    let animacioFut = false;
    let fallbackTimer = null;

    const slideHtml = index => akciosBannerKartyaHtml(lista[index], index, osszes);

    const pontokFrissitese = () => {
        banner.querySelectorAll('[data-kupon-index]').forEach(gomb => {
            const aktiv = Number(gomb.dataset.kuponIndex) === aktualis;
            gomb.classList.toggle('aktiv', aktiv);
            gomb.setAttribute('aria-current', aktiv ? 'true' : 'false');
        });
    };

    const statikusRender = index => {
        track.classList.add('animacio-nelkul');
        track.style.transition = 'none';
        track.style.transform = 'translateX(0)';
        track.innerHTML = slideHtml(index);
        akciosBannerMasolasokBekotese(track);
        pontokFrissitese();
        track.offsetHeight;
        window.requestAnimationFrame(() => {
            window.requestAnimationFrame(() => {
                track.style.transition = '';
                track.classList.remove('animacio-nelkul');
            });
        });
    };

    const lepesCelra = (celIndex, irany) => {
        if (animacioFut) return;
        const kovetkezo = (celIndex + osszes) % osszes;
        if (kovetkezo === aktualis) return;

        animacioFut = true;
        if (fallbackTimer) {
            window.clearTimeout(fallbackTimer);
            fallbackTimer = null;
        }

        const jobbra = irany >= 0;
        track.classList.add('animacio-nelkul');
        track.style.transition = 'none';
        track.innerHTML = jobbra
            ? `${slideHtml(aktualis)}${slideHtml(kovetkezo)}`
            : `${slideHtml(kovetkezo)}${slideHtml(aktualis)}`;
        akciosBannerMasolasokBekotese(track);
        track.style.transform = jobbra ? 'translateX(0)' : 'translateX(-100%)';
        track.offsetHeight;

        const befejezes = () => {
            if (!animacioFut) return;
            if (fallbackTimer) {
                window.clearTimeout(fallbackTimer);
                fallbackTimer = null;
            }
            aktualis = kovetkezo;
            animacioFut = false;
            statikusRender(aktualis);
        };

        const atmenetVege = event => {
            if (event.target !== track) return;
            track.removeEventListener('transitionend', atmenetVege);
            befejezes();
        };

        track.addEventListener('transitionend', atmenetVege);
        window.requestAnimationFrame(() => {
            track.classList.remove('animacio-nelkul');
            track.style.transition = '';
            track.style.transform = jobbra ? 'translateX(-100%)' : 'translateX(0)';
        });

        fallbackTimer = window.setTimeout(() => {
            track.removeEventListener('transitionend', atmenetVege);
            befejezes();
        }, 760);
    };

    const indit = () => {
        leallit();
        timer = window.setInterval(() => lepesCelra(aktualis + 1, 1), 10000);
    };

    const leallit = () => {
        if (timer) window.clearInterval(timer);
        timer = null;
    };

    banner.querySelectorAll('[data-kupon-lepes]').forEach(gomb => {
        gomb.addEventListener('click', () => {
            const irany = gomb.dataset.kuponLepes === 'kovetkezo' ? 1 : -1;
            lepesCelra(aktualis + irany, irany);
            indit();
        });
    });

    banner.querySelectorAll('[data-kupon-index]').forEach(gomb => {
        gomb.addEventListener('click', () => {
            const cel = Number(gomb.dataset.kuponIndex) || 0;
            const irany = cel >= aktualis ? 1 : -1;
            lepesCelra(cel, irany);
            indit();
        });
    });

    slider.addEventListener('mouseenter', leallit);
    slider.addEventListener('mouseleave', indit);
    slider.addEventListener('focusin', leallit);
    slider.addEventListener('focusout', indit);
    slider.addEventListener('touchstart', leallit, { passive: true });

    statikusRender(aktualis);
    indit();
}

async function kuponKodMasolasa(kod, gomb) {
    if (!kod || !gomb) return;
    const eredeti = gomb.innerHTML;

    try {
        if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(kod);
        } else {
            const ideiglenes = document.createElement('textarea');
            ideiglenes.value = kod;
            ideiglenes.setAttribute('readonly', '');
            ideiglenes.style.position = 'fixed';
            ideiglenes.style.opacity = '0';
            document.body.appendChild(ideiglenes);
            ideiglenes.select();
            document.execCommand('copy');
            ideiglenes.remove();
        }
        gomb.innerHTML = '<span aria-hidden="true">&#10003;</span>';
    } catch (_error) {
        gomb.innerHTML = '<span aria-hidden="true">!</span>';
    }

    window.setTimeout(() => {
        gomb.innerHTML = eredeti;
    }, 1400);
}

function kuponKedvezmenyFelirat(kupon) {
    const value = Number(kupon?.discount_value) || 0;
    if (kupon?.discount_type === 'percent') return `${value}% kedvezm\u00e9ny`;
    if (kupon?.discount_type === 'fixed') return `${value.toLocaleString('hu-HU')} Ft kedvezm\u00e9ny`;
    return kupon?.title || 'Akci\u00f3';
}

function szolgaltatasArFelirat(szolgaltatas) {
    const amount = Number(szolgaltatas?.price_amount) || 0;
    const unit = szolgaltatas?.price_unit || 'Ft';
    if (amount > 0) return `${amount.toLocaleString('hu-HU')} ${unit}`.trim();
    return szolgaltatas?.price_text || '';
}

function adatbazisOszlopHiany(error, oszlopok = []) {
    const uzenet = `${error?.message || ''} ${error?.details || ''} ${error?.hint || ''}`.toLowerCase();
    return oszlopok.some(oszlop => uzenet.includes(oszlop.toLowerCase())) || uzenet.includes('schema cache') && uzenet.includes('column');
}

function szolgaltatasArNormalizalasa(szolgaltatas) {
    const priceText = szolgaltatas.price_text || '';
    const amount = Number.isFinite(Number(szolgaltatas.price_amount)) && Number(szolgaltatas.price_amount) > 0
        ? Number(szolgaltatas.price_amount)
        : arOsszegKinyerese(priceText);
    const unit = szolgaltatas.price_unit || arEgysegKinyerese(priceText) || 'Ft';

    return {
        ...szolgaltatas,
        price_amount: amount || null,
        price_unit: unit,
        price_suffix: ''
    };
}

function arOsszegKinyerese(szoveg) {
    return arSzamolhatoOsszeg(arErtekKinyerese(szoveg)) || 0;
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
