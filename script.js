const metaThemeColor = document.createElement('meta');
metaThemeColor.name = 'theme-color';
metaThemeColor.content = '#fdf4e2';
document.head.appendChild(metaThemeColor);

let galeriaAktualisIndex = 0;
let galeriaKepek = [];
let galeriaHuzasKezdoX = 0;
let galeriaHuzasKezdoY = 0;
let galeriaHuzasAktiv = false;

document.addEventListener('DOMContentLoaded', function () {
    tisztaUrlBeallitasa();
    Promise.all([fejlecBetoltese(), lablecBetoltese()])
        .then(() => adatokBetoltese())
        .then(async adatok => {
            oldalAdatokAlkalmazasa(adatok);
            await onlineTelefonLathatosagAlkalmazasa();
            await onlineArlistaBetoltese();
            await onlineKuponokBetolteseEsMegjelenitese();
            galeriaBekotese();
        })
        .catch(error => {
            console.warn('Lumi Nails tartalom betöltési hiba:', error);
        })
        .finally(() => oldalTartalomMegjelenitese());
    idopontokGeneralasa();
    datumMinimumBeallitasa();
    foglalasiUrlapBekotese();
    galeriaBekotese();
    lebegoFoglalasLetrehozasa();
    lebegoFoglalasFigyeles();
});

