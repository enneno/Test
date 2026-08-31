# Helyi fejlesztés

## Fejlesztési forrás és éles példány

A projekt elsődleges fejlesztési példánya: `C:\Users\llevi\OneDrive\Asztali gép\LumiNails_test`.
Minden fejlesztést és hibajavítást ebben a mappában kell elvégezni, ellenőrizni és a tesztoldalra feltölteni.

Az éles `luminails.hu` GitHub-tároló az `enneno/LumiNails-Live`. Ebben normál fejlesztést nem végzünk; az éles tartalmat az ellenőrzött promóciós folyamat frissíti. Ha az éles tároló helyi példányára szükség van, az útvonalát minden művelet előtt külön ellenőrizni kell.

## Tesztelés és élesítés

1. A módosítás a `LumiNails_test` mappában készül el.
2. A módosítást helyileg, az `AGENTS.md` kockázatalapú szabályai szerint kell ellenőrizni. Kis vizuális változásnál nem kell teljes tesztcsomag.
3. Az `enneno/enneno.github.io` `main` ágára kerülő commit automatikusan a tesztoldalra települ, GitHubon futó alkalmazásteszt nélkül.
4. A tesztoldalon manuálisan csak a változás által érintett fontos működéseket és nézeteket kell ellenőrizni.
5. Élesítéshez az `enneno/LumiNails-Live` tárolóban kézzel kell elindítani a `Promote tested site to luminails.hu` workflow-t, megadni az ellenőrzött TEST commitot vagy ágat, majd beírni az `ELESITES` megerősítést.
6. A workflow ellenőrzi, hogy a kiválasztott TEST commit sikeresen kikerült-e a tesztoldalra, megőrzi az éles `CNAME` és `.github` fájlokat, majd ugyanazt az ellenőrzött tartalmat új GitHub-teszt futtatása nélkül menti és telepíti a `luminails.hu` oldalra.

Normál fejlesztés közben semmi nem kerül automatikusan az éles oldalra. Visszaállításhoz az utolsó promóciós commit visszavonható, majd a `Redeploy current luminails.hu site` workflow kézzel, `UJRATELEPITES` megerősítéssel újraindítható. Az újratelepítés a már helyileg ellenőrzött éles commitot teszi közzé, ezért nem futtat új tesztet.

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
- `npm test` – a Playwright böngészős tesztcsomag; csak az `AGENTS.md` szerint indokolt esetben futtatandó teljes egészében.
- `npm run verify` – a teljes helyi kiadási ellenőrzés; csak nagy kockázatú, több fontos folyamatot érintő változásnál vagy kifejezett kérésre futtatandó.
- `npm run serve` – helyi szerver a 8101-es porton.

Commit vagy push előtt a módosítás kockázatához illeszkedő legkisebb elegendő helyi ellenőrzést kell sikeresen elvégezni. A teljes `verify` nem általános előfeltétel.

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
