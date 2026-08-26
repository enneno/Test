(() => {
    const INTERAKTIV = 'button, a, input, select, textarea, label, [role="button"], [contenteditable="true"]';

    document.addEventListener('DOMContentLoaded', () => {
        const lista = document.getElementById('admin-foglalas-lista');
        if (!lista) return;

        lista.addEventListener('click', event => {
            const kartya = event.target.closest('.admin-foglalas-kartya');
            if (!kartya || !lista.contains(kartya) || event.target.closest(INTERAKTIV)) return;
            if (kartya.classList.contains('szerkeszt')) return;

            const reszletekGomb = kartya.querySelector('[data-foglalas-reszletek]');
            if (!reszletekGomb) return;

            reszletekGomb.click();
            window.requestAnimationFrame(() => kartyaAriaFrissitese(kartya));
        });

        lista.addEventListener('keydown', event => {
            const kartya = event.target.closest('.admin-foglalas-kartya');
            if (!kartya || event.target !== kartya || kartya.classList.contains('szerkeszt')) return;
            if (event.key !== 'Enter' && event.key !== ' ') return;

            const reszletekGomb = kartya.querySelector('[data-foglalas-reszletek]');
            if (!reszletekGomb) return;

            event.preventDefault();
            reszletekGomb.click();
            window.requestAnimationFrame(() => kartyaAriaFrissitese(kartya));
        });

        const observer = new MutationObserver(() => {
            lista.querySelectorAll('.admin-foglalas-kartya').forEach(kartyaElokeszitese);
        });
        observer.observe(lista, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
        lista.querySelectorAll('.admin-foglalas-kartya').forEach(kartyaElokeszitese);
    });

    function kartyaElokeszitese(kartya) {
        const reszletekGomb = kartya.querySelector('[data-foglalas-reszletek]');
        if (!reszletekGomb) return;
        if (!kartya.hasAttribute('tabindex')) kartya.tabIndex = 0;
        if (!kartya.classList.contains('admin-foglalas-kartya-kattinthato')) {
            kartya.classList.add('admin-foglalas-kartya-kattinthato');
        }
        kartyaAriaFrissitese(kartya);
    }

    function kartyaAriaFrissitese(kartya) {
        const nyitott = kartya.classList.contains('admin-foglalas-kartya-nyitott');
        kartya.setAttribute('aria-expanded', String(nyitott));
        kartya.setAttribute('aria-label', nyitott ? 'Foglalás részleteinek bezárása' : 'Foglalás részleteinek megnyitása');
    }
})();
