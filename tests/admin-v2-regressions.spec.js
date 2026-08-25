const fs = require('fs');
const path = require('path');
const { test, expect } = require('playwright/test');

test('a Weboldal V2 fejléc mindig tartalmaz Tartalom mentése gombot', async () => {
    const source = fs.readFileSync(
        path.resolve(__dirname, '..', 'src', 'admin', '05-admin-workspace-v2.js'),
        'utf8'
    );

    expect(source).toMatch(/szovegek:\s*\{[\s\S]*?save:\s*'Tartalom mentése'[\s\S]*?\}/);
});

test('a Weboldal V2 mentés közvetlenül a CMS mentést használja', async () => {
    const source = fs.readFileSync(
        path.resolve(__dirname, '..', 'src', 'admin', '05-admin-workspace-v2.js'),
        'utf8'
    );

    expect(source).toContain("aktivPanel?.id === 'admin-panel-szovegek'");
    expect(source).toContain("document.getElementById('admin-cms-save')?.click()");
});

test('a V2 mentés nem rejtett lebegő gomb kattintását használja', async () => {
    const source = fs.readFileSync(
        path.resolve(__dirname, '..', 'src', 'admin', '05-admin-workspace-v2.js'),
        'utf8'
    );

    expect(source).toContain('lebegoMentes();');
    expect(source).not.toContain('adminElemek().lebegoMentes?.click()');
});

test('a régi rejtett admin Mentés gomb teljesen eltűnt a forrásból', async () => {
    const files = [
        'admin/index.html',
        'src/admin/00-bootstrap-auth-calendar.js',
        'admin-content.js',
        'src/admin-styles/admin-workspace-v2.css',
        'src/styles/10-public-components.css',
        'src/styles/40-admin.css',
        'src/styles/99-unified-design.css'
    ];

    for (const file of files) {
        const source = fs.readFileSync(path.resolve(__dirname, '..', file), 'utf8');
        expect(source, file).not.toContain('admin-lebego-mentes');
    }
});
test('az admin Vendégfiókok nézete csak regisztrált Auth-fiókokat kér le', async () => {
    const source = fs.readFileSync(
        path.resolve(__dirname, '..', 'src', 'admin', '12-customer-profiles.js'),
        'utf8'
    );
    const sql = fs.readFileSync(
        path.resolve(__dirname, '..', 'supabase-admin-customer-profiles-security.sql'),
        'utf8'
    );

    expect(source).toContain(".rpc('admin_registered_customer_profiles')");
    expect(source).toContain(".rpc('admin_registered_customer_bookings'");
    expect(source).not.toContain(".from('admin_customer_profiles')");
    expect(source).not.toContain(".from('admin_customer_bookings')");

    expect(sql).toContain('drop view if exists public.admin_customer_profiles');
    expect(sql).toContain('drop view if exists public.admin_customer_bookings');
    expect(sql).not.toContain('create view public.admin_customer_profiles');
    expect(sql).not.toContain('create view public.admin_customer_bookings');
    expect(sql).toContain('if not public.is_lumi_admin() then');
    expect(sql).toContain('revoke all on function public.admin_registered_customer_profiles() from public, anon');
    expect(sql).toContain('grant execute on function public.admin_registered_customer_profiles() to authenticated, service_role');
});