function lumiAlapOldalAdatok() {
    return {
        marka: {
            nev: 'Lumi Nails',
            rovidLeiras: 'Letisztult, nőies körmök Tatabányán, személyes figyelemmel és precíz részletekkel.'
        },
        navigacio: {
            kezdolap: 'Kezdőlap',
            szolgaltatasok: 'Szolgáltatások',
            arlista: 'Árlista',
            galeria: 'Galéria',
            foglalas: 'Foglalás'
        },
        lablec: {
            jogiLink: 'Adatkezelési tájékoztató',
            jogok: '© Lumi Nails. Minden jog fenntartva.'
        },
        seo: {
            fooldalCim: 'Lumi Nails - Körmös és manikűr Tatabánya',
            fooldalLeiras: 'Lumi Nails Tatabányán: manikűr, gél lakk, körömépítés, töltés és díszítés online időpontfoglalással.',
            megosztasiKep: '/kepek/social-preview.jpg'
        },
        kapcsolat: {
            cimke: 'Elérhetőség',
            cim: '2800 Tatabánya, Kós Károly út',
            terkepUrl: 'https://www.google.com/maps/search/?api=1&query=2800%20Tatab%C3%A1nya%2C%20K%C3%B3s%20K%C3%A1roly%20%C3%BAt',
            googleErtekelesUrl: 'https://www.google.com/search?q=Lumi+Nails+Tatab%C3%A1nya+Google+%C3%A9rt%C3%A9kel%C3%A9s',
            telefon: '+36 20 563 6494',
            telefonLink: '+36205636494',
            telefonLathato: false,
            email: 'luminails.xx@gmail.com',
            instagram: 'https://www.instagram.com/luminails.xx/',
            facebook: 'https://www.facebook.com/profile.php?id=61576508698202',
            messenger: 'https://m.me/petras.szofi',
            smsUzenet: 'sms:+36205636494',
            instagramUzenet: 'https://ig.me/m/luminails.xx'
        },
        fooldal: {
            hero: {
                kicker: 'Körmös Tatabánya',
                cim: 'Lumi Nails',
                leiras: 'Elegáns manikűr, gél lakk és körömépítés személyes figyelemmel.',
                kep: '/kepek/hatter2.jpg',
                kepAlt: 'Lumi Nails nyitókép'
            },
            bemutatkozas: {
                cim: 'Bemutatkozás',
                bekezdesek: [
                    'Szia, Szofi vagyok, a Lumi Nails mögött álló körmös. Munka mellett, nagyjából egy éve foglalkozom körmökkel, és minden vendégnél arra figyelek, hogy a végeredmény igényes, hordható és a saját stílusához passzoló legyen.',
                    'A célom, hogy idővel főállásban is ezzel foglalkozhassak, ezért minden elkészült szett számomra fejlődés, figyelem és egy kis lépés afelé, amit igazán szeretek csinálni.'
                ],
                kep: '/kepek/bemutatkozas-kep.jpg',
                kepAlt: 'Lumi Nails köröm munka részlete'
            },
            szolgaltatasok: {
                cim: 'SZOLGÁLTATÁSOK',
                arlistaGomb: 'Árlista megtekintése',
                kartyak: [
                    { cim: 'Körömépítés & Töltés', leiras: 'S, M és L méretű zselés vagy porcelán műkörmök\nprecíz felhelyezése és rendszeres karbantartása.', szeles: true },
                    { cim: 'Díszítés / Nail Art', leiras: 'Egyedi minták, matricák, strasszkövek, beépített francia és különleges 3D dekorációk.', szeles: false },
                    { cim: 'Gél Lakk', leiras: 'Hagyományos és erősített technika a tartós, ragyogó színekért, amelyek hetekig hibátlanok maradnak.', szeles: false },
                    { cim: 'Manikűr', leiras: 'Klasszikus körömápolás, gél lakk szakszerű eltávolítása\nés a kezek kényeztető felfrissítése.', szeles: true }
                ]
            },
            galeriaAtvezeto: {
                cim: 'Galéria',
                leiras: 'Nézd meg a korábbi munkákat, színeket és formákat inspirációként a következő időpontodhoz.',
                gombSzoveg: 'Galéria megnyitása',
                kepek: [
                    { src: '/kepek/galeria-atvezeto-1.jpg', alt: 'Lumi Nails köröm munka' },
                    { src: '/kepek/galeria-atvezeto-2.jpg', alt: 'Lumi Nails díszített köröm' },
                    { src: '/kepek/galeria-atvezeto-3.jpg', alt: 'Lumi Nails elegáns manikűr' }
                ]
            },
            foglalasAtvezeto: {
                cim: 'Időpontfoglalás',
                leiras: 'Válaszd ki a neked megfelelő szabad sávot online rendszerünkben.',
                gombSzoveg: 'Online Időpontfoglalás'
            }
        },
        arlista: {
            cim: 'Árlista',
            leiras: 'Az árak tájékoztató jellegűek, a pontos végösszeg az egyedi igényektől és díszítéstől függhet.'
        },
        galeria: {
            cim: 'Galéria',
            leiras: 'Finom részletek, letisztult formák és visszafogottan elegáns díszítések egy helyen.',
            foglalasGomb: 'Időpontfoglalás',
            elemek: [
                { kep: '/galeria/optimized/large/image3.jpg', eloKep: '/galeria/optimized/thumbs/image3.jpg', kepAlt: 'Lumi Nails köröm munka', magas: true },
                { kep: '/galeria/optimized/large/image8.jpg', eloKep: '/galeria/optimized/thumbs/image8.jpg', kepAlt: 'Lumi Nails díszített köröm', magas: true },
                { kep: '/galeria/optimized/large/image6.jpg', eloKep: '/galeria/optimized/thumbs/image6.jpg', kepAlt: 'Lumi Nails elegáns manikűr', magas: true },
                { kep: '/galeria/optimized/large/image0.jpg', eloKep: '/galeria/optimized/thumbs/image0.jpg', kepAlt: 'Lumi Nails köröm inspiráció', magas: false },
                { kep: '/galeria/optimized/large/image1.jpg', eloKep: '/galeria/optimized/thumbs/image1.jpg', kepAlt: 'Lumi Nails gél lakk munka', magas: false },
                { kep: '/galeria/optimized/large/image2.jpg', eloKep: '/galeria/optimized/thumbs/image2.jpg', kepAlt: 'Lumi Nails körömdíszítés', magas: false },
                { kep: '/galeria/optimized/large/image4.jpg', eloKep: '/galeria/optimized/thumbs/image4.jpg', kepAlt: 'Lumi Nails manikűr részlet', magas: false },
                { kep: '/galeria/optimized/large/image5.jpg', eloKep: '/galeria/optimized/thumbs/image5.jpg', kepAlt: 'Lumi Nails letisztult köröm', magas: false },
                { kep: '/galeria/optimized/large/image7.jpg', eloKep: '/galeria/optimized/thumbs/image7.jpg', kepAlt: 'Lumi Nails szalonmunka', magas: false },
                { kep: '/galeria/optimized/large/image9.jpg', eloKep: '/galeria/optimized/thumbs/image9.jpg', kepAlt: 'Lumi Nails köröm szín', magas: false },
                { kep: '/galeria/optimized/large/image10.jpg', eloKep: '/galeria/optimized/thumbs/image10.jpg', kepAlt: 'Lumi Nails elegáns köröm', magas: false },
                { kep: '/galeria/optimized/large/image11.jpg', eloKep: '/galeria/optimized/thumbs/image11.jpg', kepAlt: 'Lumi Nails köröm forma', magas: false },
                { kep: '/galeria/optimized/large/image12.jpg', eloKep: '/galeria/optimized/thumbs/image12.jpg', kepAlt: 'Lumi Nails nail art', magas: false }
            ]
        },
        foglalas: {
            cim: 'Időpontfoglalás',
            leiras: 'Válassz szolgáltatást, dátumot és szabad időpontot. A foglalás után visszaigazoló üzenetet kapsz.',
            oldal: {
                nyitoKicker: 'Időpontkérés',
                nyitoCim: 'Írj rám, vagy foglalj online',
                nyitoLeiras: 'Ha már tudod, mikor jönnél, foglalj online pár lépésben. Ha előbb kérdeznél vagy egyeztetnél, írj rám nyugodtan Instagramon, Messengerben vagy SMS-ben. Inspirációs képet is küldhetsz, ha az segít megmutatni az elképzelésed.',
                utak: {
                    instagram: { cim: 'Instagramon írok', leiras: 'Ha Instán kényelmesebb, ott is tudsz írni gyorsan.', gomb: 'Instagram megnyitása' },
                    messenger: { cim: 'Messengeren írok', leiras: 'Ha előbb átbeszélnéd, mit szeretnél, írj rám nyugodtan Messengerben.', gomb: 'Messenger megnyitása' },
                    sms: { cim: 'SMS-t küldök', leiras: 'Ha a sima szöveges üzenet kényelmesebb, erre a számra tudsz írni: +36 20 563 6494.', gomb: 'SMS írása' },
                    online: { cim: 'Online foglalok', leiras: 'Ha már megvan, mit szeretnél, válaszd ki a szabad időpontot pár kattintással.', gomb: 'Online foglalás indítása' }
                },
                onlineKicker: 'Online foglalás',
                onlineCim: 'Online időpontfoglalás',
                onlineLeiras: 'Pár kattintás az egész: szolgáltatás, stílus, időpont, majd az elérhetőséged. Képet csak akkor tölts fel, ha segítene megmutatni, mire gondoltál.',
                lepesek: [
                    { cim: 'Mit szeretnél?', leiras: 'Válassz egy szolgáltatást, és ehhez mutatom a szabad időket.' },
                    { cim: 'Milyen stílus legyen?', leiras: 'Ezt azért kérem, mert egy francia vagy díszített köröm több időt is kérhet.' },
                    { cim: 'Mikor jönnél?', leiras: 'Először válassz napot, utána válassz egy szabad időpontot.' },
                    { cim: 'Mutasd az elképzelést', leiras: 'Ha van inspirációs képed, feltöltheted. Nem kötelező, csak sokat segít.' },
                    { cim: 'Hova küldhetem a visszaigazolást?', leiras: 'Ezekre az adatokra küldöm a foglalás részleteit, és itt tudlak elérni, ha pontosítani kell.' }
                ],
                stilusok: [
                    { cim: 'Egyszerű / egyszínű', leiras: 'Letisztult, extra díszítés nélkül.' },
                    { cim: 'Francia', leiras: 'Jelezd, ha klasszikus vagy színes francia lenne.' },
                    { cim: 'Festés / díszítés', leiras: 'Minta, extra dekor vagy különlegesebb elképzelés.' }
                ],
                stilusTipp: 'Ha díszítettebb körmöt szeretnél, írj pár szót róla vagy tölts fel képet, hogy lássam, mire gondolsz.',
                kepFeltoltesCim: 'Kép feltöltése',
                kepFeltoltesLeiras: 'Akár több kép is jöhet. JPG, PNG, WebP, AVIF vagy HEIC, képenként legfeljebb 12 MB.',
                osszefoglaloCim: 'Összefoglaló',
                osszefoglaloUres: 'Ahogy választasz, itt egyben látod majd a foglalásodat.'
            },
            kuponUzenetek: {
                ures: '\u00cdrd be a kuponk\u00f3dot.',
                nincsAktiv: 'Nem tal\u00e1ltam ilyen akt\u00edv kupont.',
                masikSzolgaltatas: 'Ez a kupon nem ehhez a szolg\u00e1ltat\u00e1shoz vagy kateg\u00f3ri\u00e1hoz \u00e9rv\u00e9nyes.',
                szolgaltatasValtozott: 'A v\u00e1lasztott kupon m\u00e1sik szolg\u00e1ltat\u00e1shoz vagy kateg\u00f3ri\u00e1hoz tartozik.',
                ervenyes: '{kod} kupon \u00e9rv\u00e9nyes\u00edtve.',
                ujVendegEmailHiany: 'Ehhez a kuponhoz add meg el\u0151bb az email c\u00edmed, mert csak \u00faj vend\u00e9geknek \u00e9rv\u00e9nyes.',
                ujVendegEmailHibas: 'A kupon ellen\u0151rz\u00e9s\u00e9hez val\u00f3s email c\u00edmet adj meg.',
                ujVendegEllenorzes: 'Kupon ellen\u0151rz\u00e9se email alapj\u00e1n...',
                ujVendegEllenorzesHiba: 'Most nem siker\u00fclt ellen\u0151rizni az \u00faj vend\u00e9g kupont. K\u00e9rlek pr\u00f3b\u00e1ld \u00fajra.',
                ujVendegMarVolt: 'Ez a kupon csak \u00faj vend\u00e9geknek \u00e9rv\u00e9nyes. Ezzel az email c\u00edmmel m\u00e1r volt foglal\u00e1s.',
                ujVendegEmailValtozott: 'Az email c\u00edm m\u00f3dosult, ez\u00e9rt \u00e9rv\u00e9nyes\u00edtsd \u00fajra a kupont.'
            },
            nevPlaceholder: 'Teljes neved',
            telefonPlaceholder: '201234567',
            emailPlaceholder: 'Email címed',
            megjegyzesPlaceholder: 'Megjegyzés, egyedi kérés (opcionális)',
            kuldesGomb: 'Foglalás elküldése',
            lebegoGomb: 'Időpontfoglalás',
            popup: {
                emailSikeresCim: 'Foglalás elküldve',
                emailSikeresSzoveg: 'Köszönöm, megkaptam a foglalásodat. A részletekről visszaigazoló emailt is küldtünk. Kérlek ellenőrizd a spam vagy promóciók mappát is.',
                emailHibaCim: 'Foglalás rögzítve',
                emailHibaSzoveg: 'Köszönöm, a foglalásod bekerült a rendszerbe, de a visszaigazoló email most nem biztos, hogy elment. Ha nem érkezik meg, kérlek írj üzenetet.',
                kezdolapGomb: 'Kezdőlap',
                galeriaGomb: 'Galéria',
                naptarGomb: 'Naptárba mentés',
                bezarasGomb: 'Bezárás',
                messengerGomb: 'Messenger',
                instagramGomb: 'Instagram'
            }
        },
        email: {
            ujFoglalas: {
                targy: 'Lumi Nails foglalásod beérkezett',
                cim: 'Köszönöm a foglalásodat!',
                szoveg: 'Szia {nev}!\n\nMegkaptam az időpontfoglalásodat, az alábbi adatokkal rögzítettük a rendszerben.'
            },
            visszaigazolas: {
                targy: 'Lumi Nails időpontod visszaigazolva',
                cim: 'Időpont visszaigazolva',
                szoveg: 'Szia {nev}!\n\nA foglalásod vissza lett igazolva. Az aktuális részleteket lent találod.'
            },
            visszaigazolasModositva: {
                targy: 'Lumi Nails időpontod visszaigazolva és módosítva',
                cim: 'Időpont visszaigazolva és módosítva',
                szoveg: 'Szia {nev}!\n\nA foglalásod vissza lett igazolva, és az időpont adatai módosultak. Az aktuális részleteket lent találod.'
            },
            idopontModositva: {
                targy: 'Lumi Nails időpontod módosult',
                cim: 'Időpont módosítva',
                szoveg: 'Szia {nev}!\n\nAz időpontod adatai módosultak. Az aktuális részleteket lent találod.'
            },
            lemondas: {
                targy: 'Lumi Nails időpontod lemondva',
                cim: 'Időpont lemondva',
                szoveg: 'Szia {nev}!\n\nA foglalásod lemondásra került. Ha új időpontot szeretnél egyeztetni, kérlek írj üzenetet.'
            },
            fuggoben: {
                targy: 'Lumi Nails foglalásod státusza módosult',
                cim: 'Foglalás státusza módosult',
                szoveg: 'Szia {nev}!\n\nA foglalásod státusza módosult. Az aktuális részleteket lent találod.'
            },
            emlekezteto: {
                targy: 'Emlékeztető: holnap Lumi Nails időpontod van',
                cim: 'Holnap várlak az időpontodon',
                szoveg: 'Szia {nev}!\n\nCsak szeretnélek emlékeztetni, hogy holnap vártalak a foglalt időpontodra. A részleteket lent találod.\n\nHa bármi közbejönne, kérlek írj Instagramon minél hamarabb.'
            },
            ertekelesKeres: {
                targy: 'Köszönöm, hogy nálam jártál',
                cim: 'Köszönöm a bizalmadat',
                szoveg: 'Szia {nev}!\n\nKöszönöm, hogy nálam jártál. Remélem, elégedett vagy a körmeiddel. Ha van egy perced, nagyon sokat segítene, ha írnál egy rövid Google értékelést.\n\nÉrtékelés link: {ertekelesLink}'
            }
        }
    };
}

