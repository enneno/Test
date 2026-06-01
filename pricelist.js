(function () {
    const config = window.LUMI_SUPABASE;
    const supabaseLib = window.supabase;

    document.addEventListener('DOMContentLoaded', () => {
        if (!document.querySelector('.arlista-panel') || !config?.url || !config?.publishableKey || !supabaseLib?.createClient) {
            return;
        }

        arlistaBetoltese(supabaseLib.createClient(config.url, config.publishableKey));
    });

    async function arlistaBetoltese(kliens) {
        const { data, error } = await kliens
            .from('services')
            .select('name,price_text,duration_minutes,active,sort_order')
            .eq('active', true)
            .order('sort_order', { ascending: true });

        if (error || !Array.isArray(data) || data.length === 0) {
            return;
        }

        arlistaRenderelese(data);
    }

    function arlistaRenderelese(szolgaltatasok) {
        const panel = document.querySelector('.arlista-panel');
        const megjegyzes = panel.querySelector('.arlista-megjegyzes')?.textContent || '';
        const csoportok = szolgaltatasokCsoportositasa(szolgaltatasok);

        panel.innerHTML = '';

        const elsoKetCsoport = csoportok.slice(0, 2);
        const tobbiCsoport = csoportok.slice(2);

        if (elsoKetCsoport.length) {
            const ketOszlop = document.createElement('div');
            ketOszlop.className = 'arlista-ket-oszlop';
            elsoKetCsoport.forEach(csoport => ketOszlop.appendChild(csoportElem(csoport)));
            panel.appendChild(ketOszlop);
        }

        tobbiCsoport.forEach(csoport => panel.appendChild(csoportElem(csoport)));

        if (megjegyzes) {
            const p = document.createElement('p');
            p.className = 'arlista-megjegyzes';
            p.textContent = megjegyzes;
            panel.appendChild(p);
        }
    }

    function szolgaltatasokCsoportositasa(szolgaltatasok) {
        const terkep = new Map();

        szolgaltatasok.forEach(szolgaltatas => {
            const { csoport, nev } = szolgaltatasNevReszei(szolgaltatas.name);

            if (!terkep.has(csoport)) {
                terkep.set(csoport, []);
            }

            terkep.get(csoport).push({
                nev,
                ar: szolgaltatas.price_text || '',
                ido: idoFelirat(szolgaltatas.duration_minutes || 0)
            });
        });

        return Array.from(terkep, ([cim, tetelek]) => ({ cim, tetelek }));
    }

    function szolgaltatasNevReszei(nev) {
        const reszek = String(nev || '').split(' - ');

        if (reszek.length < 2) {
            return {
                csoport: 'Szolgáltatások',
                nev: nev || ''
            };
        }

        return {
            csoport: reszek[0],
            nev: reszek.slice(1).join(' - ')
        };
    }

    function csoportElem(csoport) {
        const doboz = document.createElement('div');
        doboz.className = 'arlista-csoport';

        const cim = document.createElement('h3');
        cim.textContent = csoport.cim;
        doboz.appendChild(cim);

        csoport.tetelek.forEach(tetel => {
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

    function idoFelirat(percOsszesen) {
        if (!percOsszesen || percOsszesen <= 0) {
            return '';
        }

        const ora = Math.floor(percOsszesen / 60);
        const perc = percOsszesen % 60;
        const reszek = [];

        if (ora > 0) {
            reszek.push(`${ora} óra`);
        }

        if (perc > 0) {
            reszek.push(`${perc} perc`);
        }

        return reszek.join(' ');
    }
})();
