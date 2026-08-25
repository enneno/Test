# Lumi Nails PWA – bekötési jegyzet

Ez a fájl a `pwa-app-copy` próbaághoz tartozik. A `main` és az éles Supabase ettől nem változik.

## Mi van már előkészítve?

- `manifest.webmanifest`: Lumi Nails név, ikonok, standalone app mód, gyorsparancsok.
- `sw.js`: publikus oldalak biztonságos cache-elése, offline fallback, Web Push fogadás és értesítés-kattintás.
- `pwa.js`: PWA bootstrap, badge API, push feliratkozás, iPhone Home Screen ellenőrzés, admin értesítéskapcsoló.
- `supabase-web-push.sql`: Web Push előfizetések táblája közvetlen böngésző-hozzáférés nélkül.
- `supabase/functions/web-push-subscription`: hitelesített admin eszköz fel-/leiratkoztatása.
- `supabase/functions/send-web-push`: új vagy lemondott foglalásból owner push küldése.
- `tests/pwa.spec.js`: PWA és alap biztonsági regressziós tesztek.

## Élesítés előtt szükséges

1. Generálni egyetlen VAPID kulcspárt.
2. A privát kulcsot kizárólag Supabase secretként tárolni. Soha ne kerüljön GitHubba vagy böngészős JavaScriptbe.
3. Beállítandó Edge Function secret/nevek:
   - `WEB_PUSH_VAPID_PUBLIC_KEY`
   - `WEB_PUSH_VAPID_PRIVATE_KEY`
   - `WEB_PUSH_VAPID_SUBJECT` (például `mailto:luminails.xx@gmail.com`)
   - a már használt `ADMIN_EMAIL`
4. Alkalmazni a `supabase-web-push.sql` sémát az éles adatbázisban.
5. Deployolni a `web-push-subscription` és `send-web-push` Edge Functionöket JWT-ellenőrzéssel.
6. Supabase Database Webhookot létrehozni a `public.bookings` táblára:
   - INSERT → új foglalás értesítés
   - UPDATE → a funkció csak a frissen `cancelled` állapotot küldi tovább
   - cél: `send-web-push` Edge Function
   - auth: service key
7. HTTPS-en ellenőrizni iPhone-on a Home Screen telepítést és csak ezután merge-elni a `main` ágba.

## iPhone használat

Safari → Megosztás → Hozzáadás a Főképernyőhöz → Lumi Nails ikon megnyitása → Admin → `Értesítések bekapcsolása`.

Az iPhone értesítési engedélyét a rendszer csak felhasználói műveletre kéri. A foglaló, fiók és admin oldal nem kap offline oldalcache-t, ezért elavult foglalási vagy személyes adat nem jelenik meg cache-ből.

## Jelenlegi státusz

A PWA és Web Push forrás elkészült a külön ágon, de a push backend szándékosan nincs még deployolva az éles Supabase-re. A GitHub Actions futás eredményét a jelenlegi connectorból nem tudtam megerősíteni, ezért élesítés előtt a `npm run verify` és egy valódi HTTPS/iPhone teszt kötelező.