window.lumiAlapOldalAdatok = lumiAlapOldalAdatok;

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
        const kliens = supabaseLib.createClient(config.url, config.publishableKey);
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
    const kedvezmenyMinta = tiszta.match(/^(.+?kedvezm[e\u00e9]ny)\s+(.+)$/i);
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

function oldalTartalomMegjelenitese() {
    document.body.classList.remove('tartalom-toltes');
}

function menuEsemenyekBekotese() {
    const hamburger = document.querySelector('.hamburger');
    const mobilLinkek = document.querySelectorAll('#mobil-nav a');

    if (hamburger) {
        hamburger.addEventListener('click', menuToggle);
    }

    mobilLinkek.forEach(link => {
        link.addEventListener('click', menuBezarasa);
    });
}

function menuToggle() {
    const menu = document.getElementById('mobil-nav');
    const hamburger = document.querySelector('.hamburger');

    if (menu) {
        menu.classList.toggle('open');
    }

    if (hamburger) {
        hamburger.classList.toggle('open');
    }
}

function menuBezarasa() {
    const menu = document.getElementById('mobil-nav');
    const hamburger = document.querySelector('.hamburger');

    if (menu) {
        menu.classList.remove('open');
    }

    if (hamburger) {
        hamburger.classList.remove('open');
    }
}

function aktivMenuJelolese() {
    const aktualis = normalizaltUtvonal(window.location.pathname);
    const hash = window.location.hash;

    document.querySelectorAll('header nav a').forEach(link => {
        const linkUtvonal = normalizaltUtvonal(new URL(link.href).pathname);
        const szolgaltatasLink = link.hash === '#szolgaltatasok';
        const aktiv = szolgaltatasLink && hash === '#szolgaltatasok'
            ? true
            : !szolgaltatasLink && linkUtvonal === aktualis;

        link.classList.toggle('aktiv', aktiv);
    });
}

