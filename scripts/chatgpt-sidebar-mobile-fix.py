from pathlib import Path

css_path = Path('src/admin-styles/20-workspace.css')
css = css_path.read_text(encoding='utf-8')

old_sidebar = '''  .admin-body.admin-v2 .admin-sidebar {
    width: min(280px, calc(100vw - 52px));
    padding-top: max(18px, env(safe-area-inset-top));
    transform: translateX(-105%);
    transition: transform 190ms ease;
  }

  .admin-body.admin-v2.admin-v2-menu-open .admin-sidebar {
    transform: translateX(0);
  }
'''
new_sidebar = '''  .admin-body.admin-v2 .admin-sidebar {
    width: min(244px, calc(100vw - 104px));
    height: 100dvh;
    min-height: 0;
    max-height: 100dvh;
    padding: max(14px, env(safe-area-inset-top, 0px)) 12px max(14px, env(safe-area-inset-bottom, 0px));
    overflow-y: auto;
    overscroll-behavior: contain;
    -webkit-overflow-scrolling: touch;
    transform: translateX(-105%);
    transition: transform 190ms ease;
  }

  .admin-body.admin-v2.admin-v2-menu-open {
    position: fixed;
    top: var(--admin-v2-menu-scroll-offset, 0px);
    right: 0;
    left: 0;
    width: 100%;
    overflow: hidden;
    overscroll-behavior: none;
  }

  .admin-body.admin-v2.admin-v2-menu-open .admin-sidebar {
    transform: translateX(0);
    touch-action: pan-y;
  }

  .admin-body.admin-v2 .admin-v2-nav-item {
    min-height: 44px;
    justify-content: flex-start;
    text-align: left;
  }

  .admin-body.admin-v2 .admin-v2-nav-item > span:not(.admin-v2-nav-count):not(.admin-v2-nav-alert) {
    text-align: left;
  }

  .admin-body.admin-v2 .admin-v2-sidebar-bottom {
    flex: 0 0 auto;
    gap: 5px;
    padding-top: 12px;
  }

  .admin-body.admin-v2 :is(.admin-v2-public-link, .admin-v2-profile, .admin-v2-logout) {
    text-align: left;
  }

  .admin-body.admin-v2 .admin-v2-public-link {
    justify-content: flex-start;
  }

  .admin-body.admin-v2 .admin-v2-logout {
    padding-inline: 10px;
  }
'''
if old_sidebar not in css:
    raise SystemExit('Expected mobile sidebar block not found')
css = css.replace(old_sidebar, new_sidebar, 1)
css_path.write_text(css, encoding='utf-8')

# Sidebar navigation is structural workspace UI, not a centered generic button.
components_path = Path('src/admin-styles/10-components.css')
components = components_path.read_text(encoding='utf-8')
old_members = '''  .admin-tab,
  .admin-v2-nav-item,
  .admin-v2-public-link,
  .admin-v2-profile,
  .admin-v2-logout,
  .admin-v2-button,'''
new_members = '''  .admin-tab,
  .admin-v2-button,'''
member_count = components.count(old_members)
if member_count != 2:
    raise SystemExit(f'Expected sidebar members in two shared button selectors, found {member_count}')
components = components.replace(old_members, new_members)
components_path.write_text(components, encoding='utf-8')

