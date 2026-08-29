# Helyi fejlesztés

## Fejlesztési forrás és éles példány

A projekt elsődleges fejlesztési példánya: `D:\Asztal\LumiNails_Test`.
Minden fejlesztést és hibajavítást ebben a mappában kell elvégezni, ellenőrizni és a tesztoldalra feltölteni.

A `D:\Asztal\Luminails` mappa az éles `luminails.hu` tároló helyi példánya. Ebben normál fejlesztést nem végzünk; az éles tartalmat az ellenőrzött promóciós folyamat frissíti.

## Tesztelés és élesítés

1. A módosítás a `LumiNails_Test` mappában készül el.
2. A `main` ágra kerülő commit teljes ellenőrzés után automatikusan a tesztoldalra települ.
3. A tesztoldalon manuálisan is ellenőrizzük a fontos működéseket.
4. Élesítéshez az `enneno/Test` tárolóban kézzel kell elindítani a `Promote tested site to luminails.hu` workflow-t.
5. A workflow ellenőrzi, hogy a kiválasztott TEST commit GitHub Pages telepítése már sikeresen lefutott, megőrzi az éles `CNAME` és `.github` fájlokat, majd ismételt teljes tesztfuttatás nélkül ugyanazt az ellenőrzött verziót telepíti a `luminails.hu` oldalra.

Normál fejlesztés közben semmi nem kerül automatikusan az éles oldalra. Visszaállításhoz az utolsó promóciós commit visszavonható, majd a `Redeploy current luminails.hu site` workflow kézzel újraindítható.

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
## Foglalási megbízhatósági frissítés telepítése

1. Futtasd a Supabase SQL Editorban a `supabase-booking-reliability.sql` fájlt.
2. Telepítsd újra ezeket az Edge Functionöket:
   - `create-booking-with-email`
   - `upload-booking-inspirations`
   - `send-booking-email`
   - `send-booking-update-email`
   - `process-booking-notifications`
3. A már beállított `process-booking-notifications` cron ezután az új foglalási és admin módosítási e-mailek tartós újrapróbálását is elvégzi.

A vendég továbbra is regisztráció nélkül tölthet fel inspirációs képet. A böngésző azonban nem kap közvetlen Storage-írási jogot: az Edge Function ellenőrzi a foglaláshoz tartozó egyszer használatos műveleti kulcsot, majd a képet privát bucketbe menti.

Az 1–2. külön auditpont (admin jogosultsági modell és a rövid önkiszolgáló kód próbálkozáskorlátozása) szándékosan nincs ebben a migrációban.