function normalizaltUtvonal(utvonal) {
    const htmlOldalak = {
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

    return htmlOldalak[utvonal] || utvonal;
}

function adatokBetoltese() {
    const alap = lumiAlapOldalAdatok();

    return onlineOldalAdatokBetoltese()
        .then(onlineAdatok => {
            if (onlineAdatok) {
                return melyOsszefesules(alap, onlineAdatok);
            }

            return fetch(`/adatok.json?v=${Date.now()}`, { cache: 'no-store' })
                .then(response => response.ok ? response.json() : null)
                .then(jsonAdatok => jsonAdatok ? melyOsszefesules(alap, jsonAdatok) : alap)
                .catch(() => alap);
        });
}

async function onlineOldalAdatokBetoltese() {
    const config = window.LUMI_SUPABASE;
    const supabaseLib = window.supabase;

    if (!config?.url || !config?.publishableKey || !supabaseLib?.createClient) {
        return null;
    }

    try {
        const kliens = supabaseLib.createClient(config.url, config.publishableKey);
        const { data, error } = await kliens
            .from('site_settings')
            .select('value')
            .eq('key', 'site_content')
            .maybeSingle();

        if (error || !data?.value) {
            return null;
        }

        return data.value;
    } catch (_error) {
        return null;
    }
}

function melyOsszefesules(alap, feluliras) {
    if (Array.isArray(alap)) {
        return Array.isArray(feluliras) ? feluliras : alap;
    }

    if (!alap || typeof alap !== 'object') {
        return feluliras ?? alap;
    }

    const eredmeny = { ...alap };
    const plusz = feluliras && typeof feluliras === 'object' ? feluliras : {};

    Object.keys(plusz).forEach(kulcs => {
        eredmeny[kulcs] = melyOsszefesules(alap[kulcs], plusz[kulcs]);
    });

    return eredmeny;
}

function kapcsolatGyorsLinkekNormalizalasa(adatok) {
    if (!adatok) return;
    const kapcsolat = adatok.kapcsolat || (adatok.kapcsolat = {});

    if (!kapcsolat.telefon) kapcsolat.telefon = '+36 20 563 6494';
    if (!kapcsolat.telefonLink) kapcsolat.telefonLink = '+36205636494';
    if (!kapcsolat.email || /@luminails\.hu$/i.test(kapcsolat.email)) kapcsolat.email = 'luminails.xx@gmail.com';
    if (!kapcsolat.smsUzenet) kapcsolat.smsUzenet = 'sms:+36205636494';
    if (!kapcsolat.messenger || kapcsolat.messenger.includes('61576508698202')) {
        kapcsolat.messenger = 'https://m.me/petras.szofi';
    }
}

function oldalAdatokAlkalmazasa(adatok) {
    if (!adatok) {
        return;
    }

    kapcsolatGyorsLinkekNormalizalasa(adatok);
    window.lumiAdatok = adatok;
    fejlecAdatokAlkalmazasa(adatok);
    fooldalAdatokAlkalmazasa(adatok.fooldal);
    arlistaAdatokAlkalmazasa(adatok.arlista);
    galeriaAdatokAlkalmazasa(adatok.galeria);
    foglalasAdatokAlkalmazasa(adatok.foglalas, adatok.arlista);
    lablecAdatokAlkalmazasa(adatok);
    seoAdatokAlkalmazasa(adatok.seo);
}

function fejlecAdatokAlkalmazasa(adatok) {
    const marka = adatok?.marka;
    const navigacio = adatok?.navigacio;
    szovegBeallitasa('header .logo', marka?.nev);
    document.querySelectorAll('header .logo').forEach(link => {
        link.setAttribute('aria-label', `${marka?.nev || 'Lumi Nails'} kezdőlap`);
    });

    const linkek = [
        ['a[href="/"]', navigacio?.kezdolap],
        ['a[href="/#szolgaltatasok"]', navigacio?.szolgaltatasok],
        ['a[href="/arlista/"]', navigacio?.arlista],
        ['a[href="/galeria/"]', navigacio?.galeria],
        ['a[href="/foglalas/"]', navigacio?.foglalas]
    ];
    ['header .menu-pontok', '#mobil-nav'].forEach(gyokerSelector => {
        const gyoker = document.querySelector(gyokerSelector);
        if (!gyoker) return;
        linkek.forEach(([selector, felirat]) => szovegBeallitasa(selector, felirat, gyoker));
    });
}

function galeriaAdatokAlkalmazasa(galeria) {
    const szekcio = document.querySelector('.galeria-oldal');
    const racs = szekcio?.querySelector('.galeria-racs');
    if (!szekcio || !galeria || !racs) return;

    szovegBeallitasa('h2', galeria.cim, szekcio);
    szovegBeallitasa('.szekcio-leiras', galeria.leiras, szekcio);
    szovegBeallitasa('a.gomb[href*="foglalas"]', galeria.foglalasGomb, szekcio);

    if (!Array.isArray(galeria.elemek)) return;
    racs.innerHTML = '';
    galeria.elemek.filter(elem => elem?.kep).forEach(elem => {
        const gomb = document.createElement('button');
        gomb.type = 'button';
        gomb.className = `galeria-kep-gomb${elem.magas ? ' magas' : ''}`;
        gomb.dataset.src = elem.kep;
        gomb.dataset.alt = elem.kepAlt || 'Lumi Nails köröm munka';
        const kep = document.createElement('img');
        kep.src = elem.eloKep || elem.kep;
        kep.alt = elem.kepAlt || 'Lumi Nails köröm munka';
        kep.loading = 'lazy';
        gomb.appendChild(kep);
        racs.appendChild(gomb);
    });
}

function seoAdatokAlkalmazasa(seo) {
    if (!seo || window.location.pathname !== '/' && !window.location.pathname.endsWith('/index.html')) return;
    if (seo.fooldalCim) document.title = seo.fooldalCim;
    const description = document.querySelector('meta[name="description"]');
    if (description && seo.fooldalLeiras) description.content = seo.fooldalLeiras;
    document.querySelectorAll('meta[property="og:title"]').forEach(meta => {
        if (seo.fooldalCim) meta.content = seo.fooldalCim;
    });
    document.querySelectorAll('meta[property="og:description"]').forEach(meta => {
        if (seo.fooldalLeiras) meta.content = seo.fooldalLeiras;
    });
    document.querySelectorAll('meta[property="og:image"], meta[name="twitter:image"]').forEach(meta => {
        if (seo.megosztasiKep) meta.content = new URL(seo.megosztasiKep, window.location.origin).href;
    });
}

function szovegBeallitasa(selector, ertek, gyoker = document) {
    const elem = gyoker.querySelector(selector);

    if (elem && ertek !== undefined && ertek !== null) {
        elem.textContent = ertek;
    }
}

function htmlSzovegBeallitasa(selector, ertek, gyoker = document) {
    const elem = gyoker.querySelector(selector);

    if (elem && ertek !== undefined && ertek !== null) {
        elem.innerHTML = sortoresesSzoveg(ertek);
    }
}

function sortoresesSzoveg(ertek) {
    const div = document.createElement('div');
    div.textContent = ertek;
    return div.innerHTML.replace(/\n/g, '<br>');
}

function html(ertek) {
    const div = document.createElement('div');
    div.textContent = ertek ?? '';
    return div.innerHTML;
}

function attr(ertek) {
    return html(ertek).replace(/"/g, '&quot;');
}

function fooldalAdatokAlkalmazasa(fooldal) {
    if (!fooldal) {
        return;
    }

    szovegBeallitasa('.hero-kicker', fooldal.hero?.kicker);
    szovegBeallitasa('.hero-content h1', fooldal.hero?.cim);
    szovegBeallitasa('.hero-content p', fooldal.hero?.leiras);
    const hero = document.getElementById('hero');
    if (hero && fooldal.hero?.kep) {
        hero.style.backgroundImage = `linear-gradient(90deg, rgba(253, 244, 226, 0.12) 0%, rgba(253, 244, 226, 0.02) 44%, rgba(43, 37, 33, 0.05) 100%), url("/kepek/hero-hullamos.jpg")`;
        if (fooldal.hero.kepAlt) hero.setAttribute('aria-label', fooldal.hero.kepAlt);
        hero.setAttribute('role', 'img');
    }

    szovegBeallitasa('.bemutatkozas-szoveg h2', fooldal.bemutatkozas?.cim);
    bekezdesekRenderelese('.bemutatkozas-szoveg', fooldal.bemutatkozas?.bekezdesek);
    kepBeallitasa('.bemutatkozas-kep img', fooldal.bemutatkozas?.kep, fooldal.bemutatkozas?.kepAlt);

    szolgaltatasKartyakRenderelese(fooldal.szolgaltatasok);
    galeriaAtvezetoAlkalmazasa(fooldal.galeriaAtvezeto);
    foglalasAtvezetoAlkalmazasa(fooldal.foglalasAtvezeto);
}

function bekezdesekRenderelese(selector, bekezdesek) {
    const kontener = document.querySelector(selector);
    const cim = kontener?.querySelector('h2');

    if (!kontener || !Array.isArray(bekezdesek)) {
        return;
    }

    kontener.querySelectorAll('p').forEach(p => p.remove());
    bekezdesek.forEach(szoveg => {
        const p = document.createElement('p');
        p.textContent = szoveg;
        kontener.appendChild(p);
    });

    if (cim && cim.parentElement !== kontener) {
        kontener.prepend(cim);
    }
}

function kepBeallitasa(selector, src, alt) {
    const kep = document.querySelector(selector);

    if (!kep) {
        return;
    }

    if (src) kep.src = src;
    if (alt) kep.alt = alt;
}

function szolgaltatasKartyakRenderelese(szolgaltatasok) {
    const szekcio = document.getElementById('szolgaltatasok');
    const racs = szekcio?.querySelector('.bento-racs');

    if (!szekcio || !racs || !Array.isArray(szolgaltatasok?.kartyak)) {
        return;
    }

    szovegBeallitasa('h2', szolgaltatasok.cim, szekcio);
    szovegBeallitasa('.szolgaltatas-arlista-gomb', szolgaltatasok.arlistaGomb, szekcio);
    racs.innerHTML = '';

    szolgaltatasok.kartyak.forEach(kartya => {
        const doboz = document.createElement('div');
        doboz.className = `bento-kartya${kartya.szeles ? ' szeles' : ''}`;

        const cim = document.createElement('h3');
        cim.textContent = kartya.cim || '';

        const leiras = document.createElement('p');
        leiras.innerHTML = sortoresesSzoveg(kartya.leiras || '');

        doboz.append(cim, leiras);
        racs.appendChild(doboz);
    });
}

function galeriaAtvezetoAlkalmazasa(galeria) {
    const szekcio = document.getElementById('galeria-atvezeto');

    if (!szekcio || !galeria) {
        return;
    }

    szovegBeallitasa('.galeria-atvezeto-szoveg h2', galeria.cim);
    szovegBeallitasa('.galeria-atvezeto-szoveg .szekcio-leiras', galeria.leiras);
    szovegBeallitasa('.galeria-atvezeto-szoveg .gomb', galeria.gombSzoveg);

    const kepek = szekcio.querySelectorAll('.galeria-atvezeto-kepek img');
    (galeria.kepek || []).forEach((kep, index) => {
        if (!kepek[index]) {
            return;
        }

        if (kep.src) kepek[index].src = kep.src;
        if (kep.alt) kepek[index].alt = kep.alt;
    });
}

function foglalasAtvezetoAlkalmazasa(foglalasAtvezeto) {
    const szekcio = document.getElementById('kapcsolat');

    if (!szekcio || !foglalasAtvezeto) {
        return;
    }

    szovegBeallitasa('h2', foglalasAtvezeto.cim, szekcio);
    szovegBeallitasa('.szekcio-leiras', foglalasAtvezeto.leiras, szekcio);
    szovegBeallitasa('.gomb', foglalasAtvezeto.gombSzoveg, szekcio);
}

function arlistaAdatokAlkalmazasa(arlista) {
    const szekcio = document.querySelector('.arlista-oldal');
    const panel = szekcio?.querySelector('.arlista-panel');

    if (!szekcio || !arlista) {
        return;
    }

    szovegBeallitasa('h2', arlista.cim, szekcio);
    szovegBeallitasa('.szekcio-leiras', arlista.leiras, szekcio);

    if (!panel || !Array.isArray(arlista.csoportok)) {
        return;
    }

    panel.innerHTML = '';

    const felsoCsoportok = arlista.csoportok.slice(0, 2);
    const alsoCsoportok = arlista.csoportok.slice(2);

    if (felsoCsoportok.length) {
        const ketOszlop = document.createElement('div');
        ketOszlop.className = 'arlista-ket-oszlop';
        felsoCsoportok.forEach(csoport => ketOszlop.appendChild(arlistaCsoportLetrehozasa(csoport)));
        panel.appendChild(ketOszlop);
    }

    alsoCsoportok.forEach(csoport => panel.appendChild(arlistaCsoportLetrehozasa(csoport)));

    if (arlista.megjegyzes) {
        const megjegyzes = document.createElement('p');
        megjegyzes.className = 'arlista-megjegyzes';
        megjegyzes.textContent = arlista.megjegyzes;
        panel.appendChild(megjegyzes);
    }
}

function arlistaCsoportLetrehozasa(csoport) {
    const doboz = document.createElement('div');
    doboz.className = 'arlista-csoport';

    const cim = document.createElement('h3');
    cim.textContent = csoport.cim || '';
    doboz.appendChild(cim);

    (csoport.tetelek || []).forEach(tetel => {
        const sor = document.createElement('div');
        sor.className = 'arlista-sor';

        const nev = document.createElement('span');
        nev.textContent = tetel.nev || '';

        const reszlet = document.createElement('strong');
        const ar = document.createElement('span');
        ar.className = 'arlista-ar';
        ar.textContent = tetel.ar || '';

        reszlet.appendChild(ar);

        const idoSzoveg = idoMegjelenitese(tetel);

        if (idoSzoveg) {
            const ido = document.createElement('span');
            ido.className = 'arlista-ido';
            ido.textContent = idoSzoveg;
            reszlet.appendChild(ido);
        }

        sor.append(nev, reszlet);
        doboz.appendChild(sor);
    });

    return doboz;
}

function foglalasAdatokAlkalmazasa(foglalas, arlista) {
    if (!foglalas) {
        return;
    }

    const urlap = document.querySelector('.urlap-kontener');
    const supabaseFoglalas = document.body.dataset.bookingMode === 'supabase';

    if (urlap) {
        const szekcio = urlap.closest('section');

        if (supabaseFoglalas) {
            supabaseFoglalasSzovegekAlkalmazasa(foglalas);
        } else {
            szovegBeallitasa('h2', foglalas.cim, szekcio);
            htmlSzovegBeallitasa('.urlap-leiras', foglalas.leiras, szekcio);
            foglalasiSzolgaltatasokRenderelese(arlistaSzolgaltatasokLetrehozasa(arlista));
            szovegBeallitasa('.popup-gomb[href*="m.me"]', foglalas.popup?.messengerGomb);
            szovegBeallitasa('.popup-gomb[href*="ig.me"]', foglalas.popup?.instagramGomb);
        }

        szovegBeallitasa('#foglalas-kuldes', foglalas.kuldesGomb, szekcio);
        const nevMezo = szekcio.querySelector('#foglalas-nev');
        const telefonMezo = szekcio.querySelector('#foglalas-tel');
        const emailMezo = szekcio.querySelector('#foglalas-email');
        const megjegyzesMezo = szekcio.querySelector('#foglalas-komment');
        if (nevMezo && foglalas.nevPlaceholder) nevMezo.placeholder = foglalas.nevPlaceholder;
        if (telefonMezo && foglalas.telefonPlaceholder) telefonMezo.placeholder = foglalas.telefonPlaceholder;
        if (emailMezo && foglalas.emailPlaceholder) emailMezo.placeholder = foglalas.emailPlaceholder;
        if (megjegyzesMezo && foglalas.megjegyzesPlaceholder) megjegyzesMezo.placeholder = foglalas.megjegyzesPlaceholder;
        szovegBeallitasa('.popup-cim', foglalas.popup?.emailSikeresCim);
        htmlSzovegBeallitasa('.popup-szoveg', foglalas.popup?.emailSikeresSzoveg);
        szovegBeallitasa('#popup-bezaras', foglalas.popup?.bezarasGomb);
        szovegBeallitasa('.popup-gomb[href="/"]', foglalas.popup?.kezdolapGomb);
        szovegBeallitasa('.popup-gomb[href="/galeria/"]', foglalas.popup?.galeriaGomb);
        szovegBeallitasa('#naptar-link', foglalas.popup?.naptarGomb);
    }

    szovegBeallitasa('#lebego-foglalas-gomb', foglalas.lebegoGomb);
}

function supabaseFoglalasSzovegekAlkalmazasa(foglalas) {
    const oldal = foglalas.oldal || {};

    szovegBeallitasa('.foglalas-nyito .foglalas-kicker', oldal.nyitoKicker);
    szovegBeallitasa('#foglalas-cim', oldal.nyitoCim);
    htmlSzovegBeallitasa('.foglalas-nyito .urlap-leiras', oldal.nyitoLeiras);

    foglalasUtSzovegAlkalmazasa('[data-booking-contact="instagram"]', oldal.utak?.instagram);
    foglalasUtSzovegAlkalmazasa('[data-booking-contact="messenger"]', oldal.utak?.messenger);
    foglalasUtSzovegAlkalmazasa('[data-booking-contact="sms"]', oldal.utak?.sms);
    foglalasUtSzovegAlkalmazasa('[data-booking-path="online"]', oldal.utak?.online);

    szovegBeallitasa('.foglalas-asszisztens-fej .foglalas-kicker', oldal.onlineKicker);
    szovegBeallitasa('#online-foglalas-cim', oldal.onlineCim);
    htmlSzovegBeallitasa('.foglalas-asszisztens-fej p:not(.foglalas-kicker)', oldal.onlineLeiras);

    (oldal.lepesek || []).forEach((lepes, index) => {
        const selector = `[data-step="${index + 1}"] .foglalas-lepes-fej`;
        szovegBeallitasa(`${selector} h3`, lepes?.cim);
        htmlSzovegBeallitasa(`${selector} p`, lepes?.leiras);
    });

    document.querySelectorAll('.foglalas-stilus-kartya').forEach((kartya, index) => {
        const stilus = oldal.stilusok?.[index];
        if (!stilus) return;
        szovegBeallitasa('span', stilus.cim, kartya);
        htmlSzovegBeallitasa('small', stilus.leiras, kartya);
    });

    htmlSzovegBeallitasa('#foglalas-stilus-tipp', oldal.stilusTipp);
    szovegBeallitasa('.foglalas-kepfeltoltes strong', oldal.kepFeltoltesCim);
    htmlSzovegBeallitasa('.foglalas-kepfeltoltes small', oldal.kepFeltoltesLeiras);
    szovegBeallitasa('#foglalas-osszefoglalo h3', oldal.osszefoglaloCim);
    htmlSzovegBeallitasa('#foglalas-osszefoglalo p', oldal.osszefoglaloUres);
}

function foglalasUtSzovegAlkalmazasa(selector, adatok) {
    if (!adatok) return;
    const kartya = document.querySelector(selector);
    if (!kartya) return;

    szovegBeallitasa('.foglalas-ut-cim', adatok.cim, kartya);
    htmlSzovegBeallitasa('.foglalas-ut-leiras', adatok.leiras, kartya);
    szovegBeallitasa('.foglalas-ut-gomb', adatok.gomb, kartya);
}

function arlistaSzolgaltatasokLetrehozasa(arlista) {
    if (!Array.isArray(arlista?.csoportok)) {
        return [];
    }

    return arlista.csoportok.flatMap(csoport => {
        return (csoport.tetelek || [])
            .filter(tetel => tetel.foglalasban !== false)
            .map(tetel => ({
                nev: `${csoport.cim} - ${tetel.nev}`,
                ido: idoMegjelenitese(tetel)
            }));
    });
}

function idoMegjelenitese(tetel) {
    const { ora, perc, vanIdo } = idoSzamok(tetel);

    if (!vanIdo) {
        return '';
    }

    const reszek = [];

    if (ora > 0) {
        reszek.push(`${ora} óra`);
    }

    if (perc > 0) {
        reszek.push(`${perc} perc`);
    }

    return reszek.join(' ');
}

function idoSzamok(tetel) {
    if (tetel.idoOra !== undefined || tetel.idoPerc !== undefined) {
        const oraUres = tetel.idoOra === '' || tetel.idoOra === null || tetel.idoOra === undefined;
        const percUres = tetel.idoPerc === '' || tetel.idoPerc === null || tetel.idoPerc === undefined;
        return {
            ora: pozitivEgesz(tetel.idoOra),
            perc: pozitivEgesz(tetel.idoPerc),
            vanIdo: !oraUres || !percUres
        };
    }

    if (!tetel.ido || !tetel.ido.trim()) {
        return { ora: 0, perc: 0, vanIdo: false };
    }

    return {
        ora: pozitivEgesz((tetel.ido.match(/(\d+)\s*óra/i) || [])[1]),
        perc: pozitivEgesz((tetel.ido.match(/(\d+)\s*perc/i) || [])[1]),
        vanIdo: true
    };
}

function pozitivEgesz(ertek) {
    const szam = Number.parseInt(ertek, 10);
    return Number.isFinite(szam) && szam > 0 ? szam : 0;
}

function foglalasiSzolgaltatasokRenderelese(szolgaltatasok) {
    const select = document.getElementById('foglalas-szolgatatas');

    if (!select || !Array.isArray(szolgaltatasok)) {
        return;
    }

    select.innerHTML = '';

    const alap = document.createElement('option');
    alap.value = '';
    alap.disabled = true;
    alap.selected = true;
    alap.textContent = 'Válassz szolgáltatást...';
    select.appendChild(alap);

    szolgaltatasok.forEach(szolgaltatas => {
        const option = document.createElement('option');
        const ido = szolgaltatas.ido ? ` - ${szolgaltatas.ido}` : '';
        option.value = `${szolgaltatas.nev}${ido}`;
        option.textContent = `${szolgaltatas.nev}${ido}`;
        select.appendChild(option);
    });
}

async function onlineArlistaBetoltese() {
    const panel = document.querySelector('.arlista-oldal .arlista-panel');
    const config = window.LUMI_SUPABASE;
    const supabaseLib = window.supabase;

    if (!panel || !config?.url || !config?.publishableKey || !supabaseLib?.createClient) {
        return;
    }

    try {
        const kliens = supabaseLib.createClient(config.url, config.publishableKey);
        let { data, error } = await kliens
            .from('services')
            .select('name,price_text,price_amount,price_unit,price_suffix,duration_minutes,active,sort_order')
            .eq('active', true)
            .order('sort_order', { ascending: true });

        if (error && adatbazisOszlopHiany(error, ['price_amount', 'price_unit', 'price_suffix'])) {
            ({ data, error } = await kliens
                .from('services')
                .select('name,price_text,duration_minutes,active,sort_order')
                .eq('active', true)
                .order('sort_order', { ascending: true }));
        }

        if (error || !Array.isArray(data) || data.length === 0) {
            return;
        }

        arlistaSzolgaltatasokRenderelese(data.map(szolgaltatasArNormalizalasa));
    } catch (_error) {
        // Ha a Supabase nem elerheto, a statikus arlista marad lathato.
    }
}

function arlistaSzolgaltatasokRenderelese(szolgaltatasok) {
    const panel = document.querySelector('.arlista-oldal .arlista-panel');

    if (!panel) {
        return;
    }

    const csoportok = new Map();

    szolgaltatasok.forEach(szolgaltatas => {
        const { csoport, nev } = arlistaNevBontasa(szolgaltatas.name || '');

        if (!csoportok.has(csoport)) {
            csoportok.set(csoport, []);
        }

        csoportok.get(csoport).push({
            nev,
            ar: szolgaltatasArFelirat(szolgaltatas),
            ido: szolgaltatas.duration_minutes > 0 ? idotartamSzoveg(szolgaltatas.duration_minutes) : ''
        });
    });

    panel.innerHTML = '';

    const felsoCsoportNevek = Array.from(csoportok.keys()).slice(0, 2);
    const alsoCsoportNevek = Array.from(csoportok.keys()).slice(2);

    if (felsoCsoportNevek.length) {
        const ketOszlop = document.createElement('div');
        ketOszlop.className = 'arlista-ket-oszlop';
        felsoCsoportNevek.forEach(csoportNev => {
            ketOszlop.appendChild(onlineArlistaCsoportLetrehozasa(csoportNev, csoportok.get(csoportNev)));
        });
        panel.appendChild(ketOszlop);
    }

    alsoCsoportNevek.forEach(csoportNev => {
        panel.appendChild(onlineArlistaCsoportLetrehozasa(csoportNev, csoportok.get(csoportNev)));
    });
}

function arlistaNevBontasa(teljesNev) {
    const reszek = teljesNev.split(' - ');

    if (reszek.length < 2) {
        return { csoport: 'Szolgáltatások', nev: teljesNev };
    }

    return {
        csoport: reszek[0],
        nev: reszek.slice(1).join(' - ')
    };
}

function onlineArlistaCsoportLetrehozasa(cim, tetelek) {
    const doboz = document.createElement('div');
    doboz.className = 'arlista-csoport';

    const cimsor = document.createElement('h3');
    cimsor.textContent = cim;
    doboz.appendChild(cimsor);

    tetelek.forEach(tetel => {
        const sor = document.createElement('div');
        sor.className = 'arlista-sor';

        const nev = document.createElement('span');
        nev.textContent = tetel.nev;

        const reszlet = document.createElement('strong');
        const ar = document.createElement('span');
        ar.className = 'arlista-ar';
        ar.textContent = tetel.ar;
        reszlet.appendChild(ar);

        if (tetel.ido) {
            const ido = document.createElement('span');
            ido.className = 'arlista-ido';
            ido.textContent = tetel.ido;
            reszlet.appendChild(ido);
        }

        sor.append(nev, reszlet);
        doboz.appendChild(sor);
    });

    return doboz;
}

function idotartamSzoveg(percek) {
    const osszesPerc = Number(percek) || 0;
    const ora = Math.floor(osszesPerc / 60);
    const perc = osszesPerc % 60;
    const reszek = [];

    if (ora > 0) {
        reszek.push(`${ora} óra`);
    }

    if (perc > 0) {
        reszek.push(`${perc} perc`);
    }

    return reszek.join(' ');
}

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
        const kliens = supabaseLib.createClient(config.url, config.publishableKey);
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
    gomb.className = 'lebego-foglalas-gomb';
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

function galeriaBekotese() {
    const galeriaGombok = Array.from(document.querySelectorAll('.galeria-kep-gomb'));
    const lightbox = document.getElementById('galeria-lightbox');

    if (galeriaGombok.length === 0 || !lightbox) {
        return;
    }

    galeriaKepek = galeriaGombok.map(gomb => ({
        src: gomb.dataset.src,
        alt: gomb.dataset.alt || ''
    }));

    galeriaGombok.forEach((gomb, index) => {
        gomb.addEventListener('click', () => galeriaMegnyitasa(index));
    });

    lightbox.querySelector('.galeria-lightbox-bezar').addEventListener('click', galeriaBezarasa);
    lightbox.querySelector('.galeria-lightbox-elozo').addEventListener('click', () => galeriaLepes(-1));
    lightbox.querySelector('.galeria-lightbox-kovetkezo').addEventListener('click', () => galeriaLepes(1));

    lightbox.addEventListener('click', event => {
        if (event.target === lightbox) {
            galeriaBezarasa();
        }
    });

    if (window.PointerEvent) {
        lightbox.addEventListener('pointerdown', galeriaPointerHuzasKezdete);
        lightbox.addEventListener('pointerup', galeriaPointerHuzasVege);
        lightbox.addEventListener('pointercancel', galeriaPointerHuzasMegszakitas);
    } else {
        lightbox.addEventListener('touchstart', galeriaHuzasKezdete, { passive: true });
        lightbox.addEventListener('touchend', galeriaHuzasVege);
    }

    document.addEventListener('keydown', event => {
        if (!lightbox.classList.contains('nyitva')) {
            return;
        }

        if (event.key === 'Escape') galeriaBezarasa();
        if (event.key === 'ArrowLeft') galeriaLepes(-1);
        if (event.key === 'ArrowRight') galeriaLepes(1);
    });
}

function galeriaMegnyitasa(index) {
    galeriaAktualisIndex = index;
    galeriaKepFrissitese();

    const lightbox = document.getElementById('galeria-lightbox');
    lightbox.classList.add('nyitva');
    lightbox.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
}

function galeriaBezarasa() {
    const lightbox = document.getElementById('galeria-lightbox');

    if (!lightbox) {
        return;
    }

    lightbox.classList.remove('nyitva');
    lightbox.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
}

function galeriaLepes(irany) {
    galeriaAktualisIndex = (galeriaAktualisIndex + irany + galeriaKepek.length) % galeriaKepek.length;
    galeriaKepFrissitese();
}

function galeriaHuzasKezdete(event) {
    const erintes = event.changedTouches[0];
    galeriaHuzasKezdoX = erintes.clientX;
    galeriaHuzasKezdoY = erintes.clientY;
}

function galeriaHuzasVege(event) {
    const erintes = event.changedTouches[0];
    galeriaHuzasEldontese(erintes.clientX, erintes.clientY);
}

function galeriaPointerHuzasKezdete(event) {
    if (event.button !== 0 || event.target.closest('button')) {
        return;
    }

    galeriaHuzasAktiv = true;
    galeriaHuzasKezdoX = event.clientX;
    galeriaHuzasKezdoY = event.clientY;
}

function galeriaPointerHuzasVege(event) {
    if (!galeriaHuzasAktiv) {
        return;
    }

    galeriaHuzasAktiv = false;
    galeriaHuzasEldontese(event.clientX, event.clientY);
}

function galeriaPointerHuzasMegszakitas() {
    galeriaHuzasAktiv = false;
}

function galeriaHuzasEldontese(vegX, vegY) {
    const lightbox = document.getElementById('galeria-lightbox');

    if (!lightbox || !lightbox.classList.contains('nyitva')) {
        return;
    }

    const deltaX = vegX - galeriaHuzasKezdoX;
    const deltaY = vegY - galeriaHuzasKezdoY;
    const elegHosszuHuzas = Math.abs(deltaX) > 55;
    const inkabbVizszintes = Math.abs(deltaX) > Math.abs(deltaY) * 1.2;

    if (!elegHosszuHuzas || !inkabbVizszintes) {
        return;
    }

    galeriaLepes(deltaX < 0 ? 1 : -1);
}

function galeriaKepFrissitese() {
    const lightboxKep = document.querySelector('#galeria-lightbox img');
    const kep = galeriaKepek[galeriaAktualisIndex];

    if (!lightboxKep || !kep) {
        return;
    }

    lightboxKep.src = kep.src;
    lightboxKep.alt = kep.alt;
}

function lebegoFoglalasFigyeles() {
    const lebegoGomb = document.getElementById('lebego-foglalas-gomb');
    const foglalasGombok = Array.from(document.querySelectorAll('a.gomb[href*="foglalas"]'))
        .filter(gomb => gomb.id !== 'lebego-foglalas-gomb');
    const footer = document.querySelector('.site-footer');
    const figyeltElemek = footer ? [...foglalasGombok, footer] : foglalasGombok;

    if (!lebegoGomb || figyeltElemek.length === 0) {
        return;
    }

    const lathatoElemek = new Set();
    const lathatosagFigyelo = new IntersectionObserver(function (entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                lathatoElemek.add(entry.target);
            } else {
                lathatoElemek.delete(entry.target);
            }
        });

        lebegoGomb.classList.toggle('rejtve', lathatoElemek.size > 0);
    }, {
        rootMargin: '0px 0px 96px 0px',
        threshold: 0.01
    });

    figyeltElemek.forEach(elem => lathatosagFigyelo.observe(elem));
}

