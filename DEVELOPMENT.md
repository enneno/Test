# Helyi fejlesztés

## Egyetlen forrásmappa

A projekt elsődleges helyi példánya: `D:\Asztal\Luminails`.
A módosításokat és az ellenőrzéseket mindig ebben a mappában kell futtatni. A régi, C: meghajtón maradt másolat nem forrás.

## Szerkeszthető források

A böngésző által betöltött nagy fájlok automatikusan épülnek:

- `src/styles/` → `style.css`
- `src/public/` → `script.js`
- `src/booking/` → `booking.js`
- `src/admin/` → `admin-supabase.js`

A gyökérben lévő négy generált fájlt ne szerkeszd közvetlenül. A kisebb forrásrészt módosítsd, majd futtasd az építést.

Az önálló `admin-content.js`, `supabase-config.js` és a HTML-fájlok továbbra is közvetlenül szerkeszthetők.

## Parancsok

- `npm run build` – összeállítja a böngészőnek szánt CSS/JS fájlokat.
- `npm run assets:version` – a fájlok tartalmából frissíti a cache-verziókat a HTML-ben.
- `npm run check` – statikus ellenőrzések, szintaxis, hivatkozások, Supabase-kliens, CSS-szabályok és forrás/bundle egyezés.
- `npm test` – Edge-alapú böngészős füsttesztek mobil és asztali nézetben.
- `npm run verify` – a teljes helyi kiadási ellenőrzés a megfelelő sorrendben.
- `npm run serve` – helyi szerver a 8101-es porton.

A `verify` sikeres futása nélkül ne készüljön commit vagy push.

## Biztonság

A böngészőben csak a Supabase nyilvános publishable kulcsa szerepelhet. Service role kulcsot, e-mail szolgáltatói kulcsot és más titkot kizárólag Supabase Secretként szabad tárolni.