(function () {
    'use strict';

    const MIME_XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

    document.addEventListener('DOMContentLoaded', () => {
        document.querySelectorAll('[data-admin-export]').forEach(button => {
            button.addEventListener('click', () => exportalas(button.dataset.adminExport, button));
        });
    });

    function exportalas(tipus, aktivGomb) {
        const gombok = Array.from(document.querySelectorAll('[data-admin-export]'));
        const eredetiFelirat = aktivGomb?.textContent || '';

        try {
            gombok.forEach(gomb => { gomb.disabled = true; });
            if (aktivGomb) aktivGomb.textContent = 'Készítés...';

            const adatForras = window.LumiAdminExportData?.[tipus];
            if (typeof adatForras !== 'function') {
                throw new Error('Az exportálható adminlista nem érhető el. Töltsd újra az oldalt.');
            }

            const adatok = adatForras();
            if (!Array.isArray(adatok) || !adatok.length) {
                throw new Error('Nincs exportálható sor az aktuális oldalon.');
            }

            const munkalap = tipus === 'esemenyek'
                ? esemenyMunkalap(adatok)
                : foglalasMunkalap(adatok);
            const fajl = xlsxMunkafuzet([munkalap]);
            const datum = new Date().toISOString().slice(0, 10);
            const nev = tipus === 'esemenyek'
                ? `luminails-esemenynaplo-${datum}.xlsx`
                : `luminails-foglalasok-${datum}.xlsx`;
            fajlLetoltese(fajl, nev);
        } catch (error) {
            console.error('Admin Excel export hiba', error);
            window.alert(error?.message || 'Az exportálás nem sikerült.');
        } finally {
            gombok.forEach(gomb => { gomb.disabled = false; });
            if (aktivGomb) aktivGomb.textContent = eredetiFelirat;
            aktivGomb?.blur();
        }
    }

    function foglalasMunkalap(foglalasok) {
        const fejlec = [
            'Típus', 'Vendég neve / megnevezés', 'Telefon', 'Email', 'Szolgáltatás', 'Ár',
            'Köröm stílus', 'Stílus megjegyzés', 'Kuponkód', 'Kupon neve', 'Kezdés',
            'Befejezés', 'Időtartam (perc)', 'Státusz', 'Megjegyzés',
            'Inspirációs képek száma', 'Létrehozva', 'Azonosító'
        ];

        const sorok = foglalasok.map(foglalas => {
            if (foglalas.__tipus === 'blocked') {
                return [
                    'Kézzel hozzáadott idő', foglalas.reason, '', '', '', '', '', '', '', '',
                    datumIdoExport(foglalas.starts_at), datumIdoExport(foglalas.ends_at),
                    idotartamPerc(foglalas.starts_at, foglalas.ends_at), 'Foglalt', '', '',
                    datumIdoExport(foglalas.created_at), 'Kézzel hozzáadott'
                ];
            }

            const szolgaltatas = Array.isArray(foglalas.services) ? foglalas.services[0] : foglalas.services;
            return [
                'Foglalás',
                foglalas.customer_name,
                foglalas.customer_phone,
                foglalas.customer_email,
                szolgaltatas?.name || foglalas.service_name,
                szolgaltatas?.price_text || foglalas.service_price_text,
                foglalas.nail_style,
                foglalas.nail_style_note,
                foglalas.coupon_code,
                foglalas.coupon_title,
                datumIdoExport(foglalas.starts_at),
                datumIdoExport(foglalas.ends_at),
                idotartamPerc(foglalas.starts_at, foglalas.ends_at),
                foglalasStatusz(foglalas.status),
                foglalas.note,
                inspiracioDarab(foglalas),
                datumIdoExport(foglalas.created_at),
                foglalas.id
            ];
        });

        return { nev: 'Foglalások', fejlec, sorok };
    }

    function esemenyMunkalap(esemenyek) {
        const fejlec = [
            'Esemény időpontja', 'Cím', 'Esemény típusa', 'Csatorna', 'Státusz', 'Üzenet',
            'Vendég neve', 'Vendég email', 'Vendég telefon', 'Foglalás időpontja', 'Metaadatok',
            'Foglalás azonosító', 'Esemény azonosító'
        ];

        const sorok = esemenyek.map(esemeny => [
            datumIdoExport(esemeny.created_at),
            esemeny.title,
            esemeny.event_type,
            esemeny.channel,
            esemeny.status,
            esemeny.message,
            esemeny.bookings?.customer_name,
            esemeny.bookings?.customer_email,
            esemeny.bookings?.customer_phone,
            datumIdoExport(esemeny.bookings?.starts_at),
            esemeny.metadata && typeof esemeny.metadata === 'object'
                ? JSON.stringify(esemeny.metadata)
                : esemeny.metadata,
            esemeny.booking_id,
            esemeny.id
        ]);

        return { nev: 'Eseménynapló', fejlec, sorok };
    }
    function inspiracioDarab(foglalas) {
        if (Array.isArray(foglalas.inspiration_images)) return foglalas.inspiration_images.length;
        return foglalas.inspiration_image_url || foglalas.inspiration_image_path ? 1 : 0;
    }

    function idotartamPerc(kezdes, vege) {
        const tol = new Date(kezdes).getTime();
        const ig = new Date(vege).getTime();
        return Number.isFinite(tol) && Number.isFinite(ig) ? Math.max(0, Math.round((ig - tol) / 60000)) : '';
    }

    function datumIdoExport(ertek) {
        if (!ertek) return '';
        const datum = new Date(ertek);
        if (Number.isNaN(datum.getTime())) return String(ertek);
        const resz = new Intl.DateTimeFormat('hu-HU', {
            year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false
        }).formatToParts(datum).reduce((obj, elem) => ({ ...obj, [elem.type]: elem.value }), {});
        return `${resz.year}-${resz.month}-${resz.day} ${resz.hour}:${resz.minute}`;
    }

    function foglalasStatusz(statusz) {
        return ({
            pending: 'Függőben',
            confirmed: 'Visszaigazolva',
            done: 'Kész',
            cancelled: 'Lemondva'
        })[statusz] || statusz || '';
    }


    function fajlLetoltese(blob, nev) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = nev;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 30000);
    }

    function xlsxMunkafuzet(munkalapok) {
        const lapok = munkalapok.map((lap, index) => ({ ...lap, nev: excelLapNev(lap.nev, index) }));
        const fajlok = [
            ['[Content_Types].xml', contentTypesXml(lapok.length)],
            ['_rels/.rels', rootRelsXml()],
            ['docProps/app.xml', appXml(lapok)],
            ['docProps/core.xml', coreXml()],
            ['xl/workbook.xml', workbookXml(lapok)],
            ['xl/_rels/workbook.xml.rels', workbookRelsXml(lapok.length)],
            ['xl/styles.xml', stylesXml()]
        ];

        lapok.forEach((lap, index) => {
            fajlok.push([`xl/worksheets/sheet${index + 1}.xml`, worksheetXml(lap)]);
        });

        return new Blob([zipFajl(fajlok)], { type: MIME_XLSX });
    }

    function worksheetXml(lap) {
        const adatok = [lap.fejlec, ...lap.sorok];
        const oszlopok = lap.fejlec.map((_, oszlop) => {
            const hossz = adatok.reduce((max, sor) => Math.max(max, cellaSzoveg(sor[oszlop]).length), 0);
            return Math.min(42, Math.max(12, hossz + 2));
        });
        const sorXml = adatok.map((sor, sorIndex) => {
            const cellak = lap.fejlec.map((_, oszlopIndex) => cellaXml(
                sor[oszlopIndex],
                sorIndex + 1,
                oszlopIndex + 1,
                sorIndex === 0 ? 1 : sorIndex % 2 === 0 ? 2 : 0
            )).join('');
            return `<row r="${sorIndex + 1}">${cellak}</row>`;
        }).join('');
        const utolsoOszlop = oszlopNev(lap.fejlec.length);
        const utolsoSor = Math.max(1, adatok.length);

        return xmlFejlec() +
            '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
            '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>' +
            '<sheetFormatPr defaultRowHeight="15"/>' +
            `<cols>${oszlopok.map((szelesseg, index) => `<col min="${index + 1}" max="${index + 1}" width="${szelesseg}" customWidth="1"/>`).join('')}</cols>` +
            `<sheetData>${sorXml}</sheetData>` +
            `<autoFilter ref="A1:${utolsoOszlop}${utolsoSor}"/>` +
            '</worksheet>';
    }

    function cellaXml(ertek, sor, oszlop, stilusIndex = 0) {
        const hivatkozas = `${oszlopNev(oszlop)}${sor}`;
        const stilus = stilusIndex ? ` s="${stilusIndex}"` : '';
        if (typeof ertek === 'number' && Number.isFinite(ertek)) {
            return `<c r="${hivatkozas}"${stilus} t="n"><v>${ertek}</v></c>`;
        }
        const szoveg = xml(cellaSzoveg(ertek));
        return `<c r="${hivatkozas}"${stilus} t="inlineStr"><is><t xml:space="preserve">${szoveg}</t></is></c>`;
    }

    function cellaSzoveg(ertek) {
        if (ertek === null || ertek === undefined) return '';
        if (typeof ertek === 'object') return JSON.stringify(ertek);
        return String(ertek);
    }

    function oszlopNev(index) {
        let nev = '';
        for (let szam = index; szam > 0; szam = Math.floor((szam - 1) / 26)) {
            nev = String.fromCharCode(65 + (szam - 1) % 26) + nev;
        }
        return nev;
    }

    function excelLapNev(nev, index) {
        const tiszta = String(nev || `Munkalap ${index + 1}`).replace(/[\\/*?:\[\]]/g, ' ').trim();
        return (tiszta || `Munkalap ${index + 1}`).slice(0, 31);
    }

    function contentTypesXml(darab) {
        const lapok = Array.from({ length: darab }, (_, index) =>
            `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`
        ).join('');
        return xmlFejlec() + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
            '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
            '<Default Extension="xml" ContentType="application/xml"/>' +
            '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
            '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
            '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>' +
            '<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>' +
            lapok + '</Types>';
    }

    function rootRelsXml() {
        return xmlFejlec() + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
            '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
            '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>' +
            '<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>' +
            '</Relationships>';
    }

    function workbookXml(lapok) {
        const sheetXml = lapok.map((lap, index) =>
            `<sheet name="${xml(lap.nev)}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`
        ).join('');
        return xmlFejlec() + '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
            '<bookViews><workbookView/></bookViews>' + `<sheets>${sheetXml}</sheets>` + '</workbook>';
    }

    function workbookRelsXml(darab) {
        const kapcsolatok = Array.from({ length: darab }, (_, index) =>
            `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`
        ).join('');
        return xmlFejlec() + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
            kapcsolatok + `<Relationship Id="rId${darab + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>` +
            '</Relationships>';
    }

    function stylesXml() {
        return xmlFejlec() + '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
            '<fonts count="2"><font><sz val="11"/><color theme="1"/><name val="Calibri"/><family val="2"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/><family val="2"/></font></fonts>' +
            '<fills count="4"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFC18C9A"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFFF6F1"/><bgColor indexed="64"/></patternFill></fill></fills>' +
            '<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color rgb="FFE4CED1"/></left><right style="thin"><color rgb="FFE4CED1"/></right><top style="thin"><color rgb="FFE4CED1"/></top><bottom style="thin"><color rgb="FFE4CED1"/></bottom><diagonal/></border></borders>' +
            '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
            '<cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/><xf numFmtId="0" fontId="0" fillId="3" borderId="0" xfId="0" applyFill="1"/></cellXfs>' +
            '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>' +
            '</styleSheet>';
    }

    function appXml(lapok) {
        const nevek = lapok.map(lap => `<vt:lpstr>${xml(lap.nev)}</vt:lpstr>`).join('');
        return xmlFejlec() + '<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">' +
            '<Application>Lumi Nails Admin</Application><HeadingPairs><vt:vector size="2" baseType="variant"><vt:variant><vt:lpstr>Munkalapok</vt:lpstr></vt:variant><vt:variant><vt:i4>' + lapok.length + '</vt:i4></vt:variant></vt:vector></HeadingPairs>' +
            `<TitlesOfParts><vt:vector size="${lapok.length}" baseType="lpstr">${nevek}</vt:vector></TitlesOfParts></Properties>`;
    }

    function coreXml() {
        const ido = new Date().toISOString();
        return xmlFejlec() + '<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">' +
            '<dc:creator>Lumi Nails Admin</dc:creator><cp:lastModifiedBy>Lumi Nails Admin</cp:lastModifiedBy>' +
            `<dcterms:created xsi:type="dcterms:W3CDTF">${ido}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${ido}</dcterms:modified>` +
            '</cp:coreProperties>';
    }

    function xmlFejlec() {
        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
    }

    function xml(ertek) {
        return String(ertek ?? '')
            .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
    }

    function zipFajl(fajlok) {
        const kodolo = new TextEncoder();
        const helyiReszek = [];
        const kozpontiReszek = [];
        let pozicio = 0;
        const { ido, datum } = dosIdoDatum(new Date());

        fajlok.forEach(([nev, tartalom]) => {
            const nevBytes = kodolo.encode(nev);
            const adat = typeof tartalom === 'string' ? kodolo.encode(tartalom) : tartalom;
            const crc = crc32(adat);
            const helyiFej = byteOsszefuzes(
                u32(0x04034b50), u16(20), u16(0x0800), u16(0), u16(ido), u16(datum),
                u32(crc), u32(adat.length), u32(adat.length), u16(nevBytes.length), u16(0), nevBytes
            );
            helyiReszek.push(helyiFej, adat);

            const kozpontiFej = byteOsszefuzes(
                u32(0x02014b50), u16(20), u16(20), u16(0x0800), u16(0), u16(ido), u16(datum),
                u32(crc), u32(adat.length), u32(adat.length), u16(nevBytes.length), u16(0), u16(0),
                u16(0), u16(0), u32(0), u32(pozicio), nevBytes
            );
            kozpontiReszek.push(kozpontiFej);
            pozicio += helyiFej.length + adat.length;
        });

        const kozponti = byteOsszefuzes(...kozpontiReszek);
        const zaras = byteOsszefuzes(
            u32(0x06054b50), u16(0), u16(0), u16(fajlok.length), u16(fajlok.length),
            u32(kozponti.length), u32(pozicio), u16(0)
        );
        return byteOsszefuzes(...helyiReszek, kozponti, zaras);
    }

    function crc32(bytes) {
        let crc = 0xffffffff;
        for (const byte of bytes) {
            crc ^= byte;
            for (let bit = 0; bit < 8; bit += 1) {
                crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
            }
        }
        return (crc ^ 0xffffffff) >>> 0;
    }

    function dosIdoDatum(ertek) {
        const ev = Math.max(1980, ertek.getFullYear());
        return {
            ido: (ertek.getHours() << 11) | (ertek.getMinutes() << 5) | Math.floor(ertek.getSeconds() / 2),
            datum: ((ev - 1980) << 9) | ((ertek.getMonth() + 1) << 5) | ertek.getDate()
        };
    }

    function u16(ertek) {
        const bytes = new Uint8Array(2);
        new DataView(bytes.buffer).setUint16(0, ertek, true);
        return bytes;
    }

    function u32(ertek) {
        const bytes = new Uint8Array(4);
        new DataView(bytes.buffer).setUint32(0, ertek >>> 0, true);
        return bytes;
    }

    function byteOsszefuzes(...reszek) {
        const hossz = reszek.reduce((osszeg, resz) => osszeg + resz.length, 0);
        const eredmeny = new Uint8Array(hossz);
        let pozicio = 0;
        reszek.forEach(resz => {
            eredmeny.set(resz, pozicio);
            pozicio += resz.length;
        });
        return eredmeny;
    }

    window.LumiAdminExport = {
        xlsxMunkafuzet,
        foglalasMunkalap,
        esemenyMunkalap
    };
})();