function foglalasInditasa() {
    const nev = document.getElementById('foglalas-nev').value.trim();
    const telReszlet = document.getElementById('foglalas-tel').value.trim();
    const szolgatatas = document.getElementById('foglalas-szolgatatas').value;
    const datum = document.getElementById('foglalas-datum').value;
    const ido = document.getElementById('foglalas-ido').value;
    const komment = document.getElementById('foglalas-komment').value.trim();

    if (!nev || !telReszlet || !szolgatatas || !datum || !ido) {
        alert('Kérlek tölts ki minden kötelező mezőt a folytatáshoz!');
        return;
    }

    if (telReszlet.length !== 9) {
        alert('Kérlek 9 számjegyű magyar mobilszámot adj meg, országkód nélkül. Példa: 301234567');
        return;
    }

    if (datum < maiDatum()) {
        alert('Múltbeli dátumra nem lehet időpontot kérni.');
        return;
    }

    const teljesTelefon = `+36 ${telReszlet}`;
    const uzenet = `Szia! Szeretnék időpontot foglalni.\n\nNév: ${nev}\nTelefon: ${teljesTelefon}\nSzolgáltatás: ${szolgatatas}\nDátum: ${datum} - ${ido} óra\nMegjegyzés: ${komment ? komment : '-'}\n\nKérlek jelezz vissza, hogy megfelel-e.\nKöszönöm!`;

    uzenetMasolasa(uzenet).then(sikeresMasolas => {
        popupMegnyitasa(sikeresMasolas, uzenet);
    });
}

