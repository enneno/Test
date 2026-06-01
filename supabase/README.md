# Lumi Nails Supabase beállítás

## 1. Adatbázis

Supabase Dashboard > SQL Editor > New query, majd másold be és futtasd a projekt gyökerében lévő `supabase-schema.sql` teljes tartalmát.

Ez létrehozza:
- szolgáltatások
- dátumhoz kötött foglalható idősávok
- tiltott időszakok
- foglalások
- átfedés elleni védelem
- publikus foglalási függvények

Az adminban az `Árlista` fül az élő árlista és a foglalási szolgáltatáslista egyszerre. A `Foglalható dátumok` fülön konkrét dátumokra tudod felvenni, mikor dolgozol.

A foglalási oldal a `get_available_dates` függvénnyel csak azokat a dátumokat listázza, ahol az adott szolgáltatáshoz ténylegesen maradt szabad időpont.

## 2. Admin belépés

Supabase Dashboard > Authentication > Users alatt hozz létre egy admin felhasználót email + jelszóval.

Javasolt beállítás:
- Authentication > Providers > Email legyen bekapcsolva
- Authentication > Settings alatt a publikus regisztrációt kapcsold ki, ha nem szeretnéd, hogy más is fiókot hozzon létre

Az admin oldal a Supabase Auth belépést használja, így az adatbázis-műveletek csak belépett felhasználónak működnek.

## 3. Email értesítés

A foglalás e-mail nélkül is bekerül az adatbázisba. Az email küldéshez a `supabase/functions/send-booking-email` Edge Function használható.

Szükséges Supabase secrets:
- `RESEND_API_KEY`
- `OWNER_EMAIL`
- `FROM_EMAIL`

Secret kulcsot soha ne tegyél a frontend fájlokba vagy GitHubra.
