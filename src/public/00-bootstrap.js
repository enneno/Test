const metaThemeColor = document.createElement('meta');
metaThemeColor.name = 'theme-color';
metaThemeColor.content = '#fdf4e2';
document.head.appendChild(metaThemeColor);

let galeriaAktualisIndex = 0;
let galeriaKepek = [];
let galeriaHuzasKezdoX = 0;
let galeriaHuzasKezdoY = 0;
let galeriaHuzasAktiv = false;

document.addEventListener('DOMContentLoaded', function () {
    tisztaUrlBeallitasa();
    Promise.all([fejlecBetoltese(), lablecBetoltese()])
        .then(() => adatokBetoltese())
        .then(async adatok => {
            oldalAdatokAlkalmazasa(adatok);
            await onlineTelefonLathatosagAlkalmazasa();
            await onlineArlistaBetoltese();
            await onlineKuponokBetolteseEsMegjelenitese();
            galeriaBekotese();
        })
        .catch(error => {
            console.warn('Lumi Nails tartalom betöltési hiba:', error);
        })
        .finally(() => oldalTartalomMegjelenitese());
    idopontokGeneralasa();
    datumMinimumBeallitasa();
    foglalasiUrlapBekotese();
    galeriaBekotese();
    lebegoFoglalasLetrehozasa();
    lebegoFoglalasFigyeles();
});
