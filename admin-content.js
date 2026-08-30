(function () {
    const MAX_FILE_SIZE = 12 * 1024 * 1024;
    const IMAGE_UPLOAD_FULL_MAX_SIDE = 1600;
    const IMAGE_UPLOAD_FULL_MAX_BYTES = 480 * 1024;
    const IMAGE_UPLOAD_FULL_QUALITY = 0.82;
    const IMAGE_UPLOAD_PREVIEW_MAX_SIDE = 720;
    const IMAGE_UPLOAD_PREVIEW_MAX_BYTES = 110 * 1024;
    const IMAGE_UPLOAD_PREVIEW_QUALITY = 0.76;
    const IMAGE_UPLOAD_MIN_QUALITY = 0.56;
    const BUCKET = window.LUMI_MEDIA_BUCKET || 'site-media';
    const GALLERY_SELECTIONS = {
        home: {
            path: 'fooldal.galeriaAtvezeto.kivalasztottKepek',
            limit: 5,
            countSelector: '.cms-gallery-selection-count',
            countText: darab => `${darab} / 5 kép jelenik meg a főoldalon`,
            statusText: darab => `${darab} kép kiválasztva a főoldali galériaátvezetőhöz.`
        },
        nailArt: {
            path: 'szolgaltatasOldalak.nailArt.kivalasztottKepek',
            limit: 4,
            countSelector: '.cms-gallery-nail-art-selection-count',
            countText: darab => `${darab} / 4 kép jelenik meg a Nail Art oldalon`,
            statusText: darab => `${darab} kép kiválasztva a Nail Art oldalhoz.`
        }
    };
    const config = window.LUMI_SUPABASE;
    const supabaseLib = window.supabase;
    const state = {
        client: null,
        content: null,
        session: null,
        dirty: false,
        saving: false,
        cmsView: 'fooldal',
        cmsGroup: 15,
        cmsViewScroll: 0,
        cmsSectionScroll: 0
    };
    let canvasOutputFormatPromise = null;

    const GROUPS = [
        {
            title: 'Márka és navigáció',
            description: 'A fejlécben, a mobilmenüben és a láblécben megjelenő márkanév és menüpontok.',
            fields: [
                field('marka.nev', 'Márkanév'),
                field('navigacio.kezdolap', 'Kezdőlap menüpont'),
                field('navigacio.szolgaltatasok', 'Szolgáltatások menüpont'),
                field('navigacio.arlista', 'Árlista menüpont'),
                field('navigacio.galeria', 'Galéria menüpont'),
                field('navigacio.foglalas', 'Foglalás menüpont'),
                field('navigacio.foglalasom', 'Foglalásom menüpont')
            ]
        },
        {
            title: 'Főoldal – nyitókép (hero)',
            description: 'A főoldal legfelső képes blokkja. Az itt látható kép ugyanaz, amelyet a nyilvános oldal használ.',
            fields: [
                field('fooldal.hero.kicker', 'Kis felső szöveg'),
                field('fooldal.hero.cim', 'Főcím'),
                field('fooldal.hero.leiras', 'Leírás', 'textarea'),
                field('fooldal.hero.gombSzoveg', 'Foglalás gomb szövege'),
                field('fooldal.hero.elonyok.0.kiemeles', '1. előny kiemelt szava'),
                field('fooldal.hero.elonyok.0.szoveg', '1. előny folytatása'),
                field('fooldal.hero.elonyok.1.kiemeles', '2. előny kiemelt szava'),
                field('fooldal.hero.elonyok.1.szoveg', '2. előny folytatása'),
                field('fooldal.hero.elonyok.2.kiemeles', '3. előny kiemelt szava'),
                field('fooldal.hero.elonyok.2.szoveg', '3. előny folytatása'),
                field('fooldal.hero.monogram', 'Képre kerülő monogram'),
                field('fooldal.hero.galeriaCimke', 'Képes blokk címkéje'),
                field('fooldal.hero.galeriaLink', 'Galéria link szövege'),
                image('fooldal.hero.kep', 'Nyitókép'),
                field('fooldal.hero.kepAlt', 'Nyitókép leírása')
            ]
        },
        {
            title: 'Főoldal – bemutatkozás',
            description: 'A főoldali bemutatkozó kép és a rajta megjelenő szöveg.',
            fields: [
                field('fooldal.bemutatkozas.kicker', 'Kis felső szöveg'),
                field('fooldal.bemutatkozas.cim', 'Cím'),
                field('fooldal.bemutatkozas.bekezdesek.0', 'Első bekezdés', 'textarea'),
                field('fooldal.bemutatkozas.bekezdesek.1', 'Második bekezdés', 'textarea'),
                field('fooldal.bemutatkozas.linkSzoveg', 'Foglaláshoz vezető link szövege'),
                field('fooldal.bemutatkozas.jelvenyCim', 'Képjelvény felső sora'),
                field('fooldal.bemutatkozas.jelvenyAlcim', 'Képjelvény alsó sora'),
                image('fooldal.bemutatkozas.kep', 'Bemutatkozó kép'),
                field('fooldal.bemutatkozas.kepAlt', 'Kép leírása')
            ]
        },
        {
            title: 'Főoldal – szolgáltatások',
            description: 'A főoldalon látható négy rövid szolgáltatásleírás. Az árak és időtartamok az Árlista menüben kezelhetők.',
            fields: [
                field('fooldal.szolgaltatasok.kicker', 'Kis felső szöveg'),
                field('fooldal.szolgaltatasok.cim', 'Szekció címe'),
                field('fooldal.szolgaltatasok.leiras', 'Bevezető szöveg', 'textarea'),
                ...cardFields('fooldal.szolgaltatasok.kartyak', 0, '1. kártya'),
                ...cardFields('fooldal.szolgaltatasok.kartyak', 1, '2. kártya'),
                ...cardFields('fooldal.szolgaltatasok.kartyak', 2, '3. kártya'),
                ...cardFields('fooldal.szolgaltatasok.kartyak', 3, '4. kártya')
            ]
        },
        {
            title: 'Főoldal – galéria-előnézet',
            description: 'A főoldali lapozható galériakártyák képei és a hozzájuk tartozó szövegek.',
            fields: [
                field('fooldal.galeriaAtvezeto.kicker', 'Kis felső szöveg'),
                field('fooldal.galeriaAtvezeto.kiemeltCim', 'Nagy cím első sora'),
                field('fooldal.galeriaAtvezeto.kiemeltAkcentus', 'Nagy cím kiemelt sora'),
                field('fooldal.galeriaAtvezeto.metaLeiras', 'Kiemelt cím melletti leírás', 'textarea'),
                field('fooldal.galeriaAtvezeto.belsoKicker', 'Galériakártyák melletti kis szöveg'),
                field('fooldal.galeriaAtvezeto.cim', 'Cím'),
                field('fooldal.galeriaAtvezeto.leiras', 'Leírás', 'textarea'),
                field('fooldal.galeriaAtvezeto.gombSzoveg', 'Gomb szövege')
            ]
        },
        {
            title: 'Főoldal – időpontfoglalási blokk',
            description: 'A főoldal alján, a lábléc előtt látható időpontfoglalási felhívás.',
            fields: [
                field('fooldal.foglalasAtvezeto.kicker', 'Kis felső szöveg'),
                field('fooldal.foglalasAtvezeto.cim', 'Cím'),
                field('fooldal.foglalasAtvezeto.leiras', 'Leírás', 'textarea'),
                field('fooldal.foglalasAtvezeto.gombSzoveg', 'Gomb szövege'),
                field('fooldal.foglalasAtvezeto.megjegyzes', 'Gomb alatti megjegyzés')
            ]
        },
        {
            title: 'Árlista oldal',
            description: 'Az árlista oldal főcíme és bevezető szövege. A konkrét szolgáltatások az admin Árlista menüjében szerkeszthetők.',
            fields: [
                field('arlista.cim', 'Oldal címe'),
                field('arlista.leiras', 'Bevezető szöveg', 'textarea')
            ]
        },
        {
            title: 'Galéria oldal és teljes galéria',
            description: 'A külön Galéria oldal címe, leírása és összes képe. A képeknél külön jelölhető a főoldali átvezető és a Nail Art oldal.',
            fields: [
                field('galeria.cim', 'Oldal címe'),
                field('galeria.leiras', 'Bevezető szöveg', 'textarea'),
                field('galeria.foglalasGomb', 'Foglalás gomb szövege')
            ],
            gallery: true
        },
        {
            title: 'Foglalás – kapcsolatfelvételi lehetőségek',
            description: 'A foglalási oldal bevezetője, valamint az Instagram, Messenger, SMS, online foglalás és foglaláskezelő kártyák.',
            fields: [
                field('foglalas.oldal.nyitoKicker', 'Nyitó kis felső szöveg'),
                field('foglalas.oldal.nyitoCim', 'Nyitó cím'),
                field('foglalas.oldal.nyitoLeiras', 'Nyitó leírás', 'textarea'),
                field('foglalas.oldal.utak.instagram.cim', 'Instagram kártya címe'),
                field('foglalas.oldal.utak.instagram.leiras', 'Instagram kártya szövege', 'textarea'),
                field('foglalas.oldal.utak.instagram.gomb', 'Instagram gomb'),
                field('foglalas.oldal.utak.messenger.cim', 'Messenger kártya címe'),
                field('foglalas.oldal.utak.messenger.leiras', 'Messenger kártya szövege', 'textarea'),
                field('foglalas.oldal.utak.messenger.gomb', 'Messenger gomb'),
                field('foglalas.oldal.utak.sms.cim', 'SMS kártya címe'),
                field('foglalas.oldal.utak.sms.leiras', 'SMS kártya szövege', 'textarea'),
                field('foglalas.oldal.utak.sms.gomb', 'SMS gomb'),
                field('foglalas.oldal.utak.online.cim', 'Online foglalás kártya címe'),
                field('foglalas.oldal.utak.online.leiras', 'Online foglalás kártya szövege', 'textarea'),
                field('foglalas.oldal.utak.online.gomb', 'Online foglalás kártya gomb'),
                field('foglalas.oldal.utak.kezeles.cim', 'Foglaláskezelő kártya címe'),
                field('foglalas.oldal.utak.kezeles.leiras', 'Foglaláskezelő kártya szövege', 'textarea'),
                field('foglalas.oldal.utak.kezeles.gomb', 'Foglaláskezelő kártya gomb')
            ]
        },
        {
            title: 'Foglalás – online űrlap',
            description: 'Az ötlépéses online foglalás címei, magyarázatai, mezőfeliratai és összefoglalója.',
            fields: [
                field('foglalas.oldal.onlineKicker', 'Online rész kis felső szöveg'),
                field('foglalas.oldal.onlineCim', 'Online rész címe'),
                field('foglalas.oldal.onlineLeiras', 'Online rész leírása', 'textarea'),
                field('foglalas.oldal.lepesek.0.cim', '1. lépés címe'),
                field('foglalas.oldal.lepesek.0.leiras', '1. lépés szövege', 'textarea'),
                field('foglalas.oldal.lepesek.1.cim', '2. lépés címe'),
                field('foglalas.oldal.lepesek.1.leiras', '2. lépés szövege', 'textarea'),
                field('foglalas.oldal.stilusok.0.cim', 'Egyszerű stílus címe'),
                field('foglalas.oldal.stilusok.0.leiras', 'Egyszerű stílus szövege'),
                field('foglalas.oldal.stilusok.1.cim', 'Francia stílus címe'),
                field('foglalas.oldal.stilusok.1.leiras', 'Francia stílus szövege'),
                field('foglalas.oldal.stilusok.2.cim', 'Díszítés stílus címe'),
                field('foglalas.oldal.stilusok.2.leiras', 'Díszítés stílus szövege'),
                field('foglalas.oldal.stilusTipp', 'Stílus tipp szövege', 'textarea'),
                field('foglalas.oldal.lepesek.2.cim', '3. lépés címe'),
                field('foglalas.oldal.lepesek.2.leiras', '3. lépés szövege', 'textarea'),
                field('foglalas.oldal.lepesek.3.cim', '4. lépés címe'),
                field('foglalas.oldal.lepesek.3.leiras', '4. lépés szövege', 'textarea'),
                field('foglalas.oldal.kepFeltoltesCim', 'Képfeltöltés címe'),
                field('foglalas.oldal.kepFeltoltesLeiras', 'Képfeltöltés leírása', 'textarea'),
                field('foglalas.megjegyzesPlaceholder', 'Megjegyzés mező placeholder', 'textarea'),
                field('foglalas.oldal.lepesek.4.cim', '5. lépés címe'),
                field('foglalas.oldal.lepesek.4.leiras', '5. lépés szövege', 'textarea'),
                field('foglalas.nevPlaceholder', 'Név mező placeholder'),
                field('foglalas.telefonPlaceholder', 'Telefon mező placeholder'),
                field('foglalas.emailPlaceholder', 'Email mező placeholder'),
                field('foglalas.oldal.osszefoglaloCim', 'Összefoglaló címe'),
                field('foglalas.oldal.osszefoglaloUres', 'Összefoglaló üres szövege', 'textarea')
            ]
        },
        {
            title: 'Foglalás – kuponüzenetek',
            description: 'A kupon ellenőrzésekor a vendégnek megjelenő sikeres és hibás visszajelzések.',
            fields: [
                field('foglalas.kuponUzenetek.ures', 'Kupon üzenet: üres mező'),
                field('foglalas.kuponUzenetek.nincsAktiv', 'Kupon üzenet: nincs ilyen aktív kupon'),
                field('foglalas.kuponUzenetek.masikSzolgaltatas', 'Kupon üzenet: másik szolgáltatáshoz tartozik', 'textarea'),
                field('foglalas.kuponUzenetek.szolgaltatasValtozott', 'Kupon üzenet: szolgáltatás váltás után', 'textarea'),
                field('foglalas.kuponUzenetek.ervenyes', 'Kupon üzenet: sikeres érvényesítés ({kod})'),
                field('foglalas.kuponUzenetek.ujVendegEmailHiany', 'Kupon \u00fczenet: \u00faj vend\u00e9g email hi\u00e1nyzik', 'textarea'),
                field('foglalas.kuponUzenetek.ujVendegEmailHibas', 'Kupon \u00fczenet: hib\u00e1s email', 'textarea'),
                field('foglalas.kuponUzenetek.ujVendegEllenorzes', 'Kupon \u00fczenet: \u00faj vend\u00e9g ellen\u0151rz\u00e9s'),
                field('foglalas.kuponUzenetek.ujVendegEllenorzesHiba', 'Kupon \u00fczenet: ellen\u0151rz\u00e9si hiba', 'textarea'),
                field('foglalas.kuponUzenetek.ujVendegMarVolt', 'Kupon \u00fczenet: m\u00e1r volt foglal\u00e1s', 'textarea'),
                field('foglalas.kuponUzenetek.ujVendegEmailValtozott', 'Kupon \u00fczenet: email v\u00e1ltozott', 'textarea')
            ]
        },
        {
            title: 'Foglalás – gombok és visszajelző ablak',
            description: 'A foglalás elküldése, a sikeres visszajelző ablak, valamint a foglalás ellenőrzésének és lemondásának szövegei.',
            fields: [
                field('foglalas.kuldesGomb', 'Foglalás elküldése gomb'),
                field('foglalas.lebegoGomb', 'Lebegő foglalás gomb'),
                field('foglalas.popup.emailSikeresCim', 'Sikeres popup címe'),
                field('foglalas.popup.emailSikeresSzoveg', 'Sikeres popup szövege', 'textarea'),
                field('foglalas.popup.emailHibaCim', 'Emailhiba popup címe'),
                field('foglalas.popup.emailHibaSzoveg', 'Emailhiba popup szövege', 'textarea'),
                field('foglalas.popup.kezdolapGomb', 'Popup kezdőlap gomb'),
                field('foglalas.popup.galeriaGomb', 'Popup galéria gomb'),
                field('foglalas.popup.naptarGomb', 'Popup naptár gomb'),
                field('foglalas.popup.bezarasGomb', 'Popup bezárás gomb'),
                field('foglalas.popup.azonositoCimke', 'Popup azonosító címkéje'),
                field('foglalas.popup.azonositoLeiras', 'Popup azonosító leírása', 'textarea'),
                field('foglalas.popup.kezelesGomb', 'Popup foglaláskezelő gomb'),
                field('foglalas.oldal.kezeles.kicker', 'Foglaláskezelő kis felső szöveg'),
                field('foglalas.oldal.kezeles.cim', 'Foglaláskezelő címe'),
                field('foglalas.oldal.kezeles.leiras', 'Foglaláskezelő bevezetője', 'textarea'),
                field('foglalas.oldal.kezeles.kodCimke', 'Azonosító mező címkéje'),
                field('foglalas.oldal.kezeles.kodSegitseg', 'Azonosító alatti segítség', 'textarea'),
                field('foglalas.oldal.kezeles.lekeresGomb', 'Foglalás lekérése gomb'),
                field('foglalas.oldal.kezeles.lemondasLeiras', 'Lemondási lehetőség szövege', 'textarea'),
                field('foglalas.oldal.kezeles.lemondasMegjegyzesCimke', 'Lemondási megjegyzés címkéje'),
                field('foglalas.oldal.kezeles.lemondasMegjegyzesPlaceholder', 'Lemondási megjegyzés helykitöltője', 'textarea'),
                field('foglalas.oldal.kezeles.lemondasGomb', 'Foglalás lemondása gomb')
            ]
        },
        {
            title: 'Automatikus vendégemailek',
            description: 'A foglalás állapotához kapcsolódó tényleges kimenő vendégemailek tárgya, címe és szövege.',
            fields: [
                field('email.ujFoglalas.targy', 'Új foglalás – email tárgya'),
                field('email.ujFoglalas.cim', 'Új foglalás – email címe'),
                field('email.ujFoglalas.szoveg', 'Új foglalás – email szövege ({nev}, {szolgaltatas}, {idopont}, {helyszin})', 'textarea'),
                field('email.visszaigazolas.targy', 'Visszaigazolás – email tárgya'),
                field('email.visszaigazolas.cim', 'Visszaigazolás – email címe'),
                field('email.visszaigazolas.szoveg', 'Visszaigazolás – email szövege', 'textarea'),
                field('email.visszaigazolasModositva.targy', 'Visszaigazolva és módosítva – tárgy'),
                field('email.visszaigazolasModositva.cim', 'Visszaigazolva és módosítva – cím'),
                field('email.visszaigazolasModositva.szoveg', 'Visszaigazolva és módosítva – szöveg', 'textarea'),
                field('email.idopontModositva.targy', 'Időpontmódosítás – email tárgya'),
                field('email.idopontModositva.cim', 'Időpontmódosítás – email címe'),
                field('email.idopontModositva.szoveg', 'Időpontmódosítás – email szövege', 'textarea'),
                field('email.lemondas.targy', 'Lemondás – email tárgya'),
                field('email.lemondas.cim', 'Lemondás – email címe'),
                field('email.lemondas.szoveg', 'Lemondás – email szövege', 'textarea'),
                field('email.fuggoben.targy', 'Függőben státusz – email tárgya'),
                field('email.fuggoben.cim', 'Függőben státusz – email címe'),
                field('email.fuggoben.szoveg', 'Függőben státusz – email szövege', 'textarea'),
                field('email.emlekezteto.targy', 'Emlékeztető – email tárgya'),
                field('email.emlekezteto.cim', 'Emlékeztető – email címe'),
                field('email.emlekezteto.szoveg', 'Emlékeztető – email szövege ({nev}, {szolgaltatas}, {idopont}, {helyszin}, {instagram})', 'textarea'),
                field('email.ertekelesKeres.targy', 'Értékeléskérés – email tárgya'),
                field('email.ertekelesKeres.cim', 'Értékeléskérés – email címe'),
                field('email.ertekelesKeres.szoveg', 'Értékeléskérés – email szövege ({nev}, {szolgaltatas}, {idopont}) – a Google gomb a külön Google értékelés link mezőt használja', 'textarea')
            ]
        },
        {
            title: 'Tulajdonosi havi riport',
            description: 'Minden hónap első napján az előző teljes naptári hónapról küldött, névtelen foglalási összesítő.',
            fields: [
                field('email.haviStatisztika.targy', 'Havi statisztika - email tárgya ({honap})'),
                field('email.haviStatisztika.cim', 'Havi statisztika - email címe ({honap})'),
                field('email.haviStatisztika.szoveg', 'Havi statisztika - email bevezető szövege ({honap})', 'textarea')
            ]
        },
        {
            title: 'Elérhetőségek és lábléc',
            description: 'A publikus elérhetőségek, közösségi linkek, térkép és a lábléc tartalma.',
            fields: [
                field('marka.rovidLeiras', 'Rövid márkaleírás', 'textarea'),
                field('kapcsolat.cimke', 'Kapcsolati blokk címe'),
                field('kapcsolat.cim', 'Cím'),
                field('kapcsolat.terkepUrl', 'Térkép link', 'url'),
                field('kapcsolat.googleErtekelesUrl', 'Google értékelés link (ezt használja az értékeléskérő email gombja)', 'url'),
                field('kapcsolat.telefon', 'Telefonszám'),
                field('kapcsolat.telefonLink', 'Telefon hívási formátumban'),
                checkbox('kapcsolat.telefonLathato', 'Telefonszám megjelenítése'),
                field('kapcsolat.email', 'Email'),
                field('kapcsolat.instagram', 'Instagram link', 'url'),
                field('kapcsolat.facebook', 'Facebook link', 'url'),
                field('kapcsolat.messenger', 'Messenger link', 'url'),
                field('kapcsolat.smsUzenet', 'SMS link', 'url'),
                field('kapcsolat.instagramUzenet', 'Instagram üzenet link', 'url'),
                field('lablec.jogiLink', 'Adatkezelési link szövege'),
                field('lablec.jogok', 'Szerzői jogi sor')
            ]
        },
        {
            title: 'Kereső és megosztás',
            description: 'A főoldal böngészőcíme, keresőleírása és közösségi megosztási képe.',
            fields: [
                field('seo.fooldalCim', 'Főoldal böngészőcíme'),
                field('seo.fooldalLeiras', 'Főoldal keresőleírása', 'textarea'),
                image('seo.megosztasiKep', 'Megosztási kép')
            ]
        },
        {
            title: 'Főoldal – vendégértesítő',
            description: 'Ide írhatsz szabadságról vagy más aktuális tudnivalóról. Például: „Kedves Vendégeim! Augusztus 20–24. között szabadság miatt nem leszek elérhető.”',
            fields: [
                checkbox('fooldal.ertesito.aktiv', 'Az értesítő megjelenítése a főoldalon'),
                field('fooldal.ertesito.cimke', 'Kis felső felirat'),
                field('fooldal.ertesito.szoveg', 'Üzenet a vendégeknek', 'textarea')
            ]
        },
        {
            title: 'Szolgáltatási oldal – Műköröm',
            description: 'A műköröm építés és töltés oldal teljes szövege, keresőleírása és nyitóképe.',
            fields: servicePageFields('szolgaltatasOldalak.mukorom', 6)
        },
        {
            title: 'Szolgáltatási oldal – Gél lakk',
            description: 'A hagyományos és erősített gél lakk oldal teljes szövege, keresőleírása és nyitóképe.',
            fields: servicePageFields('szolgaltatasOldalak.gelLakk', 4)
        },
        {
            title: 'Szolgáltatási oldal – Manikűr',
            description: 'A manikűr oldal teljes szövege, keresőleírása és nyitóképe.',
            fields: servicePageFields('szolgaltatasOldalak.manikur', 4)
        },
        {
            title: 'Szolgáltatási oldal – Díszítés / Nail Art',
            description: 'A körömdíszítési oldal teljes szövege, keresőleírása és nyitóképe. A további fotók a Galéria képei között jelölhetők ki.',
            fields: servicePageFields('szolgaltatasOldalak.nailArt', 4, true)
        }
    ];

    const CMS_VIEWS = [
        {
            id: 'fooldal',
            title: 'Főoldal',
            description: 'A nyitóoldal minden fontos tartalmi blokkja.',
            groups: [16, 15, 1, 2, 3, 4, 5]
        },
        {
            id: 'foglalas',
            title: 'Foglalás',
            description: 'A foglalási oldal, az űrlap és a vendégnek szóló üzenetek.',
            groups: [8, 9, 10, 11]
        },
        {
            id: 'szolgaltatasi-oldalak',
            title: 'Szolgáltatások',
            description: 'A külön szolgáltatási oldalak szövegei, kérdései és képei.',
            groups: [17, 18, 19, 20]
        },
        {
            id: 'oldalak',
            title: 'Oldalak',
            description: 'Az árlista és a teljes galéria külön oldalai.',
            groups: [6, 7]
        },
        {
            id: 'emailek',
            title: 'E-mailek',
            description: 'Az automatikusan kiküldött vendégemailek szövegei.',
            groups: [12]
        },
        {
            id: 'altalanos',
            title: 'Általános',
            description: 'Márka, navigáció, elérhetőségek és keresőbeállítások.',
            groups: [0, 13, 14]
        }
    ];
    const CMS_FIELD_SETS = {
        1: [
            ['Fő szövegek', 0, 3],
            ['Előnyök', 4, 9],
            ['Képes blokk feliratai', 10, 12],
            ['Nyitókép', 13, 14]
        ],
        2: [
            ['Bemutatkozó szöveg', 0, 6],
            ['Bemutatkozó kép', 7, 8]
        ],
        3: [
            ['Szekció bevezetője', 0, 2],
            ['1. szolgáltatáskártya', 3, 5],
            ['2. szolgáltatáskártya', 6, 8],
            ['3. szolgáltatáskártya', 9, 11],
            ['4. szolgáltatáskártya', 12, 14]
        ],
        8: [
            ['Oldal bevezetője', 0, 2],
            ['Instagram', 3, 5],
            ['Messenger', 6, 8],
            ['SMS', 9, 11],
            ['Online foglalás', 12, 14],
            ['Foglalás ellenőrzése', 15, 17]
        ],
        9: [
            ['Online rész bevezetője', 0, 2],
            ['1. lépés – szolgáltatás', 3, 4],
            ['2. lépés – körömstílus', 5, 13],
            ['3. lépés – időpont', 14, 15],
            ['4. lépés – részletek és kép', 16, 20],
            ['5. lépés – elérhetőségek', 21, 27]
        ],
        10: [
            ['Általános kuponüzenetek', 0, 4],
            ['Új vendég ellenőrzése', 5, 10]
        ],
        11: [
            ['Foglalási gombok', 0, 1],
            ['Visszajelző ablak', 2, 9],
            ['Azonosító a visszajelző ablakban', 10, 12],
            ['Foglalás ellenőrzése és lemondása', 13, 22]
        ],
        12: [
            ['Új foglalás', 0, 2],
            ['Visszaigazolás', 3, 5],
            ['Visszaigazolás módosítással', 6, 8],
            ['Időpontmódosítás', 9, 11],
            ['Lemondás', 12, 14],
            ['Függőben státusz', 15, 17],
            ['Emlékeztető', 18, 20],
            ['Értékeléskérés', 21, 23]
        ],
        13: [
            ['Márka és blokkcímek', 0, 1],
            ['Cím, telefon és email', 2, 8],
            ['Közösségi és üzenetküldő linkek', 9, 13],
            ['Lábléc', 14, 15]
        ],
        17: servicePageFieldSets(6),
        18: servicePageFieldSets(4),
        19: servicePageFieldSets(4),
        20: servicePageFieldSets(4, true)
    };
    document.addEventListener('DOMContentLoaded', () => {
        const root = document.getElementById('admin-cms-root');
        if (!root || !config?.url || !config?.publishableKey || !supabaseLib?.createClient) return;

        state.client = window.lumiSupabaseClient();
        root.addEventListener('input', cmsInput);
        root.addEventListener('change', cmsChange);
        root.addEventListener('click', cmsClick);
        document.getElementById('admin-cms-save')?.addEventListener('click', saveContent);
        document.getElementById('admin-cms-reload')?.addEventListener('click', loadContent);

        state.client.auth.onAuthStateChange((_event, session) => {
            state.session = session;
            if (session) loadContent();
        });
        state.client.auth.getSession().then(({ data }) => {
            state.session = data.session;
            if (state.session) loadContent();
        });
    });

    function field(path, label, type = 'text') { return { path, label, type }; }
    function image(path, label) { return { path, label, type: 'image' }; }
    function checkbox(path, label) { return { path, label, type: 'checkbox' }; }
    function cardFields(base, index, label) {
        return [
            field(`${base}.${index}.cim`, `${label} címe`),
            field(`${base}.${index}.leiras`, `${label} szövege`, 'textarea'),
            field(`${base}.${index}.linkSzoveg`, `${label} linkjének szövege`)
        ];
    }

    function servicePageFields(base, faqCount, hasGallerySection = false) {
        const fields = [
            field(`${base}.seoCim`, 'Kereső és böngésző címe'),
            field(`${base}.seoLeiras`, 'Kereső rövid leírása', 'textarea'),
            field(`${base}.kicker`, 'Nyitókép kis felső szövege'),
            field(`${base}.cim`, 'Oldal főcíme'),
            field(`${base}.leiras`, 'Nyitókép bevezető szövege', 'textarea'),
            image(`${base}.kep`, 'Nyitókép'),
            field(`${base}.kepAlt`, 'Nyitókép leírása'),
            field(`${base}.bevezetoKicker`, 'Bevezető kis felső szövege'),
            field(`${base}.bevezetoCim`, 'Bevezető címe'),
            field(`${base}.bevezeto`, 'Bevezető szövege', 'textarea'),
            field(`${base}.szekciok.0.kicker`, 'Első tartalmi rész kis felső szövege'),
            field(`${base}.szekciok.0.cim`, 'Első tartalmi rész címe'),
            field(`${base}.szekciok.0.szoveg`, 'Első tartalmi rész szövege – üres sorral új bekezdés kezdhető', 'textarea'),
            field(`${base}.szekciok.1.kicker`, 'Második tartalmi rész kis felső szövege'),
            field(`${base}.szekciok.1.cim`, 'Második tartalmi rész címe'),
            field(`${base}.szekciok.1.szoveg`, 'Második tartalmi rész szövege – üres sorral új bekezdés kezdhető', 'textarea'),
            field(`${base}.kiemeles.kicker`, 'Kiemelt segítség kis felső szövege'),
            field(`${base}.kiemeles.cim`, 'Kiemelt segítség címe'),
            field(`${base}.kiemeles.szoveg`, 'Kiemelt segítség szövege', 'textarea')
        ];

        Array.from({ length: faqCount }, (_item, index) => {
            fields.push(
                field(`${base}.gyik.${index}.kerdes`, `${index + 1}. kérdés`),
                field(`${base}.gyik.${index}.valasz`, `${index + 1}. válasz`, 'textarea')
            );
        });

        fields.push(
            field(`${base}.zaras.kicker`, 'Záró blokk kis felső szövege'),
            field(`${base}.zaras.cim`, 'Záró blokk címe'),
            field(`${base}.zaras.szoveg`, 'Záró blokk szövege', 'textarea'),
            field(`${base}.gyikKicker`, 'Gyakori kérdések kis felső szövege'),
            field(`${base}.gyikCim`, 'Gyakori kérdések blokk címe'),
            field(`${base}.zaras.foglalasGomb`, 'Záró foglalás gomb felirata'),
            field(`${base}.zaras.masodlagosGomb`, 'Záró másodlagos link felirata')
        );

        if (hasGallerySection) {
            fields.push(
                field(`${base}.kepekKicker`, 'Képes blokk kis felső szövege'),
                field(`${base}.kepekCim`, 'Képes blokk címe')
            );
        }
        return fields;
    }

    function servicePageFieldSets(faqCount, hasGallerySection = false) {
        const faqStart = 19;
        const faqEnd = faqStart + faqCount * 2 - 1;
        const closingStart = faqEnd + 1;
        const extrasStart = closingStart + 3;
        const sets = [
            ['Keresőbeállítások', 0, 1],
            ['Nyitókép', 2, 6],
            ['Bevezető', 7, 9],
            ['Első tartalmi rész', 10, 12],
            ['Második tartalmi rész', 13, 15],
            ['Kiemelt segítség', 16, 18],
            ['Gyakori kérdések', faqStart, faqEnd],
            ['Záró blokk', closingStart, closingStart + 2],
            ['Gyakori kérdések blokk címe', extrasStart, extrasStart + 1],
            ['Záró blokk gombjai', extrasStart + 2, extrasStart + 3]
        ];
        if (hasGallerySection) {
            const galleryStart = extrasStart + 4;
            sets.push(['Képes blokk', galleryStart, galleryStart + 1]);
        }
        return sets;
    }

    async function loadContent() {
        if (!state.client || !state.session || state.saving) return;
        status('Tartalom betöltése...');
        const defaults = window.lumiAlapOldalAdatok?.() || {};
        const { data, error } = await state.client.from('site_settings').select('value').eq('key', 'site_content').maybeSingle();

        if (error) {
            state.content = clone(defaults);
            render();
            status('Az online tartalom még nem érhető el. Az alapadatokat mutatom; futtasd a friss Supabase SQL-t.', true);
            return;
        }

        state.content = normalizeContent(deepMerge(defaults, data?.value || {}), defaults);
        state.dirty = false;
        render();
        status('A weboldal tartalma betöltve.');
        updateSaveLabel();
    }

    function render() {
        const root = document.getElementById('admin-cms-root');
        if (!root || !state.content) return;
        root.innerHTML = '';

        const activeView = CMS_VIEWS.find(view => view.id === state.cmsView) || CMS_VIEWS[0];
        if (!activeView.groups.includes(state.cmsGroup)) state.cmsGroup = activeView.groups[0];
        const activeGroup = GROUPS[state.cmsGroup];

        const tabs = document.createElement('div');
        tabs.className = 'cms-view-tabs';
        tabs.setAttribute('role', 'tablist');
        tabs.setAttribute('aria-label', 'Szerkeszthető tartalmi területek');
        CMS_VIEWS.forEach(view => {
            const button = document.createElement('button');
            const selected = view.id === activeView.id;
            button.type = 'button';
            button.className = 'cms-view-tab';
            button.dataset.cmsView = view.id;
            button.setAttribute('role', 'tab');
            button.setAttribute('aria-selected', String(selected));
            button.innerHTML = `<span>${escapeHtml(view.title)}</span><small>${view.groups.length}</small>`;
            tabs.appendChild(button);
        });


        const layout = document.createElement('div');
        layout.className = 'cms-editor-layout';

        const sectionPicker = document.createElement('label');
        sectionPicker.className = 'cms-section-picker';
        sectionPicker.innerHTML = `
            <span>Szerkesztett szekció</span>
            <select data-cms-section-select aria-label="${escapeAttribute(activeView.title)} szekciói">
                ${activeView.groups.map(groupIndex => {
                    const group = GROUPS[groupIndex];
                    const shortTitle = group.title.replace(/^(Főoldal|Foglalás)\s+[–-]\s+/i, '');
                    return `<option value="${groupIndex}"${groupIndex === state.cmsGroup ? ' selected' : ''}>${escapeHtml(shortTitle)}</option>`;
                }).join('')}
            </select>`;

        const index = document.createElement('nav');
        index.className = 'cms-section-index';
        index.setAttribute('aria-label', `${activeView.title} szekciói`);
        activeView.groups.forEach(groupIndex => {
            const group = GROUPS[groupIndex];
            const button = document.createElement('button');
            const selected = groupIndex === state.cmsGroup;
            const shortTitle = group.title.replace(/^(Főoldal|Foglalás)\s+[–-]\s+/i, '');
            const itemCount = group.fields.length
                + (group.gallery ? 1 : 0);
            button.type = 'button';
            button.className = 'cms-section-index-button';
            button.dataset.cmsSection = String(groupIndex);
            button.setAttribute('aria-current', selected ? 'true' : 'false');
            button.innerHTML = `
                <span>${escapeHtml(shortTitle)}</span>
                <small>${itemCount} szerkeszthető rész</small>`;
            index.appendChild(button);
        });

        const editor = document.createElement('section');
        editor.className = 'cms-editor-card';
        const editorHeader = document.createElement('div');
        editorHeader.className = 'cms-editor-card-header';
        editorHeader.innerHTML = `
            <div>
                <h3>${escapeHtml(activeGroup.title)}</h3>
            </div>
            <span class="cms-field-count">${activeGroup.fields.length} mező</span>`;

        const body = document.createElement('div');
        body.className = 'cms-section-body';
        body.appendChild(renderFieldArea(state.cmsGroup, activeGroup.fields));
        if (activeGroup.gallery) body.appendChild(renderGallery());

        editor.append(editorHeader, body);
        layout.append(sectionPicker, index, editor);
        root.append(tabs, layout);
        window.requestAnimationFrame(() => {
            tabs.scrollLeft = state.cmsViewScroll;
            index.scrollLeft = state.cmsSectionScroll;
        });
    }

    function renderFieldArea(groupIndex, fields) {
        const sets = CMS_FIELD_SETS[groupIndex];
        if (!sets) {
            const grid = document.createElement('div');
            grid.className = 'admin-grid cms-field-grid';
            fields.forEach(definition => grid.appendChild(renderField(definition)));
            return grid;
        }

        const wrapper = document.createElement('div');
        wrapper.className = 'cms-fieldsets';
        sets.forEach(([title, start, end], setIndex) => {
            const details = document.createElement('details');
            details.className = 'cms-fieldset';
            details.open = setIndex === 0;

            const summary = document.createElement('summary');
            summary.innerHTML = `
                <span>${escapeHtml(title)}</span>
                <small>${end - start + 1} mező</small>`;

            const grid = document.createElement('div');
            grid.className = 'admin-grid cms-field-grid cms-fieldset-grid';
            fields.slice(start, end + 1).forEach(definition => grid.appendChild(renderField(definition)));
            details.append(summary, grid);
            wrapper.appendChild(details);
        });
        return wrapper;
    }
    function renderField(definition) {
        if (definition.type === 'image') return renderImageField(definition.path, definition.label);
        const label = document.createElement('label');
        label.className = definition.type === 'checkbox'
            ? 'admin-mezo admin-checkbox cms-checkbox'
            : `admin-mezo${definition.type === 'textarea' ? ' admin-mezo-szeles' : ''}`;
        if (definition.type === 'checkbox') {
            const input = document.createElement('input');
            input.type = 'checkbox';
            input.dataset.cmsPath = definition.path;
            input.checked = Boolean(getPath(state.content, definition.path));
            label.append(input, document.createTextNode(definition.label));
            return label;
        }

        label.textContent = definition.label;
        const input = document.createElement(definition.type === 'textarea' ? 'textarea' : 'input');
        input.dataset.cmsPath = definition.path;
        input.value = getPath(state.content, definition.path) ?? '';
        if (definition.type === 'textarea') input.rows = 4;
        if (definition.type === 'url') input.type = 'url';
        label.appendChild(input);
        return label;
    }

    function renderImageField(path, labelText) {
        const holder = document.createElement('div');
        holder.className = 'cms-image-field admin-mezo admin-mezo-szeles';
        const label = document.createElement('span');
        label.className = 'cms-field-label';
        label.textContent = labelText;
        const current = getPath(state.content, path) || '';
        const preview = document.createElement('div');
        preview.className = 'cms-image-preview';
        preview.dataset.cmsPreview = path;
        preview.innerHTML = current ? `<img src="${escapeAttribute(current)}" alt=""><span>Kép előnézet</span>` : '<span>Nincs kiválasztott kép</span>';
        const controls = document.createElement('div');
        controls.className = 'cms-image-controls';
        const uploadLabel = document.createElement('label');
        uploadLabel.className = 'admin-hozzaadas cms-upload-button';
        uploadLabel.textContent = 'Kép feltöltése';
        const file = document.createElement('input');
        file.type = 'file';
        file.accept = 'image/jpeg,image/png,image/webp,image/avif';
        file.dataset.cmsUpload = path;
        uploadLabel.appendChild(file);
        const remove = document.createElement('button');
        remove.type = 'button';
        remove.className = 'admin-kis-gomb';
        remove.dataset.cmsRemoveImage = path;
        remove.textContent = 'Kép eltávolítása';
        controls.append(uploadLabel, remove);
        const url = document.createElement('input');
        url.type = 'text';
        url.className = 'cms-image-url';
        url.dataset.cmsPath = path;
        url.value = current;
        url.placeholder = 'Kép URL vagy /kepek/fajl.jpg';
        holder.append(label, preview, controls, url);
        return holder;
    }

    function renderGallery() {
        const wrapper = document.createElement('div');
        wrapper.className = 'cms-gallery-editor';
        const header = document.createElement('div');
        header.className = 'cms-gallery-header';
        const kivalasztottAzonositok = new Set(getPath(state.content, GALLERY_SELECTIONS.home.path) || []);
        const nailArtAzonositok = new Set(getPath(state.content, GALLERY_SELECTIONS.nailArt.path) || []);
        header.innerHTML = `
            <div>
                <h3>Galéria képei</h3>
                <span class="cms-gallery-selection-count">${GALLERY_SELECTIONS.home.countText(kivalasztottAzonositok.size)}</span>
                <span class="cms-gallery-nail-art-selection-count">${GALLERY_SELECTIONS.nailArt.countText(nailArtAzonositok.size)}</span>
            </div>`;
        const add = document.createElement('button');
        add.type = 'button';
        add.className = 'admin-hozzaadas';
        add.dataset.cmsGalleryAdd = 'true';
        add.textContent = 'Új galériakép';
        header.appendChild(add);
        wrapper.appendChild(header);

        const list = document.createElement('div');
        list.className = 'cms-gallery-list';
        const items = state.content.galeria?.elemek || [];
        if (!items.length) list.innerHTML = '<p class="admin-ures">Még nincs galériakép.</p>';
        items.forEach((item, index) => {
            const azonosito = item.id || item.kep;
            const card = document.createElement('article');
            card.className = 'cms-gallery-item';
            card.dataset.galleryIndex = String(index);
            card.dataset.homeSelected = String(kivalasztottAzonositok.has(azonosito));
            card.dataset.nailArtSelected = String(nailArtAzonositok.has(azonosito));
            const title = document.createElement('h4');
            title.textContent = `${index + 1}. kép`;

            const homeChoice = renderGalleryChoice(
                'home',
                azonosito,
                'Megjelenjen a főoldali galériaátvezetőben',
                kivalasztottAzonositok.has(azonosito)
            );
            const nailArtChoice = renderGalleryChoice(
                'nailArt',
                azonosito,
                'Megjelenjen a Nail Art oldalon',
                nailArtAzonositok.has(azonosito)
            );

            card.append(title, homeChoice, nailArtChoice);
            card.appendChild(renderImageField(`galeria.elemek.${index}.kep`, 'Fotó'));
            card.appendChild(renderField(field(`galeria.elemek.${index}.kepAlt`, 'Kép leírása')));
            card.appendChild(renderField(checkbox(`galeria.elemek.${index}.magas`, 'Magas kiemelt csempe')));
            const actions = document.createElement('div');
            actions.className = 'cms-gallery-actions';
            actions.innerHTML = `
                <button type="button" class="admin-kis-gomb" data-cms-gallery-move="up" data-index="${index}" aria-label="Feljebb">↑ Feljebb</button>
                <button type="button" class="admin-kis-gomb" data-cms-gallery-move="down" data-index="${index}" aria-label="Lejjebb">↓ Lejjebb</button>
                <button type="button" class="admin-kis-gomb admin-veszely-gomb" data-cms-gallery-delete="${index}">Törlés</button>`;
            card.appendChild(actions);
            list.appendChild(card);
        });
        wrapper.appendChild(list);
        return wrapper;
    }

    function renderGalleryChoice(selectionKey, azonosito, labelText, checked) {
        const label = document.createElement('label');
        label.className = `cms-gallery-choice cms-gallery-${selectionKey === 'home' ? 'home' : 'nail-art'}-choice`;
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.dataset.cmsGallerySelection = selectionKey;
        input.dataset.cmsGalleryItem = azonosito;
        if (selectionKey === 'home') input.dataset.cmsHomeGallerySelect = azonosito;
        input.checked = checked;
        const text = document.createElement('span');
        text.textContent = labelText;
        label.append(input, text);
        return label;
    }

    function cmsInput(event) {
        if (event.target.matches('[data-cms-path]')) {
            state.dirty = true;
            updateSaveLabel();
        }
    }

    async function cmsChange(event) {
        const sectionSelect = event.target.closest('[data-cms-section-select]');
        if (sectionSelect) {
            rememberCmsScroll();
            readForm();
            const nextGroup = Number(sectionSelect.value);
            if (!Number.isInteger(nextGroup) || nextGroup === state.cmsGroup) return;
            state.cmsGroup = nextGroup;
            render();
            return;
        }

        const gallerySelection = event.target.closest('[data-cms-gallery-selection]');
        if (gallerySelection) {
            updateGallerySelection(gallerySelection);
            return;
        }

        const input = event.target.closest('[data-cms-upload]');
        if (!input || !input.files?.[0]) return;
        await uploadImage(input.dataset.cmsUpload, input.files[0], input);
    }

    function updateGallerySelection(input) {
        const selectionKey = input.dataset.cmsGallerySelection;
        const definition = GALLERY_SELECTIONS[selectionKey];
        if (!definition) return;

        const items = state.content.galeria?.elemek || [];
        const kivalasztott = new Set(getPath(state.content, definition.path) || []);
        const azonosito = input.dataset.cmsGalleryItem;

        if (input.checked && !kivalasztott.has(azonosito) && kivalasztott.size >= definition.limit) {
            input.checked = false;
            status(`Legfeljebb ${definition.limit} képet választhatsz ehhez a blokkhoz.`, true);
            return;
        }

        if (input.checked) kivalasztott.add(azonosito);
        else kivalasztott.delete(azonosito);

        const rendezettKivalasztas = items
            .map(item => item.id || item.kep)
            .filter(itemAzonosito => kivalasztott.has(itemAzonosito))
            .slice(0, definition.limit);
        setPath(state.content, definition.path, rendezettKivalasztas);
        document.querySelectorAll(`[data-cms-gallery-selection="${selectionKey}"]`).forEach(selectionInput => {
            const card = selectionInput.closest('.cms-gallery-item');
            if (!card) return;
            if (selectionKey === 'home') card.dataset.homeSelected = String(selectionInput.checked);
            if (selectionKey === 'nailArt') card.dataset.nailArtSelected = String(selectionInput.checked);
        });
        const count = document.querySelector(definition.countSelector);
        if (count) count.textContent = definition.countText(rendezettKivalasztas.length);
        state.dirty = true;
        updateSaveLabel();
        status(definition.statusText(rendezettKivalasztas.length));
    }

    function rememberCmsScroll() {
        const root = document.getElementById('admin-cms-root');
        state.cmsViewScroll = root?.querySelector('.cms-view-tabs')?.scrollLeft || 0;
        state.cmsSectionScroll = root?.querySelector('.cms-section-index')?.scrollLeft || 0;
    }
    function cmsClick(event) {
        const viewButton = event.target.closest('[data-cms-view]');
        if (viewButton) {
            rememberCmsScroll();
            readForm();
            const nextView = CMS_VIEWS.find(view => view.id === viewButton.dataset.cmsView);
            if (!nextView || nextView.id === state.cmsView) return;
            state.cmsView = nextView.id;
            state.cmsGroup = nextView.groups[0];
            state.cmsSectionScroll = 0;
            render();
            return;
        }

        const sectionButton = event.target.closest('[data-cms-section]');
        if (sectionButton) {
            rememberCmsScroll();
            readForm();
            const nextGroup = Number(sectionButton.dataset.cmsSection);
            if (!Number.isInteger(nextGroup) || nextGroup === state.cmsGroup) return;
            state.cmsGroup = nextGroup;
            render();
            return;
        }
        const remove = event.target.closest('[data-cms-remove-image]');
        if (remove) {
            setImageValue(remove.dataset.cmsRemoveImage, '');
            return;
        }

        if (event.target.closest('[data-cms-gallery-add]')) {
            readForm();
            state.content.galeria ||= {};
            state.content.galeria.elemek ||= [];
            state.content.galeria.elemek.push({
                id: `galeria-${randomId()}`,
                kep: '',
                eloKep: '',
                kepAlt: 'Lumi Nails köröm munka',
                magas: false
            });
            markDirtyAndRenderGallery();
            return;
        }

        const move = event.target.closest('[data-cms-gallery-move]');
        if (move) {
            readForm();
            const from = Number(move.dataset.index);
            const to = move.dataset.cmsGalleryMove === 'up' ? from - 1 : from + 1;
            const items = state.content.galeria.elemek;
            if (to >= 0 && to < items.length) [items[from], items[to]] = [items[to], items[from]];
            markDirtyAndRenderGallery();
            return;
        }

        const deletion = event.target.closest('[data-cms-gallery-delete]');
        if (deletion) {
            if (!window.confirm('Biztosan törlöd ezt a galériaelemet?')) return;
            readForm();
            const torlendoIndex = Number(deletion.dataset.cmsGalleryDelete);
            const torlendoElem = state.content.galeria.elemek[torlendoIndex];
            const torlendoAzonosito = torlendoElem?.id || torlendoElem?.kep;
            state.content.galeria.elemek.splice(torlendoIndex, 1);
            const kivalasztott = getPath(state.content, 'fooldal.galeriaAtvezeto.kivalasztottKepek') || [];
            setPath(
                state.content,
                'fooldal.galeriaAtvezeto.kivalasztottKepek',
                kivalasztott.filter(azonosito => azonosito !== torlendoAzonosito)
            );
            const nailArtKivalasztott = getPath(state.content, GALLERY_SELECTIONS.nailArt.path) || [];
            setPath(
                state.content,
                GALLERY_SELECTIONS.nailArt.path,
                nailArtKivalasztott.filter(azonosito => azonosito !== torlendoAzonosito)
            );
            markDirtyAndRenderGallery();
        }
    }

    async function uploadImage(path, file, input) {
        if (!state.client || !state.session) return;
        const tamogatottTipusok = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);
        if (!tamogatottTipusok.has(String(file.type || '').toLowerCase())) {
            status('JPG, PNG, WebP vagy AVIF képet tölthetsz fel. Az animált GIF nem támogatott.', true);
            input.value = '';
            return;
        }
        if (file.size > MAX_FILE_SIZE) {
            status('A kép legfeljebb 12 MB lehet.', true);
            input.value = '';
            return;
        }

        const galeriaKep = /^galeria\.elemek\.\d+\.kep$/.test(path);
        const feltoltottUtvonalak = [];
        input.disabled = true;

        try {
            status(`Kép optimalizálása: ${file.name}...`);
            const valtozatok = await optimizeImageFile(file, { includePreview: galeriaKep });
            const alapUtvonal = `uploads/${new Date().toISOString().slice(0, 10)}/${Date.now()}-${randomId()}`;

            status(`Optimalizált kép feltöltése: ${file.name}...`);
            const teljesUtvonal = `${alapUtvonal}-full.${optimizedImageExtension(valtozatok.full)}`;
            const teljesUrl = await uploadOptimizedImage(valtozatok.full, teljesUtvonal);
            feltoltottUtvonalak.push(teljesUtvonal);

            let elonezetUrl = '';
            if (valtozatok.preview) {
                const elonezetUtvonal = `${alapUtvonal}-preview.${optimizedImageExtension(valtozatok.preview)}`;
                elonezetUrl = await uploadOptimizedImage(valtozatok.preview, elonezetUtvonal);
                feltoltottUtvonalak.push(elonezetUtvonal);
            }

            setImageValue(path, teljesUrl);
            if (galeriaKep) {
                setPath(state.content, path.replace(/\.kep$/, '.eloKep'), elonezetUrl || teljesUrl);
            }

            const teljesMeret = Math.ceil(valtozatok.full.size / 1024);
            const elonezetMeret = valtozatok.preview ? `, előnézet: ${Math.ceil(valtozatok.preview.size / 1024)} KB` : '';
            const formatum = valtozatok.full.type === 'image/webp' ? 'WebP' : 'tömörített JPG';
            status(`A kép ${formatum} formátumban feltöltve (teljes: ${teljesMeret} KB${elonezetMeret}). A véglegesítéshez mentsd a tartalmat.`);
        } catch (error) {
            console.error('Képfeltöltési hiba:', error);
            if (feltoltottUtvonalak.length) {
                const { error: cleanupError } = await state.client.storage.from(BUCKET).remove(feltoltottUtvonalak);
                if (cleanupError) console.warn('A félbemaradt képfeltöltés takarítása nem sikerült:', cleanupError);
            }
            status(error?.message || 'A kép feldolgozása vagy feltöltése nem sikerült.', true);
        } finally {
            input.disabled = false;
            input.value = '';
        }
    }

    function optimizedImageExtension(file) {
        return file?.type === 'image/webp' ? 'webp' : 'jpg';
    }
    async function uploadOptimizedImage(file, objectPath) {
        const { error } = await state.client.storage.from(BUCKET).upload(objectPath, file, {
            cacheControl: '31536000',
            contentType: file.type,
            upsert: false
        });
        if (error) {
            console.error('Storage feltöltési hiba:', error);
            throw new Error('A kép feltöltése nem sikerült. Ellenőrizd a tárhely beállításait és próbáld újra.');
        }
        const { data } = state.client.storage.from(BUCKET).getPublicUrl(objectPath);
        if (!data?.publicUrl) throw new Error('A feltöltött kép nyilvános címe nem kérhető le.');
        return data.publicUrl;
    }

    function setImageValue(path, value) {
        setPath(state.content, path, value);
        const input = document.querySelector(`[data-cms-path="${cssEscape(path)}"]`);
        if (input) input.value = value;
        const preview = document.querySelector(`[data-cms-preview="${cssEscape(path)}"]`);
        if (preview) preview.innerHTML = value
            ? `<img src="${escapeAttribute(value)}" alt=""><span>Kép előnézet</span>`
            : '<span>Nincs kiválasztott kép</span>';
        state.dirty = true;
        updateSaveLabel();
    }

    function readForm() {
        document.querySelectorAll('#admin-cms-root [data-cms-path]').forEach(input => {
            setPath(state.content, input.dataset.cmsPath, input.type === 'checkbox' ? input.checked : input.value.trim());
        });
    }

    async function saveContent() {
        if (!state.client || !state.session || !state.content || state.saving) return;
        readForm();
        state.content = normalizeContent(state.content, window.lumiAlapOldalAdatok?.() || {});
        setSaving(true);
        status('Tartalom mentése...');
        const phoneVisible = getPath(state.content, 'kapcsolat.telefonLathato') !== false;
        const [contentResult, phoneResult] = await Promise.all([
            state.client.from('site_settings').upsert({
                key: 'site_content',
                value: state.content,
                updated_at: new Date().toISOString()
            }, { onConflict: 'key' }),
            state.client.from('site_settings').upsert({
                key: 'telefon_lathato',
                value: { visible: phoneVisible },
                updated_at: new Date().toISOString()
            }, { onConflict: 'key' })
        ]);
        setSaving(false);

        if (contentResult.error || phoneResult.error) {
            console.error('Tartalom mentési hiba:', contentResult.error || phoneResult.error);
            status('A mentés nem sikerült. Ellenőrizd a Supabase SQL beállítását.', true);
            return;
        }

        state.dirty = false;
        updateSaveLabel();
        status('Minden tartalom elmentve. A publikus oldalon frissítés után látható.');
    }

    function markDirtyAndRenderGallery() {
        state.dirty = true;
        render();
        openGallerySection();
        updateSaveLabel();
    }

    function setSaving(saving) {
        state.saving = saving;
        const save = document.getElementById('admin-cms-save');
        if (save) {
            save.disabled = saving;
            save.textContent = saving ? 'Mentés...' : 'Tartalom mentése';
        }
    }

    function updateSaveLabel() {
        const save = document.getElementById('admin-cms-save');
        if (save && !save.disabled) save.textContent = state.dirty ? 'Tartalom mentése *' : 'Tartalom mentése';
    }

    function openGallerySection() {
        const button = Array.from(document.querySelectorAll('[data-cms-toggle]'))
            .find(item => item.textContent.includes('Galéria oldal'));
        if (!button) return;
        button.setAttribute('aria-expanded', 'true');
        button.lastElementChild.textContent = '−';
        button.nextElementSibling.hidden = false;
        button.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }

    function status(message, error = false) {
        const element = document.getElementById('admin-cms-status');
        if (!element) return;

        if (typeof window.lumiAdminStatusz === 'function') {
            element.textContent = '';
            element.classList.remove('hiba');
            window.lumiAdminStatusz(message, error);
            return;
        }

        element.textContent = message;
        element.classList.toggle('hiba', Boolean(error));
    }

    function getPath(object, path) {
        return path.split('.').reduce((current, key) => current?.[numberKey(key)], object);
    }

    function setPath(object, path, value) {
        const keys = path.split('.');
        let current = object;
        keys.forEach((key, index) => {
            const actualKey = numberKey(key);
            if (index === keys.length - 1) {
                current[actualKey] = value;
                return;
            }
            const nextIsNumber = /^\d+$/.test(keys[index + 1]);
            current[actualKey] ||= nextIsNumber ? [] : {};
            current = current[actualKey];
        });
    }

    function numberKey(value) { return /^\d+$/.test(value) ? Number(value) : value; }
    function deepMerge(base, override) {
        if (Array.isArray(base)) return Array.isArray(override) ? override : base;
        if (!base || typeof base !== 'object') return override ?? base;
        const result = { ...base };
        Object.keys(override || {}).forEach(key => { result[key] = deepMerge(base[key], override[key]); });
        return result;
    }
    function normalizeContent(content, defaults) {
        const normalized = content || {};
        const defaultHero = getPath(defaults, 'fooldal.hero.kep') || '/kepek/hero-exact.jpg';
        const hero = String(getPath(normalized, 'fooldal.hero.kep') || '');
        if (!hero || hero.includes('/kepek/hatter2.jpg') || hero.includes('/kepek/hero-hullamos.jpg')) {
            setPath(normalized, 'fooldal.hero.kep', defaultHero);
        }

        const defaultBenefits = getPath(defaults, 'fooldal.hero.elonyok') || [];
        const storedBenefits = getPath(normalized, 'fooldal.hero.elonyok') || [];
        const benefits = Array.from({ length: 3 }, (_item, index) =>
            deepMerge(clone(defaultBenefits[index] || { kiemeles: '', szoveg: '' }), storedBenefits[index] || {})
        );
        setPath(normalized, 'fooldal.hero.elonyok', benefits);

        const defaultCards = getPath(defaults, 'fooldal.szolgaltatasok.kartyak') || [];
        const storedCards = getPath(normalized, 'fooldal.szolgaltatasok.kartyak') || [];
        const serviceCards = Array.from({ length: 4 }, (_item, index) =>
            deepMerge(clone(defaultCards[index] || { cim: '', leiras: '', linkSzoveg: '' }), storedCards[index] || {})
        );
        const decorationCard = serviceCards.find(card => /dísz|nail art/i.test(String(card?.cim || '')));
        if (decorationCard && /különleges 3D dekorációk/i.test(String(decorationCard.leiras || ''))) {
            const defaultDecorationCard = defaultCards.find(card => /dísz|nail art/i.test(String(card?.cim || '')));
            decorationCard.leiras = defaultDecorationCard?.leiras || decorationCard.leiras;
            decorationCard.linkSzoveg = defaultDecorationCard?.linkSzoveg || 'Részletek';
        }
        setPath(normalized, 'fooldal.szolgaltatasok.kartyak', serviceCards);

        normalized.galeria ||= {};
        normalized.galeria.elemek = Array.isArray(normalized.galeria.elemek)
            ? normalized.galeria.elemek
            : [];
        const hasznaltAzonositok = new Set();
        normalized.galeria.elemek.forEach(elem => {
            if (!elem || typeof elem !== 'object') return;
            let azonosito = String(elem.id || '').trim();
            if (!azonosito || hasznaltAzonositok.has(azonosito)) {
                azonosito = `galeria-${randomId()}`;
            }
            elem.id = azonosito;
            hasznaltAzonositok.add(azonosito);
        });

        const kertKivalasztas = new Set(
            getPath(normalized, 'fooldal.galeriaAtvezeto.kivalasztottKepek') || []
        );
        let kivalasztottKepek = normalized.galeria.elemek
            .filter(elem => elem?.kep && (kertKivalasztas.has(elem.id) || kertKivalasztas.has(elem.kep)))
            .map(elem => elem.id)
            .slice(0, 5);
        if (!kivalasztottKepek.length) {
            kivalasztottKepek = normalized.galeria.elemek
                .filter(elem => elem?.kep)
                .slice(0, 5)
                .map(elem => elem.id);
        }
        setPath(normalized, 'fooldal.galeriaAtvezeto.kivalasztottKepek', kivalasztottKepek);
        const galeriaAtvezeto = getPath(normalized, 'fooldal.galeriaAtvezeto');
        if (galeriaAtvezeto && typeof galeriaAtvezeto === 'object') delete galeriaAtvezeto.kepek;

        const nailArt = getPath(normalized, 'szolgaltatasOldalak.nailArt');
        if (nailArt && typeof nailArt === 'object') {
            const korabbiNailArtKepek = Array.isArray(nailArt.kepek)
                ? nailArt.kepek.filter(kep => kep?.kep)
                : [];
            korabbiNailArtKepek.forEach(kep => {
                if (normalized.galeria.elemek.some(elem => elem?.kep === kep.kep)) return;
                let azonosito = `galeria-${randomId()}`;
                while (hasznaltAzonositok.has(azonosito)) azonosito = `galeria-${randomId()}`;
                hasznaltAzonositok.add(azonosito);
                normalized.galeria.elemek.push({
                    id: azonosito,
                    kep: kep.kep,
                    eloKep: '',
                    kepAlt: kep.kepAlt || 'Lumi Nails Nail Art munka',
                    magas: false
                });
            });
            const kertNailArtKivalasztas = new Set([
                ...(Array.isArray(nailArt.kivalasztottKepek) ? nailArt.kivalasztottKepek : []),
                ...korabbiNailArtKepek.map(kep => kep.kep)
            ]);
            const nailArtKivalasztottKepek = normalized.galeria.elemek
                .filter(elem => elem?.kep && (kertNailArtKivalasztas.has(elem.id) || kertNailArtKivalasztas.has(elem.kep)))
                .map(elem => elem.id)
                .slice(0, GALLERY_SELECTIONS.nailArt.limit);
            setPath(normalized, GALLERY_SELECTIONS.nailArt.path, nailArtKivalasztottKepek);
            delete nailArt.kepek;
        }

        const services = getPath(normalized, 'fooldal.szolgaltatasok');
        if (services && typeof services === 'object') {
            delete services.arlistaGomb;
            (services.kartyak || []).forEach(card => {
                if (card && typeof card === 'object') delete card.szeles;
            });
        }
        return normalized;
    }
    function clone(value) { return JSON.parse(JSON.stringify(value)); }
    async function optimizeImageFile(file, { includePreview = false } = {}) {
        const tamogatottTipusok = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);
        if (!tamogatottTipusok.has(String(file.type || '').toLowerCase())) {
            throw new Error('Ez a képformátum nem alakítható át biztonságosan.');
        }

        let image;
        try {
            image = await loadImageFile(file);
            const outputFormat = await preferredCanvasOutputFormat();
            const full = await createOptimizedVariant(image, file.name, {
                maxSide: IMAGE_UPLOAD_FULL_MAX_SIDE,
                maxBytes: IMAGE_UPLOAD_FULL_MAX_BYTES,
                quality: IMAGE_UPLOAD_FULL_QUALITY,
                suffix: 'full',
                outputFormat
            });
            const preview = includePreview
                ? await createOptimizedVariant(image, file.name, {
                    maxSide: IMAGE_UPLOAD_PREVIEW_MAX_SIDE,
                    maxBytes: IMAGE_UPLOAD_PREVIEW_MAX_BYTES,
                    quality: IMAGE_UPLOAD_PREVIEW_QUALITY,
                    suffix: 'preview',
                    outputFormat
                })
                : null;
            return { full, preview };
        } catch (error) {
            console.error('A kép optimalizálása nem sikerült:', error);
            throw new Error(`A kép optimalizálása nem sikerült, ezért az eredeti fájlt nem töltöttem fel. ${error?.message || 'Próbáld másik képpel.'}`);
        } finally {
            if (typeof image?.close === 'function') image.close();
        }
    }

    async function preferredCanvasOutputFormat() {
        if (!canvasOutputFormatPromise) {
            canvasOutputFormatPromise = (async () => {
                const canvas = document.createElement('canvas');
                canvas.width = 2;
                canvas.height = 2;
                const context = canvas.getContext('2d');
                if (!context) throw new Error('A böngésző nem tud képfeldolgozó felületet létrehozni.');
                context.fillStyle = '#ffffff';
                context.fillRect(0, 0, 2, 2);

                const webpBlob = await canvasToBlob(canvas, 'image/webp', 0.8);
                if (webpBlob?.type === 'image/webp') {
                    return { mimeType: 'image/webp', extension: 'webp', flatten: false };
                }

                const jpegBlob = await canvasToBlob(canvas, 'image/jpeg', 0.8);
                if (jpegBlob?.type === 'image/jpeg') {
                    return { mimeType: 'image/jpeg', extension: 'jpg', flatten: true };
                }
                throw new Error('A böngésző sem WebP-, sem JPG-kódolást nem támogat.');
            })();
        }
        return canvasOutputFormatPromise;
    }

    async function createOptimizedVariant(image, fileName, { maxSide, maxBytes, quality, suffix, outputFormat }) {
        const originalWidth = image.width || image.naturalWidth;
        const originalHeight = image.height || image.naturalHeight;
        if (!originalWidth || !originalHeight) throw new Error('A kép méretei nem olvashatók.');

        const kezdoArany = Math.min(1, maxSide / Math.max(originalWidth, originalHeight));
        let width = Math.max(1, Math.round(originalWidth * kezdoArany));
        let height = Math.max(1, Math.round(originalHeight * kezdoArany));
        let legkisebbBlob = null;

        for (let meretezes = 0; meretezes < 7; meretezes += 1) {
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const context = canvas.getContext('2d', { alpha: !outputFormat.flatten });
            if (!context) throw new Error('A böngésző nem tud képfeldolgozó felületet létrehozni.');
            if (outputFormat.flatten) {
                context.fillStyle = '#ffffff';
                context.fillRect(0, 0, width, height);
            }
            context.imageSmoothingEnabled = true;
            context.imageSmoothingQuality = 'high';
            context.drawImage(image, 0, 0, width, height);

            legkisebbBlob = null;
            for (let aktualisMinoseg = quality; aktualisMinoseg >= IMAGE_UPLOAD_MIN_QUALITY - 0.001; aktualisMinoseg -= 0.05) {
                const blob = await canvasToBlob(canvas, outputFormat.mimeType, aktualisMinoseg);
                if (!blob || blob.type !== outputFormat.mimeType) {
                    throw new Error(`A böngésző nem tud ${outputFormat.extension.toUpperCase()} képet készíteni.`);
                }
                if (!legkisebbBlob || blob.size < legkisebbBlob.size) legkisebbBlob = blob;
                if (blob.size <= maxBytes) return optimizedFileFromBlob(blob, fileName, suffix, outputFormat);
            }

            if (!legkisebbBlob || Math.max(width, height) <= 320) break;
            const celArany = Math.sqrt(maxBytes / legkisebbBlob.size) * 0.92;
            const csokkentes = Math.min(0.86, Math.max(0.58, celArany));
            width = Math.max(1, Math.round(width * csokkentes));
            height = Math.max(1, Math.round(height * csokkentes));
        }

        const maradekMeret = legkisebbBlob ? Math.ceil(legkisebbBlob.size / 1024) : 0;
        throw new Error(`A kép nem tömöríthető a beállított ${Math.ceil(maxBytes / 1024)} KB-os határ alá (${maradekMeret} KB).`);
    }

    function optimizedFileFromBlob(blob, fileName, suffix, outputFormat) {
        const alapNev = String(fileName || 'kep')
            .replace(/\.[^.]+$/, '')
            .replace(/[^a-z0-9_-]+/gi, '-')
            .replace(/^-+|-+$/g, '') || 'kep';
        return new File([blob], `${alapNev}-${suffix}.${outputFormat.extension}`, {
            type: outputFormat.mimeType,
            lastModified: Date.now()
        });
    }

    async function loadImageFile(file) {
        if ('createImageBitmap' in window) {
            try {
                return await createImageBitmap(file, { imageOrientation: 'from-image' });
            } catch (error) {
                // Safari/iOS esetekben az img fallback megb?zhat?bb lehet.
            }
        }

        return new Promise((resolve, reject) => {
            const url = URL.createObjectURL(file);
            const img = new Image();
            img.onload = () => {
                URL.revokeObjectURL(url);
                resolve(img);
            };
            img.onerror = () => {
                URL.revokeObjectURL(url);
                reject(new Error('A k?p nem olvashat?.'));
            };
            img.src = url;
        });
    }

    function canvasToBlob(canvas, type, quality) {
        return new Promise(resolve => canvas.toBlob(resolve, type, quality));
    }

    function randomId() { return globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2); }
    function cssEscape(value) { return globalThis.CSS?.escape ? CSS.escape(value) : value.replace(/([."'\\[\]])/g, '\\$1'); }
    function escapeHtml(value) {
        return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }
    function escapeAttribute(value) { return escapeHtml(value).replace(/'/g, '&#039;'); }
})();