js_path = Path('src/admin/05-admin-workspace-v2.js')
js = js_path.read_text(encoding='utf-8')
old_menu = '''    function adminV2MenuNyitasa() {
        document.body.classList.add('admin-v2-menu-open');
        document.querySelector('[data-admin-v2-menu]')?.setAttribute('aria-expanded', 'true');
    }

    function adminV2MenuBezarasa() {
        document.body.classList.remove('admin-v2-menu-open');
        document.querySelector('[data-admin-v2-menu]')?.setAttribute('aria-expanded', 'false');
    }
'''
new_menu = '''    let adminV2MenuScrollY = 0;

    function adminV2MenuNyitasa() {
        const body = document.body;
        if (body.classList.contains('admin-v2-menu-open')) return;

        adminV2MenuScrollY = window.scrollY || document.documentElement.scrollTop || 0;
        body.style.setProperty('--admin-v2-menu-scroll-offset', `-${adminV2MenuScrollY}px`);
        body.classList.add('admin-v2-menu-open');
        document.querySelector('[data-admin-v2-menu]')?.setAttribute('aria-expanded', 'true');
    }

    function adminV2MenuBezarasa() {
        const body = document.body;
        const nyitvaVolt = body.classList.contains('admin-v2-menu-open');

        body.classList.remove('admin-v2-menu-open');
        body.style.removeProperty('--admin-v2-menu-scroll-offset');
        document.querySelector('[data-admin-v2-menu]')?.setAttribute('aria-expanded', 'false');

        if (nyitvaVolt) {
            window.scrollTo({ top: adminV2MenuScrollY, behavior: 'auto' });
        }
    }
'''
if old_menu not in js:
    raise SystemExit('Expected menu open/close functions not found')
js = js.replace(old_menu, new_menu, 1)
js_path.write_text(js, encoding='utf-8')

test_path = Path('tests/admin-production-redesign.spec.js')
test = test_path.read_text(encoding='utf-8')
anchor = '''        await expect.poll(async () => {
            return (await page.locator('.admin-v2-sidebar').boundingBox()).x;
        }).toBeGreaterThanOrEqual(-1);

        await page.locator('.admin-v2-sidebar [data-admin-v2-nav="foglalasok"]').click();
'''
replacement = '''        await expect.poll(async () => {
            return (await page.locator('.admin-v2-sidebar').boundingBox()).x;
        }).toBeGreaterThanOrEqual(-1);

        const drawerMetrics = await page.locator('.admin-v2-sidebar').evaluate(sidebar => {
            const bodyStyle = getComputedStyle(document.body);
            const sidebarRect = sidebar.getBoundingClientRect();
            const logoutRect = sidebar.querySelector('[data-admin-v2-logout]').getBoundingClientRect();
            const navItem = sidebar.querySelector('.admin-v2-nav-item');
            const navStyle = getComputedStyle(navItem);
            const label = navItem.querySelector('span:not(.admin-v2-nav-count):not(.admin-v2-nav-alert)');
            return {
                width: sidebarRect.width,
                height: sidebarRect.height,
                logoutBottom: logoutRect.bottom,
                viewportHeight: window.innerHeight,
                bodyPosition: bodyStyle.position,
                bodyOverflow: bodyStyle.overflow,
                navDisplay: navStyle.display,
                navJustify: navStyle.justifyContent,
                navTextAlign: navStyle.textAlign,
                labelTextAlign: getComputedStyle(label).textAlign
            };
        });
        expect(drawerMetrics.width).toBeLessThanOrEqual(244);
        expect(drawerMetrics.height).toBeLessThanOrEqual(drawerMetrics.viewportHeight + 1);
        expect(drawerMetrics.logoutBottom).toBeLessThanOrEqual(drawerMetrics.viewportHeight + 1);
        expect(drawerMetrics.bodyPosition).toBe('fixed');
        expect(drawerMetrics.bodyOverflow).toBe('hidden');
        expect(drawerMetrics.navDisplay).toBe('flex');
        expect(drawerMetrics.navJustify).toBe('flex-start');
        expect(drawerMetrics.navTextAlign).toBe('left');
        expect(drawerMetrics.labelTextAlign).toBe('left');

        await page.locator('.admin-v2-sidebar [data-admin-v2-nav="foglalasok"]').click();
'''
if anchor not in test:
    raise SystemExit('Expected mobile drawer test anchor not found')
test = test.replace(anchor, replacement, 1)
test_path.write_text(test, encoding='utf-8')
