function fooldalGaleriaLapozasBekotese() {
    const szinpad = document.querySelector('#galeria-atvezeto .galeria-atvezeto-kepek');
    if (!szinpad || szinpad.dataset.kartyaLapozo === 'true') {
        return;
    }

    const kartyak = Array.from(szinpad.querySelectorAll('img'));
    if (kartyak.length < 2) {
        return;
    }

    let aktualisIndex = 0;
    let huzasKezdoX = null;

    szinpad.dataset.kartyaLapozo = 'true';
    szinpad.classList.add('galeria-kartya-lapozo');
    szinpad.tabIndex = 0;
    szinpad.setAttribute('role', 'region');
    szinpad.setAttribute('aria-roledescription', 'carousel');
    szinpad.setAttribute('aria-label', 'Válogatott Lumi Nails munkák');

    const vezerlok = document.createElement('div');
    vezerlok.className = 'galeria-kartya-vezerlok';
    vezerlok.innerHTML = `
        <button type="button" class="galeria-kartya-elozo" aria-label="Előző kép">
            <span aria-hidden="true">←</span>
        </button>
        <div class="galeria-kartya-pontok" aria-label="Kép kiválasztása"></div>
        <span class="galeria-kartya-allapot" aria-live="polite"></span>
        <button type="button" class="galeria-kartya-kovetkezo" aria-label="Következő kép">
            <span aria-hidden="true">→</span>
        </button>
    `;
    szinpad.appendChild(vezerlok);

    const pontok = vezerlok.querySelector('.galeria-kartya-pontok');
    const allapot = vezerlok.querySelector('.galeria-kartya-allapot');
    const elozoGomb = vezerlok.querySelector('.galeria-kartya-elozo');
    const kovetkezoGomb = vezerlok.querySelector('.galeria-kartya-kovetkezo');

    kartyak.forEach((kartya, index) => {
        kartya.setAttribute('role', 'group');
        kartya.setAttribute('aria-roledescription', 'dia');
        kartya.setAttribute('aria-label', `${index + 1}. kép, összesen ${kartyak.length}`);

        kartya.addEventListener('click', () => {
            if (index !== aktualisIndex) {
                aktualisIndex = index;
                kartyaAllapotFrissitese();
            }
        });

        const pont = document.createElement('button');
        pont.type = 'button';
        pont.className = 'galeria-kartya-pont';
        pont.setAttribute('aria-label', `${index + 1}. kép megjelenítése`);
        pont.addEventListener('click', () => {
            aktualisIndex = index;
            kartyaAllapotFrissitese();
        });
        pontok.appendChild(pont);
    });

    const pontGombok = Array.from(pontok.querySelectorAll('.galeria-kartya-pont'));

    function kartyaAllapotFrissitese() {
        const felTavolsag = Math.floor(kartyak.length / 2);

        kartyak.forEach((kartya, index) => {
            let elteres = index - aktualisIndex;
            if (elteres > felTavolsag) elteres -= kartyak.length;
            if (elteres < -felTavolsag) elteres += kartyak.length;

            const melyseg = Math.min(Math.abs(elteres), 2);
            const aktiv = elteres === 0;
            kartya.style.setProperty('--kartya-eltolas', String(elteres));
            kartya.style.setProperty('--kartya-melyseg', String(melyseg));
            kartya.dataset.hely = String(elteres);
            kartya.style.zIndex = String(kartyak.length - melyseg);
            kartya.dataset.aktiv = String(aktiv);
            kartya.tabIndex = aktiv ? 0 : -1;
            kartya.setAttribute('aria-hidden', String(!aktiv));
        });

        pontGombok.forEach((pont, index) => {
            const aktiv = index === aktualisIndex;
            pont.dataset.aktiv = String(aktiv);
            pont.setAttribute('aria-current', aktiv ? 'true' : 'false');
        });

        allapot.textContent = `${aktualisIndex + 1} / ${kartyak.length}`;
    }

    function kartyaLepes(irany) {
        aktualisIndex = (aktualisIndex + irany + kartyak.length) % kartyak.length;
        kartyaAllapotFrissitese();
    }

    elozoGomb.addEventListener('click', () => kartyaLepes(-1));
    kovetkezoGomb.addEventListener('click', () => kartyaLepes(1));

    szinpad.addEventListener('keydown', event => {
        if (event.key === 'ArrowLeft') {
            event.preventDefault();
            kartyaLepes(-1);
        }
        if (event.key === 'ArrowRight') {
            event.preventDefault();
            kartyaLepes(1);
        }
    });

    szinpad.addEventListener('pointerdown', event => {
        if (event.button !== 0 || event.target.closest('button')) {
            return;
        }
        huzasKezdoX = event.clientX;
    });

    szinpad.addEventListener('pointerup', event => {
        if (huzasKezdoX === null) {
            return;
        }
        const elmozdulas = event.clientX - huzasKezdoX;
        huzasKezdoX = null;
        if (Math.abs(elmozdulas) < 42) {
            return;
        }
        kartyaLepes(elmozdulas > 0 ? -1 : 1);
    });

    szinpad.addEventListener('pointercancel', () => {
        huzasKezdoX = null;
    });

    kartyaAllapotFrissitese();
}
