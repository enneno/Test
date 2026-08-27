from pathlib import Path


def replace_once(text, old, new, label):
    if old not in text:
        raise SystemExit(f'Missing expected block: {label}')
    return text.replace(old, new, 1)


workspace_path = Path('src/admin-styles/20-workspace.css')
workspace = workspace_path.read_text(encoding='utf-8')

workspace = replace_once(
    workspace,
    '''  --admin-v2-sidebar: 228px;\n  --admin-v2-topbar: 64px;\n  --admin-v2-bg: #f7f4f1;''',
    '''  --admin-v2-sidebar: 228px;\n  --admin-v2-topbar: 64px;\n  --admin-v2-shell-top-reserve: var(--admin-v2-topbar);\n  --admin-v2-shell-bottom-reserve: 0px;\n  --admin-v2-workspace-top-gap: 28px;\n  --admin-v2-workspace-inline-gap: 42px;\n  --admin-v2-workspace-bottom-gap: 50px;\n  --admin-v2-bg: #f7f4f1;''',
    'workspace spacing tokens'
)

workspace = replace_once(
    workspace,
    '  min-height: calc(100vh - var(--admin-v2-topbar));\n  margin: 0;\n  padding: 0;\n  contain: none;',
    '  min-height: calc(100vh - var(--admin-v2-shell-top-reserve));\n  margin: 0;\n  padding: 0;\n  contain: none;',
    'live panel shell reserve'
)

workspace = replace_once(
    workspace,
    '''.admin-body.admin-v2 .admin-workspace-layout {\n  display: block;\n  width: 100%;\n  min-height: calc(100vh - var(--admin-v2-topbar));\n}''',
    '''.admin-body.admin-v2 .admin-workspace-layout {\n  display: block;\n  width: 100%;\n  min-height: calc(100vh - var(--admin-v2-shell-top-reserve));\n}''',
    'workspace layout shell reserve'
)

workspace = replace_once(
    workspace,
    '''.admin-body.admin-v2 .admin-workspace-status {\n  top: auto;\n  right: 20px;''',
    '''.admin-body.admin-v2 .admin-workspace-status {\n  position: fixed;\n  z-index: 120;\n  top: auto;\n  right: 20px;''',
    'workspace status fixed positioning'
)

workspace = replace_once(
    workspace,
    '''  width: min(380px, calc(100vw - 40px));\n  padding: 11px 14px;\n  border-radius: 11px;''',
    '''  width: min(380px, calc(100vw - 40px));\n  margin: 0;\n  padding: 11px 14px;\n  border-radius: 11px;''',
    'workspace status margin reset'
)

workspace = replace_once(
    workspace,
    '''.admin-body.admin-v2 .admin-workspace-main {\n  width: calc(100% - var(--admin-v2-sidebar));\n  max-width: none;\n  min-height: calc(100vh - var(--admin-v2-topbar));\n  margin-left: var(--admin-v2-sidebar);\n  padding: calc(var(--admin-v2-topbar) + 28px) 42px 50px;\n  overflow: visible;\n}''',
    '''.admin-body.admin-v2 .admin-workspace-main {\n  width: calc(100% - var(--admin-v2-sidebar));\n  max-width: none;\n  min-height: calc(100vh - var(--admin-v2-shell-top-reserve));\n  margin-left: var(--admin-v2-sidebar);\n  padding-top: calc(var(--admin-v2-shell-top-reserve) + var(--admin-v2-workspace-top-gap));\n  padding-right: var(--admin-v2-workspace-inline-gap);\n  padding-bottom: calc(var(--admin-v2-shell-bottom-reserve) + var(--admin-v2-workspace-bottom-gap));\n  padding-left: var(--admin-v2-workspace-inline-gap);\n  overflow: visible;\n}''',
    'canonical workspace padding'
)

workspace = replace_once(
    workspace,
    '''@media (max-width: 900px) {\n  .admin-body.admin-v2 {\n    --admin-v2-topbar: 58px;\n  }''',
    '''@media (max-width: 900px) {\n  .admin-body.admin-v2 {\n    --admin-v2-topbar: 58px;\n    --admin-v2-workspace-top-gap: 22px;\n    --admin-v2-workspace-inline-gap: 17px;\n    --admin-v2-workspace-bottom-gap: 42px;\n  }''',
    'tablet workspace spacing tokens'
)

workspace = replace_once(
    workspace,
    '''  .admin-body.admin-v2 .admin-workspace-main {\n    width: 100%;\n    margin-left: 0;\n    padding: calc(var(--admin-v2-topbar) + 22px) 17px 42px;\n  }''',
    '''  .admin-body.admin-v2 .admin-workspace-main {\n    width: 100%;\n    margin-left: 0;\n  }''',
    'tablet workspace structural override'
)

