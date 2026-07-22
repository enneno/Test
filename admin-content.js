(function () {
    const MAX_FILE_SIZE = 12 * 1024 * 1024;
    const IMAGE_UPLOAD_MAX_SIDE = 1800;
    const IMAGE_UPLOAD_WEBP_QUALITY = 0.85;
    const BUCKET = window.LUMI_MEDIA_BUCKET || 'site-media';
    const config = window.LUMI_SUPABASE;
    const supabaseLib = window.supabase;
    const state = { client: null, content: null, session: null, dirty: false, saving: false };

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
                field('navigacio.foglalas', 'Foglalás menüpont')
            ]
        },
        {
            title: 'Főoldal – nyitókép (hero)',
            description: 'A főoldal legfelső képes blokkja. Az itt látható kép ugyanaz, amelyet a nyilvános oldal használ.',
            fields: [
                field('fooldal.hero.kicker', 'Kis felső szöveg'),
                field('fooldal.hero.cim', 'Főcím'),
                field('fooldal.hero.leiras', 'Leírás', 'textarea'),
                image('fooldal.hero.kep', 'Nyitókép'),
                field('fooldal.hero.kepAlt', 'Nyitókép leírása')
            ]
        },
        {
            title: 'Főoldal – bemutatkozás',
            description: 'A főoldali bemutatkozó kép és a rajta megjelenő szöveg.',
            fields: [
                field('fooldal.bemutatkozas.cim', 'Cím'),
                field('fooldal.bemutatkozas.bekezdesek.0', 'Első bekezdés', 'textarea'),
                field('fooldal.bemutatkozas.bekezdesek.1', 'Második bekezdés', 'textarea'),
                image('fooldal.bemutatkozas.kep', 'Bemutatkozó kép'),
                field('fooldal.bemutatkozas.kepAlt', 'Kép leírása')
            ]
        },
        {
            title: 'Főoldal – szolgáltatások',
            description: 'A főoldalon látható négy rövid szolgáltatásleírás. Az árak és időtartamok az Árlista menüben kezelhetők.',
            fields: [
                field('fooldal.szolgaltatasok.cim', 'Szekció címe'),
                ...cardFields('fooldal.szolgaltatasok.kartyak', 0, '1. kártya'),
                ...cardFields('fooldal.szolgaltatasok.kartyak', 1, '2. kártya'),
                ...cardFields('fooldal.szolgaltatasok.kartyak', 2, '3. kártya'),
                ...cardFields('fooldal.szolgaltatasok.kartyak', 3, '4. kártya')
            ]
        },
        {
            title: 'Főoldal – galéria-előnézet',
            description: 'Az első három kép mobilon és asztali nézetben is látszik; a 4. és 5. kép csak az asztali mozaikot egészíti ki.',
            fields: [
                field('fooldal.galeriaAtvezeto.cim', 'Cím'),
                field('fooldal.galeriaAtvezeto.leiras', 'Leírás', 'textarea'),
                field('fooldal.galeriaAtvezeto.gombSzoveg', 'Gomb szövege')
            ],
            homepageGallery: true
        },
        {
            title: 'Főoldal – időpontfoglalási blokk',
            description: 'A főoldal alján, a lábléc előtt látható időpontfoglalási felhívás.',
            fields: [
                field('fooldal.foglalasAtvezeto.cim', 'Cím'),
                field('fooldal.foglalasAtvezeto.leiras', 'Leírás', 'textarea'),
                field('fooldal.foglalasAtvezeto.gombSzoveg', 'Gomb szövege')
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
            description: 'A külön Galéria oldal címe, leírása és összes képe. Ez nem azonos a főoldali ötképes előnézettel.',
            fields: [
                field('galeria.cim', 'Oldal címe'),
                field('galeria.leiras', 'Bevezető szöveg', 'textarea'),
                field('galeria.foglalasGomb', 'Foglalás gomb szövege')
            ],
            gallery: true
        },
        {
            title: 'Foglalás – kapcsolatfelvételi lehetőségek',
            description: 'A foglalási oldal bevezetője, valamint az Instagram, Messenger, SMS és online foglalás kártyái.',
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
                field('foglalas.oldal.utak.online.gomb', 'Online foglalás kártya gomb')
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
            description: 'A foglalás elküldése gomb, a lebegő gomb és a sikeres vagy hibás foglalás után megjelenő ablak szövegei.',
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
                field('foglalas.popup.bezarasGomb', 'Popup bezárás gomb')
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
        }
    ];

    document.addEventListener('DOMContentLoaded', () => {
        const root = document.getElementById('admin-cms-root');
        if (!root || !config?.url || !config?.publishableKey || !supabaseLib?.createClient) return;

        state.client = window.lumiSupabaseClient();
        root.addEventListener('input', cmsInput);
        root.addEventListener('change', cmsChange);
        root.addEventListener('click', cmsClick);
        document.getElementById('admin-cms-save')?.addEventListener('click', saveContent);
        document.getElementById('admin-cms-reload')?.addEventListener('click', loadContent);
        document.getElementById('admin-lebego-mentes')?.addEventListener('click', () => {
            if (document.getElementById('admin-panel-szovegek')?.classList.contains('aktiv')) saveContent();
        });

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
            field(`${base}.${index}.leiras`, `${label} szövege`, 'textarea')
        ];
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

        const orderedGroups = [...GROUPS.slice(1, 6), GROUPS[0], ...GROUPS.slice(6)];
        orderedGroups.forEach((group, groupIndex) => {
            const section = document.createElement('section');
            section.className = 'cms-section';
            const header = document.createElement('button');
            header.type = 'button';
            header.className = 'cms-section-toggle';
            header.dataset.cmsToggle = String(groupIndex);
            header.setAttribute('aria-expanded', groupIndex === 0 ? 'true' : 'false');
            header.innerHTML = `<span>${escapeHtml(group.title)}</span><span aria-hidden="true">${groupIndex === 0 ? '−' : '+'}</span>`;
            const body = document.createElement('div');
            body.className = 'cms-section-body';
            body.hidden = groupIndex !== 0;
            if (group.description) {
                const description = document.createElement('p');
                description.className = 'cms-section-description';
                description.textContent = group.description;
                body.appendChild(description);
            }
            const grid = document.createElement('div');
            grid.className = 'admin-grid cms-field-grid';
            group.fields.forEach(definition => grid.appendChild(renderField(definition)));
            body.appendChild(grid);
            if (group.homepageGallery) body.appendChild(renderHomepageGallery());
            if (group.gallery) body.appendChild(renderGallery());
            section.append(header, body);
            root.appendChild(section);
        });
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
        file.accept = 'image/jpeg,image/png,image/webp,image/avif,image/gif';
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

    function renderHomepageGallery() {
        const wrapper = document.createElement('div');
        wrapper.className = 'cms-home-gallery-editor';
        const heading = document.createElement('div');
        heading.className = 'cms-gallery-header';
        heading.innerHTML = '<h3>Főoldali mozaik képei</h3><span>Fix sorrend</span>';
        wrapper.appendChild(heading);

        const labels = [
            ['1. kép – nagy kiemelt kép', 'Mobilon és asztali nézetben is látható.'],
            ['2. kép – felső kis kép', 'Mobilon és asztali nézetben is látható.'],
            ['3. kép – alsó kis kép', 'Mobilon és asztali nézetben is látható.'],
            ['4. kép – asztali kiegészítő', 'Csak asztali nézetben látható.'],
            ['5. kép – asztali kiegészítő', 'Csak asztali nézetben látható.']
        ];
        const list = document.createElement('div');
        list.className = 'cms-home-gallery-list';
        labels.forEach(([titleText, noteText], index) => {
            const card = document.createElement('article');
            card.className = 'cms-gallery-item cms-home-gallery-item';
            const title = document.createElement('h4');
            title.textContent = titleText;
            const note = document.createElement('p');
            note.className = 'cms-gallery-note';
            note.textContent = noteText;
            card.append(title, note);
            card.appendChild(renderImageField(`fooldal.galeriaAtvezeto.kepek.${index}.src`, 'Kép'));
            card.appendChild(renderField(field(`fooldal.galeriaAtvezeto.kepek.${index}.alt`, 'Kép leírása')));
            list.appendChild(card);
        });
        wrapper.appendChild(list);
        return wrapper;
    }

    function renderGallery() {
        const wrapper = document.createElement('div');
        wrapper.className = 'cms-gallery-editor';
        const header = document.createElement('div');
        header.className = 'cms-gallery-header';
        header.innerHTML = '<h3>Galéria képei</h3>';
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
            const card = document.createElement('article');
            card.className = 'cms-gallery-item';
            card.dataset.galleryIndex = String(index);
            const title = document.createElement('h4');
            title.textContent = `${index + 1}. kép`;
            card.appendChild(title);
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

    function cmsInput(event) {
        if (event.target.matches('[data-cms-path]')) {
            state.dirty = true;
            updateSaveLabel();
        }
    }

    async function cmsChange(event) {
        const input = event.target.closest('[data-cms-upload]');
        if (!input || !input.files?.[0]) return;
        await uploadImage(input.dataset.cmsUpload, input.files[0], input);
    }

    function cmsClick(event) {
        const toggle = event.target.closest('[data-cms-toggle]');
        if (toggle) {
            const body = toggle.nextElementSibling;
            const open = toggle.getAttribute('aria-expanded') !== 'true';
            toggle.setAttribute('aria-expanded', String(open));
            toggle.lastElementChild.textContent = open ? '−' : '+';
            body.hidden = !open;
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
            state.content.galeria.elemek.push({ kep: '', eloKep: '', kepAlt: 'Lumi Nails köröm munka', magas: false });
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
            state.content.galeria.elemek.splice(Number(deletion.dataset.cmsGalleryDelete), 1);
            markDirtyAndRenderGallery();
        }
    }

    async function uploadImage(path, file, input) {
        if (!state.client || !state.session) return;
        if (!file.type.startsWith('image/')) {
            status('Csak k?pf?jl t?lthet? fel.', true);
            return;
        }
        if (file.size > MAX_FILE_SIZE) {
            status('A k?p legfeljebb 12 MB lehet.', true);
            return;
        }

        input.disabled = true;
        status(`K?p optimaliz?l?sa: ${file.name}...`);
        const optimalizalt = await optimizeImageFile(file);
        const uploadFile = optimalizalt.file;
        const extension = optimalizalt.extension;
        const objectPath = `uploads/${new Date().toISOString().slice(0, 10)}/${Date.now()}-${randomId()}.${extension}`;
        status(`K?p felt?lt?se: ${file.name}...`);
        const { error } = await state.client.storage.from(BUCKET)
            .upload(objectPath, uploadFile, { cacheControl: '31536000', contentType: uploadFile.type || `image/${extension}`, upsert: false });
        input.disabled = false;
        input.value = '';

        if (error) {
            console.error('K?pfelt?lt?si hiba:', error);
            status('A k?p felt?lt?se nem siker?lt. Ellen?rizd, hogy lefuttattad-e a Storage SQL r?szt.', true);
            return;
        }

        const { data } = state.client.storage.from(BUCKET).getPublicUrl(objectPath);
        setImageValue(path, data.publicUrl);
        if (/^galeria\.elemek\.\d+\.kep$/.test(path)) {
            setPath(state.content, path.replace(/\.kep$/, '.eloKep'), data.publicUrl);
        }
        status(optimalizalt.optimized
            ? 'A k?p WebP form?tumban, kisebb m?retben felt?ltve. A v?gleges?t?shez nyomd meg a Tartalom ment?se gombot.'
            : 'A k?p felt?ltve. A v?gleges?t?shez nyomd meg a Tartalom ment?se gombot.');
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

        const defaultImages = getPath(defaults, 'fooldal.galeriaAtvezeto.kepek') || [];
        const storedImages = getPath(normalized, 'fooldal.galeriaAtvezeto.kepek') || [];
        const homepageImages = Array.from({ length: 5 }, (_item, index) =>
            deepMerge(clone(defaultImages[index] || { src: '', alt: '' }), storedImages[index] || {})
        );
        setPath(normalized, 'fooldal.galeriaAtvezeto.kepek', homepageImages);

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
    async function optimizeImageFile(file) {
        const original = { file, extension: safeExtension(file), optimized: false };
        const type = String(file.type || '').toLowerCase();
        const name = String(file.name || '').toLowerCase();

        if (type === 'image/gif' || name.endsWith('.gif')) return original;

        try {
            const image = await loadImageFile(file);
            const width = image.width || image.naturalWidth;
            const height = image.height || image.naturalHeight;
            if (!width || !height) return original;

            const scale = Math.min(1, IMAGE_UPLOAD_MAX_SIDE / Math.max(width, height));
            const canvas = document.createElement('canvas');
            canvas.width = Math.max(1, Math.round(width * scale));
            canvas.height = Math.max(1, Math.round(height * scale));
            const context = canvas.getContext('2d', { alpha: true });
            if (!context) return original;

            context.drawImage(image, 0, 0, canvas.width, canvas.height);
            if (typeof image.close === 'function') image.close();

            const blob = await canvasToBlob(canvas, 'image/webp', IMAGE_UPLOAD_WEBP_QUALITY);
            if (!blob) return original;
            if (scale >= 1 && blob.size > file.size * 1.05) return original;

            const baseName = String(file.name || 'kep').replace(/\.[^.]+$/, '') || 'kep';
            const webpFile = new File([blob], `${baseName}.webp`, { type: 'image/webp', lastModified: Date.now() });
            return { file: webpFile, extension: 'webp', optimized: true };
        } catch (error) {
            console.warn('K?p optimaliz?l?sa nem siker?lt, eredeti f?jl ker?l felt?lt?sre:', error);
            return original;
        }
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

    function safeExtension(file) {
        return { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/avif': 'avif', 'image/gif': 'gif' }[file.type] || 'jpg';
    }
    function randomId() { return globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2); }
    function cssEscape(value) { return globalThis.CSS?.escape ? CSS.escape(value) : value.replace(/([."'\\[\]])/g, '\\$1'); }
    function escapeHtml(value) {
        return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }
    function escapeAttribute(value) { return escapeHtml(value).replace(/'/g, '&#039;'); }
})();