function uzenetMasolasa(uzenet) {
    if (navigator.clipboard && window.isSecureContext) {
        return navigator.clipboard.writeText(uzenet)
            .then(() => true)
            .catch(() => tartalekMasolas(uzenet));
    }

    return Promise.resolve(tartalekMasolas(uzenet));
}

function tartalekMasolas(uzenet) {
    const textarea = document.createElement('textarea');
    textarea.value = uzenet;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();

    let sikeres = false;

    try {
        sikeres = document.execCommand('copy');
    } catch (err) {
        sikeres = false;
    }

    document.body.removeChild(textarea);
    return sikeres;
}

function popupMegnyitasa(sikeresMasolas, uzenet) {
    const popup = document.getElementById('sikeres-popup');
    const popupCim = popup.querySelector('.popup-cim');
    const popupSzoveg = popup.querySelector('.popup-szoveg');
    const popupUzenet = document.getElementById('popup-uzenet');
    const popupAdatok = window.lumiAdatok?.foglalas?.popup || {};

    if (sikeresMasolas) {
        popupCim.textContent = popupAdatok.emailSikeresCim || 'Adatok másolva!';
        popupSzoveg.innerHTML = sortoresesSzoveg(popupAdatok.emailSikeresSzoveg || 'A foglalás adatai előkészítve.');
        popupUzenet.classList.remove('lathato');
        popupUzenet.value = '';
    } else {
        popupCim.textContent = popupAdatok.emailHibaCim || 'Foglalás rögzítve';
        popupSzoveg.innerHTML = sortoresesSzoveg(popupAdatok.emailHibaSzoveg || 'A foglalás bekerült a rendszerbe, de az email értesítést ellenőrizni kell.');
        popupUzenet.value = uzenet;
        popupUzenet.classList.add('lathato');
        setTimeout(() => popupUzenet.select(), 100);
    }

    popup.style.display = 'flex';
}

function popupBezarasa() {
    document.getElementById('sikeres-popup').style.display = 'none';
}