workspace = replace_once(
    workspace,
    '''@media (max-width: 640px) {\n  .admin-body.admin-v2 .admin-v2-topbar-actions .admin-v2-button {''',
    '''@media (max-width: 640px) {\n  .admin-body.admin-v2 {\n    --admin-v2-workspace-top-gap: 18px;\n    --admin-v2-workspace-inline-gap: 12px;\n    --admin-v2-workspace-bottom-gap: 34px;\n  }\n\n  .admin-body.admin-v2 .admin-v2-topbar-actions .admin-v2-button {''',
    'mobile workspace spacing tokens'
)

workspace = replace_once(
    workspace,
    '''\n  .admin-body.admin-v2 .admin-workspace-main {\n    padding: calc(var(--admin-v2-topbar) + 18px) 12px 34px;\n  }\n''',
    '\n',
    'remove duplicated mobile workspace padding'
)

workspace_path.write_text(workspace, encoding='utf-8')

pwa_path = Path('src/admin-styles/95-pwa.css')
pwa = pwa_path.read_text(encoding='utf-8')

pwa = replace_once(
    pwa,
    '''.admin-body.admin-v2.lumi-admin-standalone {\n  --pwa-admin-toolbar-height: 56px;\n  --pwa-admin-toolbar-bottom: max(10px, env(safe-area-inset-bottom, 0px));\n}''',
    '''.admin-body.admin-v2.lumi-admin-standalone {\n  --pwa-admin-toolbar-height: 56px;\n  --pwa-admin-toolbar-bottom: max(10px, env(safe-area-inset-bottom, 0px));\n  --admin-v2-shell-top-reserve: 0px;\n  --admin-v2-shell-bottom-reserve: calc(var(--pwa-admin-toolbar-height) + var(--pwa-admin-toolbar-bottom));\n}''',
    'PWA shell reserve tokens'
)

pwa = replace_once(
    pwa,
    '''.admin-body.admin-v2.lumi-admin-standalone .admin-workspace-main {\n  width: 100%;\n  min-height: 100vh;\n  margin-left: 0;\n  padding: 16px 12px calc(var(--pwa-admin-toolbar-height) + var(--pwa-admin-toolbar-bottom) + 30px);\n}\n\n.admin-body.admin-v2.lumi-admin-standalone .admin-live-panel,\n.admin-body.admin-v2.lumi-admin-standalone .admin-workspace-layout {\n  min-height: 100vh;\n}''',
    '''.admin-body.admin-v2.lumi-admin-standalone .admin-workspace-main {\n  width: 100%;\n  margin-left: 0;\n}''',
    'PWA workspace uses canonical spacing'
)

pwa = replace_once(
    pwa,
    '''@media (min-width: 768px) {\n  .admin-body.admin-v2.lumi-admin-standalone .admin-workspace-main {\n    padding-right: 20px;\n    padding-left: 20px;\n  }\n\n}\n\n''',
    '',
    'remove duplicated PWA inline padding'
)

pwa_path.write_text(pwa, encoding='utf-8')


test_path = Path('tests/admin-production-redesign.spec.js')
test = test_path.read_text(encoding='utf-8')

test = replace_once(
    test,
    '''async function openAdmin(page, viewport) {\n    await page.setViewportSize(viewport);\n    const browserErrors = [];''',
    '''async function openAdmin(page, viewport, { standalone = false } = {}) {\n    await page.setViewportSize(viewport);\n    if (standalone) {\n        await page.addInitScript(() => {\n            Object.defineProperty(window.navigator, 'standalone', {\n                configurable: true,\n                value: true\n            });\n        });\n    }\n    const browserErrors = [];''',
    'standalone-aware admin test helper'
)

helper_anchor = '''    return browserErrors;\n}\n\ntest.describe('production admin redesign', () => {'''
helper_replacement = '''    return browserErrors;\n}\n\nasync function collectAdminHeadingTops(page) {\n    const groups = ['attekintes', 'foglalasok', 'vendegek', 'munkaido', 'weboldal', 'kommunikacio', 'beallitasok'];\n    return page.evaluate(async groupsToMeasure => {\n        const result = {};\n        for (const group of groupsToMeasure) {\n            const button = document.querySelector(`.admin-v2-nav [data-admin-v2-nav="${group}"]`);\n            if (!button) throw new Error(`Missing admin navigation for ${group}`);\n            button.click();\n            await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));\n            const heading = document.querySelector('.admin-db-panel.aktiv > .admin-v2-page-heading');\n            if (!heading) throw new Error(`Missing active page heading for ${group}`);\n            result[group] = heading.getBoundingClientRect().top;\n        }\n        return result;\n    }, groups);\n}\n\nfunction expectHeadingTopsAligned(tops) {\n    const values = Object.values(tops);\n    expect(Math.max(...values) - Math.min(...values)).toBeLessThanOrEqual(1);\n}\n\ntest.describe('production admin redesign', () => {'''
test = replace_once(test, helper_anchor, helper_replacement, 'heading top measurement helper')

