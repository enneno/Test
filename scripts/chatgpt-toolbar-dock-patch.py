from pathlib import Path
import re

shell_path = Path('pwa-admin-shell.js')
shell = shell_path.read_text(encoding='utf-8')
shell = shell.replace("tabbar.className = 'pwa-admin-tabbar';", "tabbar.className = 'pwa-admin-toolbar-dock';")
shell = shell.replace('pwa-admin-tabbar-count', 'pwa-admin-toolbar-count')
shell = shell.replace('pwa-admin-tabbar-dot', 'pwa-admin-toolbar-dot')
shell = shell.replace('pwa-admin-tabbar-save', 'pwa-admin-toolbar-save')
shell = shell.replace('pwa-admin-tabbar-button', 'pwa-admin-toolbar-button')

bell = "      ${appButton('bell', 'Értesítések', 'data-pwa-admin-notifications aria-expanded=\"false\" aria-controls=\"admin-v2-notification-panel\"', '<span class=\"pwa-admin-toolbar-dot\" data-admin-v2-email-alert data-admin-v2-notification-alert hidden></span>')}"
overview = "      ${appButton('overview', 'Áttekintés', 'data-admin-v2-nav=\"attekintes\"')}"
if overview not in shell:
    if bell not in shell:
        raise SystemExit('Expected notification toolbar item not found')
    shell = shell.replace(bell, bell + '\n' + overview, 1)

plus_icon = "      plus: '<path d=\"M12 5v14M5 12h14\"></path>'"
overview_icon = "      plus: '<path d=\"M12 5v14M5 12h14\"></path>',\n      overview: '<rect x=\"4\" y=\"4\" width=\"6\" height=\"6\" rx=\"1\"></rect><rect x=\"14\" y=\"4\" width=\"6\" height=\"6\" rx=\"1\"></rect><rect x=\"4\" y=\"14\" width=\"6\" height=\"6\" rx=\"1\"></rect><rect x=\"14\" y=\"14\" width=\"6\" height=\"6\" rx=\"1\"></rect>'"
if 'overview:' not in shell:
    if plus_icon not in shell:
        raise SystemExit('Expected plus icon not found')
    shell = shell.replace(plus_icon, overview_icon, 1)
shell_path.write_text(shell, encoding='utf-8')

css_path = Path('src/admin-styles/95-pwa.css')
css = css_path.read_text(encoding='utf-8')
css = css.replace(
    '  --pwa-admin-tabbar-height: 58px;\n  --pwa-admin-tabbar-visual-bottom: 0px;',
    '  --pwa-admin-toolbar-height: 56px;\n  --pwa-admin-toolbar-bottom: max(10px, env(safe-area-inset-bottom, 0px));'
)
css = css.replace(
    'calc(var(--pwa-admin-tabbar-height) + env(safe-area-inset-bottom, 0px) + 12px)',
    'calc(var(--pwa-admin-toolbar-height) + var(--pwa-admin-toolbar-bottom) + 12px)'
)
css = css.replace(
    'calc(var(--pwa-admin-tabbar-height) + env(safe-area-inset-bottom, 0px) + 30px)',
    'calc(var(--pwa-admin-toolbar-height) + var(--pwa-admin-toolbar-bottom) + 30px)'
)

