(() => {
    'use strict';

    if (!document.body?.classList.contains('fooldal')) return;
    if (document.getElementById('fiok-ajanlo')) return;

    const hero = document.getElementById('hero');
    if (!hero) return;

    const section = document.createElement('section');
    section.id = 'fiok-ajanlo';
    section.className = 'fiok-ajanlo';
    section.setAttribute('aria-labelledby', 'fiok-ajanlo-cim');
    section.innerHTML = `
        <div class="fiok-ajanlo-belso">
            <div class="fiok-ajanlo-szoveg">
                <span class="fiok-ajanlo-kicker">Saját Lumi fiók</span>
                <h2 id="fiok-ajanlo-cim">Még egyszerűbb a következő alkalom.</h2>
                <p>Hozz létre saját fiókot, és egy helyen láthatod a foglalásaidat, korábbi időpontjaidat és elmentett adataidat.</p>
            </div>

            <div class="fiok-ajanlo-elonyok" aria-label="A vendégfiók előnyei">
                <span><strong>Foglalásaid</strong><small>egy helyen</small></span>
                <span><strong>Korábbi időpontok</strong><small>áttekinthetően</small></span>
                <span><strong>Gyorsabb foglalás</strong><small>mentett adatokkal</small></span>
            </div>

            <div class="fiok-ajanlo-akciok">
                <a href="/fiokom/?view=regisztracio" class="fiok-ajanlo-gomb fiok-ajanlo-gomb-kiemelt">Saját fiók létrehozása</a>
                <a href="/fiokom/" class="fiok-ajanlo-gomb fiok-ajanlo-gomb-masodlagos">Már van fiókom</a>
            </div>
        </div>
    `;

    hero.insertAdjacentElement('afterend', section);
})();