insert_at = test.rfind('\n});')
if insert_at == -1:
    raise SystemExit('Could not find end of production admin describe block')

new_tests = r'''

    test('mobile browser: every admin panel shares the same canonical top spacing', async ({ page }) => {
        const browserErrors = await openAdmin(page, { width: 390, height: 844 });
        const tops = await collectAdminHeadingTops(page);
        expectHeadingTopsAligned(tops);

        const metrics = await page.evaluate(() => {
            const bodyStyle = getComputedStyle(document.body);
            const main = document.querySelector('.admin-workspace-main');
            const mainStyle = getComputedStyle(main);
            const topbar = document.querySelector('.admin-v2-topbar');
            const status = document.getElementById('admin-online-status');
            return {
                topbarDisplay: getComputedStyle(topbar).display,
                topbarHeight: topbar.getBoundingClientRect().height,
                workspaceTopGap: parseFloat(bodyStyle.getPropertyValue('--admin-v2-workspace-top-gap')),
                workspaceBottomGap: parseFloat(bodyStyle.getPropertyValue('--admin-v2-workspace-bottom-gap')),
                paddingTop: parseFloat(mainStyle.paddingTop),
                paddingBottom: parseFloat(mainStyle.paddingBottom),
                statusPosition: getComputedStyle(status).position,
                pwaToolbarCount: document.querySelectorAll('#pwa-admin-tabbar').length
            };
        });

        expect(metrics.topbarDisplay).not.toBe('none');
        expect(metrics.statusPosition).toBe('fixed');
        expect(metrics.pwaToolbarCount).toBe(0);
        expect(Math.abs(metrics.paddingTop - (metrics.topbarHeight + metrics.workspaceTopGap))).toBeLessThanOrEqual(1);
        expect(Math.abs(metrics.paddingBottom - metrics.workspaceBottomGap)).toBeLessThanOrEqual(1);
        expect(browserErrors).toEqual([]);
    });

    test('standalone app: every admin panel shares the same content spacing while the bottom toolbar owns only its shell reserve', async ({ page }) => {
        const browserErrors = await openAdmin(page, { width: 390, height: 844 }, { standalone: true });
        await expect(page.locator('body')).toHaveClass(/lumi-admin-standalone/);
        await expect(page.locator('#pwa-admin-tabbar')).toBeVisible();

        const tops = await collectAdminHeadingTops(page);
        expectHeadingTopsAligned(tops);

        const metrics = await page.evaluate(() => {
            const bodyStyle = getComputedStyle(document.body);
            const main = document.querySelector('.admin-workspace-main');
            const mainStyle = getComputedStyle(main);
            const topbar = document.querySelector('.admin-v2-topbar');
            const toolbar = document.getElementById('pwa-admin-tabbar');
            const status = document.getElementById('admin-online-status');
            return {
                topbarDisplay: getComputedStyle(topbar).display,
                workspaceTopGap: parseFloat(bodyStyle.getPropertyValue('--admin-v2-workspace-top-gap')),
                workspaceBottomGap: parseFloat(bodyStyle.getPropertyValue('--admin-v2-workspace-bottom-gap')),
                paddingTop: parseFloat(mainStyle.paddingTop),
                paddingBottom: parseFloat(mainStyle.paddingBottom),
                toolbarHeight: toolbar.getBoundingClientRect().height,
                statusPosition: getComputedStyle(status).position
            };
        });

        expect(metrics.topbarDisplay).toBe('none');
        expect(metrics.statusPosition).toBe('fixed');
        expect(Math.abs(metrics.paddingTop - metrics.workspaceTopGap)).toBeLessThanOrEqual(1);
        expect(metrics.paddingBottom).toBeGreaterThanOrEqual(metrics.workspaceBottomGap + metrics.toolbarHeight);
        expect(browserErrors).toEqual([]);
    });
'''

test = test[:insert_at] + new_tests + test[insert_at:]
test_path.write_text(test, encoding='utf-8')