replacement = '''.admin-body.admin-v2.lumi-admin-standalone .pwa-admin-toolbar-dock {
  position: fixed;
  z-index: 75;
  left: 50%;
  bottom: var(--pwa-admin-toolbar-bottom);
  display: grid;
  grid-template-columns: repeat(6, 44px);
  align-items: center;
  width: max-content;
  max-width: calc(100vw - 20px);
  min-height: var(--pwa-admin-toolbar-height);
  padding: 6px;
  gap: 3px;
  border: 1px solid rgba(79, 59, 53, 0.12);
  border-radius: 20px;
  background: rgba(255, 252, 249, 0.9);
  box-shadow: 0 14px 36px rgba(54, 39, 34, 0.16);
  backdrop-filter: blur(20px) saturate(140%);
  -webkit-backdrop-filter: blur(20px) saturate(140%);
  transform: translateX(-50%);
}

.admin-body.admin-v2.lumi-admin-standalone .pwa-admin-toolbar-button {
  position: relative;
  display: grid;
  width: 44px;
  min-width: 44px;
  height: 44px;
  min-height: 44px;
  padding: 0;
  place-items: center;
  border: 0;
  border-radius: 14px;
  color: var(--admin-v2-muted);
  background: transparent;
  font: inherit;
  cursor: pointer;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  transition: color 160ms ease, background-color 160ms ease, box-shadow 160ms ease, transform 160ms ease;
}

.admin-body.admin-v2.lumi-admin-standalone .pwa-admin-toolbar-button:is(.is-active, .is-open) {
  color: var(--admin-v2-brand-dark);
  background: var(--admin-v2-brand-soft);
  box-shadow: inset 0 0 0 1px rgba(122, 77, 68, 0.05);
}

.admin-body.admin-v2.lumi-admin-standalone .pwa-admin-toolbar-button:not(:disabled):active {
  transform: scale(0.94);
}

.admin-body.admin-v2.lumi-admin-standalone .pwa-admin-toolbar-button svg,
.admin-body.admin-v2.lumi-admin-standalone .pwa-admin-quick-add svg {
  position: relative;
  z-index: 1;
  width: 19px;
  height: 19px;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.8;
}

.admin-body.admin-v2.lumi-admin-standalone .pwa-admin-toolbar-save {
  color: #fff;
  background: var(--admin-v2-brand-dark);
  box-shadow: 0 7px 17px rgba(71, 47, 41, 0.22);
}

.admin-body.admin-v2.lumi-admin-standalone .pwa-admin-toolbar-save:is(:hover, :focus-visible) {
  color: #fff;
  background: var(--admin-v2-brand-dark);
}

.admin-body.admin-v2.lumi-admin-standalone .pwa-admin-toolbar-save:disabled {
  opacity: 0.38;
  box-shadow: none;
  cursor: default;
}

.admin-body.admin-v2.lumi-admin-standalone .pwa-admin-toolbar-count,
.admin-body.admin-v2.lumi-admin-standalone .pwa-admin-toolbar-dot {
  position: absolute;
  z-index: 2;
  top: 3px;
  right: 3px;
}

.admin-body.admin-v2.lumi-admin-standalone .pwa-admin-toolbar-count {
  display: grid;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  place-items: center;
  border: 2px solid rgba(255, 252, 249, 0.96);
  border-radius: 999px;
  color: #fff;
  background: var(--admin-v2-danger);
  font-size: 8px;
  font-weight: 600;
  line-height: 1;
}

.admin-body.admin-v2.lumi-admin-standalone .pwa-admin-toolbar-dot {
  width: 9px;
  height: 9px;
  border: 2px solid rgba(255, 252, 249, 0.96);
  border-radius: 999px;
  background: var(--admin-v2-danger);
}

.admin-body.admin-v2.lumi-admin-standalone .pwa-admin-toolbar-count[hidden],
.admin-body.admin-v2.lumi-admin-standalone .pwa-admin-toolbar-dot[hidden] {
  display: none;
}

.admin-body.admin-v2.lumi-admin-standalone .pwa-admin-quick-add {
  position: fixed;
  z-index: 75;
  right: 15px;
  bottom: calc(var(--pwa-admin-toolbar-height) + var(--pwa-admin-toolbar-bottom) + 14px);
  display: grid;
  width: 44px;
  height: 44px;
  padding: 0;
  place-items: center;
  border: 0;
  border-radius: 50%;
  color: #fff;
  background: var(--admin-v2-brand-dark);
  box-shadow: 0 9px 24px rgba(71, 47, 41, 0.25);
  cursor: pointer;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}

.admin-body.admin-v2.lumi-admin-standalone.admin-v2-menu-open .pwa-admin-toolbar-dock,
.admin-body.admin-v2.lumi-admin-standalone.admin-v2-menu-open .pwa-admin-quick-add {
  pointer-events: none;
}

@media (hover: hover) and (pointer: fine) {
  .admin-body.admin-v2.lumi-admin-standalone .pwa-admin-toolbar-button:not(:disabled):hover {
    color: var(--admin-v2-brand-dark);
    background: rgba(240, 228, 223, 0.72);
    transform: translateY(-3px) scale(1.06);
  }

  .admin-body.admin-v2.lumi-admin-standalone .pwa-admin-toolbar-save:not(:disabled):hover {
    color: #fff;
    background: var(--admin-v2-brand-dark);
  }
}

.admin-body.admin-v2.lumi-admin-standalone .pwa-admin-sr-only {'''

