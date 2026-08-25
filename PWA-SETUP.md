# Lumi Nails PWA – állapot és bekötés

Ez a fájl a `pwa-app-copy` próbaághoz tartozik. A GitHub `main` továbbra is változatlan.

## PWA működési elv

A PWA semmilyen normál weboldal-kérést nem kezel át és nem cache-el:

- a `sw.js` nem tartalmaz `fetch` event handlert;
- nincs Cache API használat;
- nincs offline fallback;
- CSS, JS, képek, navigáció és Supabase-kérések mindig ugyanúgy mennek, mint PWA nélkül;
- nincs `viewport-fit=cover` vagy más layoutot módosító PWA-szabály;
- az értesítési engedélyt csak az admin `Értesítések bekapcsolása` gombja kéri.

A service worker kizárólag a Web Push fogadásához és az értesítésre kattintás kezeléséhez szükséges.

## Elkészült frontend

- `manifest.webmanifest`: Lumi Nails név, ikonok, standalone app mód, gyorsparancsok.
- `sw.js`: push-only service worker, fetch/cache nélkül.
- `pwa.js`: PWA bootstrap, badge API, iPhone Home Screen ellenőrzés, admin értesítéskapcsoló.
- `tests/pwa.spec.js`: regressziós tesztek, többek között annak ellenőrzése, hogy a service worker nem interceptál normál kérést.

## Elkészült backend

Az éles Luminails Supabase projektbe additív módon bekerült:

- `public.web_push_subscriptions` – külön push-feliratkozás tábla, anon/authenticated közvetlen hozzáférés nélkül;
- VAPID kulcspár és belső webhook secret Supabase Vaultban;
- `get_web_push_server_config()` – csak service role számára elérhető config RPC;
- `web-push-subscription` Edge Function – kizárólag a hitelesített admin készülék fel-/leiratkozásához;
- `send-web-push` Edge Function – új foglalás, `cancelled` és `cancelled_by_customer` eseményekhez;
- `enqueue_booking_web_push()` trigger function – aszinkron `pg_net` hívás, teljes hibanyeléssel;
- `bookings_web_push_after_change` trigger – INSERT vagy status UPDATE esetén fut.

A meglévő `bookings` oszlopok, foglalási RPC-k, email queue és Resend folyamat nem lett átírva.

## Miért nem tudja elrontani a foglalást?

A trigger csak `AFTER INSERT` / `AFTER UPDATE OF status` eseményen fut. A `pg_net` HTTP-kérés aszinkron és csak a tranzakció commitja után indul. A trigger belső blokkja minden push-oldali hibát elkap, majd visszaadja a foglalási sort. Ezért egy hibás vagy elérhetetlen push szolgáltatás nem tudja rollbackelni a foglalást.

Ezt rollbackes próbával is ellenőriztük: egy meglévő foglalás tranzakción belül átállt `cancelled` státuszra, a trigger hiba nélkül lefutott, majd rollback után az eredeti `done` státusz megmaradt.

A `send-web-push` külön dummy tesztje HTTP 200 választ adott, és a `cancelled_by_customer` tesztet is helyesen lemondásként ismerte fel. A teszt idején 0 push-feliratkozó volt, így valódi készülékre nem ment tesztüzenet.

## Következő iPhone-lépés

A frontend még nincs merge-ölve a `main` ágba, ezért a luminails.hu jelenlegi weboldala még nem regisztrál service workert és nem mutatja az admin push gombot.

Amikor a frontend ellenőrzése kész, a PWA-fájlok mehetnek a `main`-be. Ezután iPhone-on:

Safari → Megosztás → Hozzáadás a Főképernyőhöz → Lumi Nails ikon → Admin → `Értesítések bekapcsolása`.
