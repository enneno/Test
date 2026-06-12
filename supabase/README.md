# Lumi Nails Supabase beállítás

## 1. Adatbázis

Supabase Dashboard > SQL Editor > New query, majd másold be és futtasd a projekt gyökerében lévő `supabase-schema.sql` teljes tartalmát.

Ez létrehozza:
- szolgáltatások
- dátumhoz kötött foglalható idősávok
- tiltott időszakok
- foglalások
- online oldalbeállítások, például a telefonszám láthatósága
- átfedés elleni védelem
- publikus foglalási függvények

Az adminban az `Árlista` fül az élő árlista és a foglalási szolgáltatáslista egyszerre. A `Foglalható dátumok` fülön konkrét dátumokra tudod felvenni, mikor dolgozol.

A foglalási oldal a `get_available_dates` függvénnyel csak azokat a dátumokat listázza, ahol az adott szolgáltatáshoz ténylegesen maradt szabad időpont.

Ha a régi adatbázis már fut, elég a gyökérben lévő `supabase-date-availability-migration.sql` friss tartalmát újra futtatni. Ez hozzáadja a `Kész` foglalási státuszt és az online telefonszám láthatóság beállítását is.

## 2. Admin belépés

Supabase Dashboard > Authentication > Users alatt hozz létre egy admin felhasználót email + jelszóval.

Javasolt beállítás:
- Authentication > Providers > Email legyen bekapcsolva
- Authentication > Settings alatt a publikus regisztrációt kapcsold ki, ha nem szeretnéd, hogy más is fiókot hozzon létre

Az admin oldal a Supabase Auth belépést használja, így az adatbázis-műveletek csak belépett felhasználónak működnek.

## 3. Email értesítés

A foglalás email nélkül is bekerül az adatbázisba. Az email küldéshez a `supabase/functions/send-booking-email` Edge Function van előkészítve.

Foglalás után két email megy ki:
- neked egy részletes értesítés az új foglalásról, benne egy `.ics` naptár csatolmánnyal
- a vendégnek egy visszaigazoló email a foglalás adataival

Admin módosítás után a vendég automatikus emailt kap, ha a foglalás vissza lett igazolva, le lett mondva, vagy az időpont dátuma/kezdése/vége módosult. A `Kész` státusz önmagában nem küld emailt.

Az `.ics` csatolmányt iPhone-on a Mail/Naptár általában eseményként tudja megnyitni, így gyorsan fel tudod venni a saját naptáradba.

Szükséges Supabase secrets:
- `RESEND_API_KEY`
- `OWNER_EMAIL` például `sajat-email@example.com`
- `FROM_EMAIL` például `Lumi Nails <foglalas@luminails.hu>`
- `REPLY_TO_EMAIL` például `sajat-email@example.com`

Secret kulcsot soha ne tegyél a frontend fájlokba vagy GitHubra.

Javasolt ingyenes email szolgáltató: Resend.

Éles használathoz a `luminails.hu` domaint érdemes hitelesíteni Resendben. Amíg nincs domain hitelesítés, a `Lumi Nails <onboarding@resend.dev>` feladó leginkább tesztelésre jó, és korlátozott lehet, hogy kinek tud emailt küldeni.

Supabase CLI-vel az élesítés menete:

```bash
supabase login
supabase link --project-ref htbpzvmlegapaphsipax
supabase secrets set RESEND_API_KEY=ide_jon_a_resend_api_kulcs
supabase secrets set OWNER_EMAIL=sajat-email@example.com
supabase secrets set FROM_EMAIL="Lumi Nails <foglalas@luminails.hu>"
supabase secrets set REPLY_TO_EMAIL=sajat-email@example.com
supabase functions deploy send-booking-email
supabase functions deploy send-booking-update-email
```

Ha még nincs Resend domain hitelesítés, ideiglenesen ezt használd:

```bash
supabase secrets set FROM_EMAIL="Lumi Nails <onboarding@resend.dev>"
```