if '.pwa-admin-tabbar {' in css:
    pattern = re.compile(
        r'\.admin-body\.admin-v2\.lumi-admin-standalone \.pwa-admin-tabbar \{.*?\.admin-body\.admin-v2\.lumi-admin-standalone \.pwa-admin-sr-only \{',
        re.S
    )
    css, count = pattern.subn(replacement, css, count=1)
    if count != 1:
        raise SystemExit(f'Expected one legacy tabbar CSS block, replaced {count}')

legacy_media = re.compile(
    r'\n  \.admin-body\.admin-v2\.lumi-admin-standalone \.pwa-admin-tabbar \{\n'
    r'    right: max\(0px, calc\(\(100vw - 620px\) / 2\)\);\n'
    r'    left: max\(0px, calc\(\(100vw - 620px\) / 2\)\);\n'
    r'    border-right: 1px solid rgba\(79, 59, 53, 0\.1\);\n'
    r'    border-left: 1px solid rgba\(79, 59, 53, 0\.1\);\n'
    r'    border-radius: 18px 18px 0 0;\n'
    r'  \}\n'
)
css = legacy_media.sub('\n', css, count=1)
if 'pwa-admin-tabbar-height' in css or '.pwa-admin-tabbar' in css:
    raise SystemExit('Legacy PWA tabbar CSS remains')
css_path.write_text(css, encoding='utf-8')

pwa_test_path = Path('tests/pwa.spec.js')
pwa_test = pwa_test_path.read_text(encoding='utf-8')
pwa_test = pwa_test.replace(
    "test('standalone admin uses icon tabbar and quick-add action'",
    "test('standalone admin uses 21st-style toolbar dock and quick-add action'"
)
pwa_test = pwa_test.replace(
    '#pwa-admin-tabbar .pwa-admin-tabbar-button',
    '#pwa-admin-tabbar .pwa-admin-toolbar-button'
)
pwa_test = pwa_test.replace('toHaveCount(5);', 'toHaveCount(6);', 1)
last = "    await expect(buttons.nth(4)).toHaveAttribute('aria-label', 'Értesítések');"
if "buttons.nth(5)" not in pwa_test:
    if last not in pwa_test:
        raise SystemExit('Expected PWA toolbar assertion block not found')
    pwa_test = pwa_test.replace(
        last,
        last + "\n    await expect(buttons.nth(5)).toHaveAttribute('aria-label', 'Áttekintés');",
        1
    )
pwa_test_path.write_text(pwa_test, encoding='utf-8')

production_test_path = Path('tests/admin-production-redesign.spec.js')
production_test = production_test_path.read_text(encoding='utf-8')
production_test = production_test.replace(
    '#pwa-admin-tabbar .pwa-admin-tabbar-button',
    '#pwa-admin-tabbar .pwa-admin-toolbar-button'
)
old_count = "await expect(page.locator('#pwa-admin-tabbar .pwa-admin-toolbar-button')).toHaveCount(5);"
new_count = "await expect(page.locator('#pwa-admin-tabbar .pwa-admin-toolbar-button')).toHaveCount(6);"
if old_count in production_test:
    production_test = production_test.replace(old_count, new_count, 1)
production_test_path.write_text(production_test, encoding='utf-8')
