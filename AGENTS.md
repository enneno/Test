# AGENTS.md — LumiNails TEST fejlesztési szabályzat

Ez a fájl a `C:\Users\llevi\OneDrive\Asztali gép\LumiNails_test` projektben végzett minden munkára kötelező szabályokat rögzíti.

## Környezetek és kötelező kiadási folyamat

- A fejlesztési és ellenőrzési projekt: `C:\Users\llevi\OneDrive\Asztali gép\LumiNails_test`.
- Az éles helyi projekt útvonalát minden élesítés előtt külön, read-only ellenőrzéssel kell azonosítani; régi vagy feltételezett útvonalat tilos használni.
- Minden fejlesztést először és kizárólag a TEST projektben kell elkészíteni.
- A TEST-változtatásokat a kockázatukhoz arányosan kell átnézni; kis és egyértelmű változásnál a Git-diff és szükség esetén egy gyors vizuális ellenőrzés elegendő.
- Az ellenőrzés eredményét röviden, pontosan jelenteni kell a felhasználónak.
- A TEST-ben elkészült változtatás csak külön, kifejezett felhasználói jóváhagyás után vihető át az éles helyi projektbe vagy az éles `luminails.hu` oldalra.
- A TEST-re adott fejlesztési kérés önmagában soha nem jelent engedélyt az éles projekt vagy az éles oldal módosítására, telepítésére vagy közzétételére.
- Külön élesítési jóváhagyás nélkül az éles projekt alkalmazáskódját, konfigurációját, tartalmát és generált fájljait tilos módosítani.
- Élesítés előtt ismét ellenőrizni kell a pontos változási kört; csak a jóváhagyott TEST-változtatások vihetők át.

## Kódtisztaság és CSS-felelősség

- Egy elem vagy komponens alapmegjelenésének pontosan egy egyértelmű CSS-tulajdonosa legyen.
- Későbbi kontextusszabály csak valódi eltérést módosíthat, például pozíciót, elrendezést, térközt, reszponzív viselkedést vagy szemantikus variánst.
- Tilos hibát egymásra halmozott felülírásokkal, növelt specificitással, `!important` használatával vagy teljes stílusmásolatokkal elfedni.
- Takarításkor a duplikált felelősséget meg kell szüntetni; tilos azt újabb felülírás mögé rejteni.
- Kódtakarítás vizuális és funkcionális változás nélkül történjen, hacsak a felhasználó kifejezetten mást nem kér.
- A módosítás maradjon a lehető legkisebb, jól körülhatárolt és könnyen ellenőrizhető.
- Az alapstílus, a komponensvariáns és a környezeti eltérés felelőssége legyen világosan elkülönítve.

## Normál weboldal és PWA

- A normál weboldal és a PWA megjelenése vagy viselkedése indokolt esetben eltérhet; nem követelmény a feltétel nélküli azonosság.
- Az eltéréseket környezetspecifikus, világosan elhatárolt szabályokkal kell megvalósítani, az általános felület indokolatlan módosítása nélkül.
- Az admin standalone PWA nagyítása szándékosan tiltott.
- Az admin standalone PWA nagyítását tilos visszakapcsolni, megkerülni vagy olyan viewport-, gesztus-, CSS- vagy JavaScript-változtatással feloldani, amely újra lehetővé teszi a nagyítást.
- A nagyítási tilalom csak külön, kifejezett felhasználói utasításra változtatható meg.

## Munkavégzési korlátok

- Mindig a felhasználó által megadott változási körön belül kell maradni.
- A működő funkciókat és a meglévő felhasználói folyamatokat meg kell őrizni, hacsak a feladat kifejezetten nem kér változtatást.
- A publikus felületet, az admin felületet, a SEO-t, a sitemapet és a PWA-kódot csak akkor szabad módosítani, ha az aktuális feladat ezt kifejezetten kéri.
- Generált fájl helyett az irányadó forrásfájlt kell módosítani.
- Titkokat, kulcsokat, tokeneket és személyes adatokat tilos forráskódba vagy naplóba írni.

## Tesztelési alapelv

- Mindig a legkisebb, még kellően megbízható ellenőrzést kell választani. A tesztelés terjedelmét a tényleges változási kör és kockázat határozza meg, nem a megszokás.
- Kis vizuális, CSS-, tipográfiai, spacing-, szín-, ikon- vagy szövegmódosítás miatt tilos a teljes weboldalt vagy a teljes Playwright-csomagot végigtesztelni.
- Kis, jól körülhatárolt vizuális változásnál alapértelmezés szerint elegendő:
  1. a Git-diff ellenőrzése;
  2. az érintett oldal vagy komponens gyors vizuális ellenőrzése;
  3. csak az érintett viewport ellenőrzése, illetve desktop és mobil nézet együtt, ha a változás reszponzív viselkedést érint.
- Egyszerű vizuális vagy szöveges módosításnál automatizált tesztet, Lighthouse-, axe- vagy teljes oldalas auditot csak akkor kell futtatni, ha a változás közvetlenül érinti az adott területet, vagy konkrét kockázat indokolja.
- Interakciós vagy működési logika módosításánál kizárólag a közvetlenül érintett célzott Playwright-specet vagy a lehető legszűkebb tesztesetet kell futtatni.
- Közös CSS-, navigációs vagy megosztott komponens módosításánál néhány reprezentatív érintett oldal ellenőrizhető, de ez önmagában nem indokol teljes tesztcsomagot.
- Teljes tesztcsomag csak akkor indokolt, ha a változás Supabase-t, hitelesítést, foglalási adatot, Storage-ot, e-mailt, közös buildfolyamatot, függőséget vagy több fontos felhasználói folyamatot egyszerre érint, illetve ha a felhasználó ezt kifejezetten kéri.
- Egy kis változtatás ellenőrzése nem válhat indokolatlan, hosszú — például félórás — teljes oldalas teszteléssé. Ha egy célzott ellenőrzés váratlanul széles vagy lassú lesz, meg kell állni és újra kell szűkíteni a tesztkört.
- Tilos nem érintett oldalakat és funkciókat „biztonság kedvéért” vagy rutinból tesztelni.
- Tilos ugyanazt a sikeres tesztet érdemi kódváltozás nélkül újrafuttatni.
- Sikertelen teszt után csak a hibához kapcsolódó javítást és a szükséges célzott ellenőrzést kell megismételni; a sikertelen célzott teszt nem jogosít fel automatikusan teljes tesztcsomag futtatására.

## GitHub és kiadás

- A GitHubon semmilyen automatikus teszt nem futhat.
- A GitHub-folyamat kizárólag a helyileg már ellenőrzött és késznek ítélt TEST-verzió közzétételére szolgálhat.
- GitHubra csak olyan változtatás tölthető fel, amelyet helyileg, a fenti kockázatalapú szabályok szerint már megfelelőnek ítéltünk.
- A push vagy a GitHub Pages közzététel nem indíthat új tesztet, auditot vagy teljes ellenőrzést.
- Az élesítés nem tesztel újra; kizárólag a felhasználó által külön jóváhagyott, helyileg ellenőrzött és sikeresen közzétett TEST commit emelhető át.

## Ellenőrzés és jelentés

- Módosítás előtt ellenőrizni kell a Git-állapotot és a releváns fájlokat.
- Módosítás után ellenőrizni kell a Git-diffet, hogy csak a kért fájlok változtak-e.
- A felhasználónak pontosan fel kell sorolni a módosított vagy létrehozott fájlokat és az elvégzett ellenőrzéseket.
- Külön jelezni kell, hogy történt-e bármilyen változás az éles projektben. Alapértelmezés szerint ennek válasza: nem.
