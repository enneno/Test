# Vendégfiók biztonsági és élesítési jegyzet

## Biztonsági alapelvek

- A Supabase Auth kezeli a jelszót és a hitelesítési tokeneket. A `public` sémában nincs jelszó vagy jelszóhash.
- A használható `customer_profiles` sor csak hitelesített e-maillel, nem anonim és nem tiltott Auth-fiókhoz jöhet létre.
- A kliens soha nem küldhet foglalástulajdonos-azonosítót. Az Edge Function ellenőrzi a JWT-t a Supabase Auth szerverével, majd a service-role-only RPC kapcsolja atomikusan a foglalást a felhasználóhoz.
- Bejelentkezett foglalásnál a beküldött e-mailnek pontosan egyeznie kell a hitelesített Auth e-maillel.
- A vendég nem kap közvetlen SELECT policy-t a `bookings` táblára. Csak a szűkített `get_my_booking_history` RPC válaszát láthatja.
- Régi foglalás csak a bejelentkezett felhasználó Supabase-ben hitelesített e-mailjének pontos egyezése után kapcsolható a fiókhoz.
- A profilértékek nem jogosultsági források. A név és telefonszám felhasználói adat; adminjogot kizárólag a privát admin-engedélylista adhat.
- A jelszó-visszaállítás válasza nem jelzi, hogy létezik-e a megadott e-mailhez fiók.
- Sikeres jelszó-visszaállítás után minden korábbi munkamenet visszavonásra kerül.

## Kötelező élesítési sorrend

1. Alkalmazd a `supabase-customer-accounts-security.sql` migrációt. Ez a vendégfiók funkciókapcsolóját alapból kikapcsolva hozza létre.
2. Futtasd le az RLS negatív tesztjeit anon, hitelesített idegen felhasználó és a saját felhasználó szerepkörével.
3. A Supabase Auth beállításaiban kapcsold be és hagyd kötelezően az e-mail-megerősítést.
4. Állíts be legalább 12 karakteres szerveroldali jelszóminimumot, szivárgott jelszó ellenőrzést és megfelelő Auth rate limiteket.
5. Állíts be CAPTCHA-védelmet a regisztrációhoz és a jelszó-helyreállításhoz, mielőtt a publikus regisztráció éles lesz.
6. Add az Auth redirect allowlisthez kizárólag a szükséges URL-eket, például `https://luminails.hu/fiokom/`. Wildcard ne kerüljön az éles listára.
7. Telepítsd a módosított `create-booking-with-email` Edge Functiont. Az anonim foglalás megmarad, a JWT-t tartalmazó kérés viszont hibánál zártan áll le.
8. Kerüljön ki a `fiokom/` oldal, az `account.js` és a módosított publikus navigáció, miközben a funkciókapcsoló még kikapcsolt állapotban van.
9. Csak az összes ellenőrzés után állítsd a `site_settings.customer_accounts.enabled` értékét `true`-ra.

## Resend SMTP

- A domaint előbb igazolni kell a Resendben, SPF- és DKIM-rekordokkal; DMARC is javasolt.
- A Resend API-kulcs kizárólag a Supabase Auth egyedi SMTP-jelszava legyen. Ne kerüljön JavaScriptbe, gitbe vagy publikus környezeti fájlba.
- Külön feladó javasolt az Auth-levelekhez, például `Lumi Nails <fiok@luminails.hu>`.
- A megerősítő és jelszó-visszaállító sablont a Supabase Auth sablonjai között kell kialakítani; a Resend ebben a folyamatban SMTP-kézbesítő.
- A feladó domaint, a linkek célját és a válaszcímet élesítés előtt valódi postaládával kell ellenőrizni.

## Kötelező ellenőrzések élesítés után

- Nem megerősített regisztráció nem kap sessiont és nem hoz létre `customer_profiles` sort.
- Egy vendég sem közvetlen REST-lekérdezéssel, sem módosított RPC-paraméterrel nem lát más foglalást vagy profilt.
- Az anonim foglalás továbbra is működik, de nem kap `customer_user_id` értéket.
- A hitelesített foglalás a megfelelő fiókhoz kapcsolódik, eltérő beküldött e-maillel pedig elutasításra kerül.
- A jelszó-visszaállító link a megengedett `fiokom/` URL-re érkezik, és sikeres csere után a korábbi sessionök nem használhatók.
- A Supabase Security és Performance Advisor nem jelez új, megoldatlan RLS-, jogosultság- vagy indexhibát.

## Tudatosan külön következő lépés

A teljes önkiszolgáló fióktörlés nincs ebben az egységben. Ehhez friss újrahitelesítés, service-role Edge Function, foglalásmegőrzési szabály és auditált törlési/anonimizálási folyamat szükséges; egyszerű kliensoldali törlés nem lenne biztonságos.
