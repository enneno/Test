// Small admin copy overrides that should remain independent from workspace structure.

ADMIN_V2_PAGE_COPY.szolgaltatasok.title = 'Árlista';

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', arlistaFeliratokFrissitese);
} else {
    arlistaFeliratokFrissitese();
}

function arlistaFeliratokFrissitese() {
    window.requestAnimationFrame(() => {
        document.querySelectorAll('.admin-v2-subnav [data-admin-v2-panel="szolgaltatasok"]').forEach(gomb => {
            gomb.textContent = 'Árlista';
        });
    });
}
