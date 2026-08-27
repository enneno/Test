from pathlib import Path
import re


def read(path):
    return Path(path).read_text(encoding='utf-8')


def write(path, text):
    Path(path).write_text(text, encoding='utf-8')


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected 1 occurrence, got {count}')
    return text.replace(old, new, 1)


def replace_between(text, start, end, replacement, label):
    a = text.find(start)
    if a < 0:
        raise SystemExit(f'{label}: start marker not found')
    b = text.find(end, a)
    if b < 0:
        raise SystemExit(f'{label}: end marker not found')
    return text[:a] + replacement.rstrip() + '\n\n' + text[b:]


# 1) Canonical shared component owner.
components_path = 'src/admin-styles/10-components.css'
components = read(components_path)
components = replace_once(
    components,
    '.admin-body .admin-mezo input[type="checkbox"],\n.admin-body .admin-mezo.admin-checkbox input[type="checkbox"],\n.admin-body .admin-db-grid .admin-mezo.admin-checkbox input[type="checkbox"] {',
    '.admin-body .admin-mezo input[type="checkbox"],\n.admin-body .admin-mezo.admin-checkbox input[type="checkbox"],\n.admin-body .admin-db-grid .admin-mezo.admin-checkbox input[type="checkbox"],\n.admin-body .cms-gallery-home-choice input[type="checkbox"] {',
    'shared checkbox selector'
)

shared_controls = r'''
/* Shared segmented navigation: visual treatment belongs here; feature files own only layout. */
.admin-body.admin-v2 :is(
  #admin-panel-foglalasok .admin-foglalas-nezetvalto,
  #admin-panel-szovegek .cms-view-tabs
) {
  gap: 2px;
  padding: 3px;
  border: 1px solid var(--admin-v2-border);
  border-radius: 12px;
  background: #f3eeea;
  box-shadow: inset 0 1px 2px rgba(67, 42, 35, .035);
}

.admin-body.admin-v2 :is(
  #admin-panel-foglalasok .admin-foglalas-nezet-gomb,
  #admin-panel-szovegek .cms-view-tab
) {
  display: inline-flex;
  min-height: 34px;
  padding: 0 12px;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 9px;
  color: var(--admin-v2-muted);
  background: transparent;
  font-family: inherit;
  font-size: 11px;
  font-weight: 600;
  line-height: 1;
  cursor: pointer;
  transition: color 150ms ease, background-color 150ms ease, box-shadow 150ms ease;
}

.admin-body.admin-v2 :is(
  #admin-panel-foglalasok .admin-foglalas-nezet-gomb.aktiv,
  #admin-panel-szovegek .cms-view-tab[aria-selected="true"]
) {
  color: var(--admin-v2-brand-dark);
  background: var(--admin-v2-surface);
  box-shadow: 0 1px 4px rgba(67, 42, 35, .12);
}

/* Shared compact icon button. Visual size stays compact; the pseudo element keeps a 44px touch target. */
.admin-body.admin-v2 #admin-tartalom .admin-control-icon-button {
  position: relative;
  display: inline-grid;
  flex: 0 0 var(--admin-ui-icon-button-size);
  width: var(--admin-ui-icon-button-size);
  min-width: var(--admin-ui-icon-button-size);
  height: var(--admin-ui-icon-button-size);
  min-height: var(--admin-ui-icon-button-size);
  padding: 0;
  place-items: center;
  overflow: visible;
  border: 1px solid var(--admin-v2-border);
  border-radius: var(--admin-ui-icon-radius);
  color: var(--admin-v2-brand);
  background: var(--admin-v2-surface);
  box-shadow: 0 1px 3px rgba(67, 42, 35, .06);
  font-size: 0;
  line-height: 1;
  cursor: pointer;
  touch-action: manipulation;
  transition: color 140ms ease, border-color 140ms ease, background-color 140ms ease, box-shadow 140ms ease, transform 140ms ease;
}

.admin-body.admin-v2 #admin-tartalom .admin-control-icon-button::after {
  position: absolute;
  inset: calc((var(--admin-ui-touch-target) - var(--admin-ui-icon-button-size)) / -2);
  content: "";
}

.admin-body.admin-v2 #admin-tartalom .admin-control-icon-button:not(:disabled):hover {
  border-color: rgba(163, 93, 117, .34);
  color: var(--admin-v2-brand-dark);
  background: var(--admin-v2-brand-soft);
  box-shadow: 0 3px 10px rgba(67, 42, 35, .075);
  transform: translateY(-1px);
}

.admin-body.admin-v2 #admin-tartalom .admin-control-icon-button:focus-visible {
  outline: 2px solid var(--admin-v2-brand);
  outline-offset: 2px;
}

.admin-body.admin-v2 #admin-tartalom .admin-control-icon-button:disabled {
  cursor: default;
  opacity: .34;
  transform: none;
  box-shadow: none;
}

.admin-body.admin-v2 #admin-tartalom .admin-control-icon-button svg {
  width: 16px;
  height: 16px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
  pointer-events: none;
}
'''
components = replace_once(
    components,
    '/* Fields: visual treatment and geometry are centralized. */',
    shared_controls.strip() + '\n\n/* Fields: visual treatment and geometry are centralized. */',
    'shared visual primitives insertion'
)

pagination_block = r'''
/* Shared pagination: bookings, event log and gallery all use this visual primitive. */
.admin-body .admin-lapozo {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  flex-wrap: nowrap;
  gap: 7px;
  margin-top: 18px;
  padding-bottom: 0;
  color: var(--barna);
  font-weight: 600;
  overflow: visible;
}

.admin-body .admin-lapozo-felso {
  margin-top: 10px;
  margin-bottom: 12px;
}

.admin-body .admin-lapozo-nav {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 3px;
  border: 1px solid var(--admin-v2-border);
  border-radius: 12px;
  background: var(--admin-v2-surface-soft);
}

.admin-body .admin-pagination-button {
  display: inline-flex;
  height: 36px;
  min-height: 36px;
  padding: 0 10px;
  align-items: center;
  justify-content: center;
  gap: 5px;
  border: 0;
  border-radius: 9px;
  color: var(--admin-v2-muted);
  background: transparent;
  font-family: inherit;
  font-size: 10px;
  font-weight: 600;
  line-height: 1;
  cursor: pointer;
}

.admin-body .admin-pagination-button svg {
  width: 15px;
  height: 15px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.admin-body .admin-pagination-button:not(:disabled):hover {
  color: var(--admin-v2-brand-dark);
  background: var(--admin-v2-surface);
  box-shadow: 0 1px 3px rgba(67, 42, 35, .09);
}

.admin-body .admin-pagination-button:disabled {
  cursor: default;
  opacity: .34;
}

.admin-body .admin-pagination-page {
  display: grid;
  min-width: 46px;
  height: 36px;
  padding: 0 8px;
  place-items: center;
  border-radius: 9px;
  color: var(--admin-v2-brand-dark);
  background: var(--admin-v2-surface);
  box-shadow: 0 1px 3px rgba(67, 42, 35, .08);
  font-size: 11px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.admin-body .admin-lapozo-jobb {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-left: auto;
}

.admin-body .admin-oldalmeret,
.admin-body .admin-pagination-size {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin: 0;
  color: var(--admin-v2-subtle);
  font-size: 9px;
  font-weight: 600;
  white-space: nowrap;
}

.admin-body .admin-oldalmeret-select,
.admin-body .admin-pagination-size .admin-oldalmeret-select {
  width: 62px;
  min-width: 62px;
  height: 38px;
  min-height: 38px;
  padding: 0 24px 0 10px;
  border-color: var(--admin-v2-border);
  border-radius: var(--admin-ui-control-radius);
  background-color: var(--admin-v2-surface);
  background-position: right 8px center;
  background-size: 13px 13px;
  font-weight: 600;
}

@media (max-width: 480px) {
  .admin-body .admin-pagination-button span { display: none; }
  .admin-body .admin-pagination-button {
    width: 30px;
    min-width: 30px;
    height: 30px;
    min-height: 30px;
    padding: 0;
  }
  .admin-body .admin-pagination-page {
    min-width: 40px;
    height: 30px;
    padding-inline: 6px;
  }
  .admin-body .admin-lapozo-nav { padding: 2px; }
  .admin-body .admin-lapozo {
    min-height: 36px;
    gap: 6px 8px;
  }
  .admin-body .admin-lapozo-felso { margin: 6px 0; }
  .admin-body .admin-pagination-size .admin-oldalmeret-select,
  .admin-body .admin-oldalmeret .admin-oldalmeret-select {
    width: 96px;
    min-width: 96px;
    height: 34px;
    min-height: 34px;
  }
}
'''
components = replace_between(
    components,
    '/* Pagination is shared by bookings and event log. */',
    '/* Reusable compact editable rows. */',
    pagination_block,
    'shared pagination section'
)
write(components_path, components)


# 2) Booking feature keeps layout/semantics only.
bookings_path = 'src/admin-styles/30-bookings.css'
bookings = read(bookings_path)
bookings = bookings.replace('  --booking-action-size: var(--admin-ui-icon-button-size);\n', '')
bookings = bookings.replace('var(--booking-action-size)', 'var(--admin-ui-icon-button-size)')
bookings = replace_between(
    bookings,
    '.admin-body.admin-v2 #admin-panel-foglalasok .admin-foglalas-nezetvalto {',
    '.admin-body.admin-v2 #admin-panel-foglalasok .admin-foglalas-nezet-gomb::before {',
    '''.admin-body.admin-v2 #admin-panel-foglalasok .admin-foglalas-nezetvalto {
  display: inline-grid;
  width: 168px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}
.admin-body.admin-v2 #admin-panel-foglalasok .admin-foglalas-nezet-gomb { gap: 7px; }''',
    'booking segmented visual ownership'
)
active_rule = '''.admin-body.admin-v2 #admin-panel-foglalasok .admin-foglalas-nezet-gomb.aktiv {
  color: var(--admin-v2-brand-dark);
  background: var(--admin-v2-surface);
  box-shadow: 0 1px 4px rgba(67, 42, 35, .12);
}
'''
bookings = replace_once(bookings, active_rule, '', 'booking segmented active duplicate')
bookings = replace_between(
    bookings,
    '.admin-body.admin-v2 #admin-panel-foglalasok .admin-lapozo-nav {',
    '/* Canonical card list */',
    '',
    'booking pagination visual ownership'
)
icon_geometry = re.compile(r'''/\* Lucide action icons \*/\n\.admin-body\.admin-v2 #admin-panel-foglalasok :is\(\[data-foglalas-szerkesztes\], \.admin-kezi-ido-naptar\) \{.*?\n\}\n(?=\.admin-body\.admin-v2 #admin-panel-foglalasok \[data-foglalas-szerkesztes\]::before,)''', re.S)
bookings, count = icon_geometry.subn('''/* Lucide action icons: shared button chrome comes from 10-components.css. */
.admin-body.admin-v2 #admin-panel-foglalasok .admin-booking-icon-button {
  color: var(--booking-state-color);
}
''', bookings, count=1)
if count != 1:
    raise SystemExit(f'booking icon geometry: expected 1 replacement, got {count}')
booking_touch = re.compile(r'''\.admin-body\.admin-v2 #admin-panel-foglalasok \[data-foglalas-szerkesztes\]::after,\n\.admin-body\.admin-v2 #admin-panel-foglalasok \.admin-kezi-ido-naptar::after \{\n  position: absolute;\n  inset: calc\(\(var\(--admin-ui-touch-target\) - var\(--admin-ui-icon-button-size\)\) / -2\);\n  content: "";\n\}\n''')
bookings, count = booking_touch.subn('', bookings, count=1)
if count != 1:
    raise SystemExit(f'booking icon touch duplicate: expected 1 replacement, got {count}')
mobile_pager = re.compile(r'''    \.admin-body\.admin-v2 #admin-panel-foglalasok \.admin-pagination-button span \{ display: none; \}\n.*?    \.admin-body\.admin-v2 #admin-panel-foglalasok \.admin-pagination-size \.admin-oldalmeret-select \{\n      width: 96px;\n      min-width: 96px;\n      height: 34px;\n      min-height: 34px;\n      padding-left: 10px;\n    \}\n''', re.S)
bookings, count = mobile_pager.subn('', bookings, count=1)
if count != 1:
    raise SystemExit(f'booking mobile pager duplicates: expected 1 replacement, got {count}')
bookings = replace_once(
    bookings,
    '''    .admin-body.admin-v2 #admin-panel-foglalasok .admin-foglalas-nezetvalto {
      width: 138px;
      gap: 2px;
      padding: 2px;
    }
    .admin-body.admin-v2 #admin-panel-foglalasok .admin-foglalas-nezet-gomb {
      height: 30px;
      min-height: 30px;
      gap: 5px;
      padding-inline: 8px;
    }
''',
    '''    .admin-body.admin-v2 #admin-panel-foglalasok .admin-foglalas-nezetvalto { width: 138px; }
    .admin-body.admin-v2 #admin-panel-foglalasok .admin-foglalas-nezet-gomb { gap: 5px; }
''',
    'booking mobile segmented layout'
)
write(bookings_path, bookings)


# 3) Content editor: shared checkbox and segmented chrome.
content_path = 'src/admin-styles/40-content-editor.css'
content = read(content_path)
content = replace_once(
    content,
    '.cms-gallery-home-choice input { flex: 0 0 auto; width: 18px; height: 18px; margin: 0; accent-color: var(--akcentus); }',
    '.cms-gallery-home-choice input { flex: 0 0 auto; margin: 0; }',
    'gallery checkbox duplicate geometry'
)
content = replace_between(
    content,
    '.admin-body.admin-v2 #admin-panel-szovegek .cms-view-tabs {',
    '.admin-body.admin-v2 #admin-panel-szovegek .cms-view-tabs::-webkit-scrollbar {',
    '''.admin-body.admin-v2 #admin-panel-szovegek .cms-view-tabs {
  position: sticky;
  z-index: 18;
  top: calc(var(--admin-v2-topbar) + 8px);
  display: flex;
  overflow-x: auto;
  backdrop-filter: blur(16px);
  scrollbar-width: none;
}''',
    'cms segmented container visual ownership'
)
content = replace_between(
    content,
    '.admin-body.admin-v2 #admin-panel-szovegek .cms-view-tab {',
    '.admin-body.admin-v2 #admin-panel-szovegek .cms-view-tab small {',
    '''.admin-body.admin-v2 #admin-panel-szovegek .cms-view-tab {
  flex: 1 0 auto;
  min-width: max-content;
  gap: 0;
  white-space: nowrap;
}''',
    'cms segmented item visual ownership'
)
visual_tab_rule = '''.admin-body.admin-v2 #admin-panel-szovegek .cms-view-tab {
  border: 0;
  color: var(--admin-v2-muted);
  background: transparent;
  font-family: inherit;
  cursor: pointer;
  transition: color 150ms ease, background-color 150ms ease, box-shadow 150ms ease;
}
.admin-body.admin-v2 #admin-panel-szovegek .cms-view-tab[aria-selected="true"] {
  color: var(--admin-v2-brand-dark);
  background: var(--admin-v2-surface);
  box-shadow: 0 2px 8px rgba(67, 42, 35, .08);
}
'''
content = replace_once(content, visual_tab_rule, '', 'cms segmented duplicate visual rules')
content = replace_once(
    content,
    '  .admin-body.admin-v2 #admin-panel-szovegek .cms-view-tab { min-height: 36px; padding-inline: 11px; }\n',
    '',
    'cms mobile segmented duplicate geometry'
)
write(content_path, content)


# 4) Image icon buttons keep only CMS-specific semantics/layout.
image_controls_path = 'src/admin-styles/42-cms-image-controls.css'
image_controls = read(image_controls_path)
image_controls = replace_between(
    image_controls,
    '.admin-body.admin-v2 #admin-panel-szovegek .cms-icon-button {',
    '.admin-body.admin-v2 #admin-panel-szovegek .cms-icon-button-danger {',
    '',
    'cms icon button visual ownership'
)
image_controls, count = re.subn(r'\.admin-body\.admin-v2 #admin-panel-szovegek \.cms-icon-button svg \{.*?\n\}\n\n', '', image_controls, count=1, flags=re.S)
if count != 1:
    raise SystemExit(f'cms icon svg: expected 1 replacement, got {count}')
write(image_controls_path, image_controls)


# 5) Gallery pagination uses the canonical classes; page-size geometry is no longer local.
gallery_path = 'src/admin-styles/45-gallery-editor.css'
gallery = read(gallery_path)
gallery = replace_between(
    gallery,
    '.admin-body.admin-v2 #admin-panel-szovegek #admin-cms-root[data-lumi-cms-gallery-context="images"] .cms-gallery-page-nav {',
    '.admin-body.admin-v2 #admin-panel-szovegek #admin-cms-root[data-lumi-cms-gallery-context="images"] .cms-gallery-list {',
    '',
    'gallery pagination duplicate visuals'
)
mobile_size = re.compile(r'''\n  \.admin-body\.admin-v2 #admin-panel-szovegek #admin-cms-root\[data-lumi-cms-gallery-context="images"\] \.cms-gallery-page-size \.admin-oldalmeret-select \{.*?\n  \}\n''', re.S)
gallery, count = mobile_size.subn('\n', gallery, count=1)
if count != 1:
    raise SystemExit(f'gallery mobile page-size duplicate: expected 1 replacement, got {count}')
write(gallery_path, gallery)


gallery_js_path = 'src/admin/45-gallery-workspace.js'
gallery_js = read(gallery_js_path)
for old, new in [
    ('class="cms-gallery-page-nav"', 'class="admin-lapozo-nav"'),
    ('class="cms-gallery-page-button"', 'class="admin-pagination-button"'),
    ('class="cms-gallery-page-label"', 'class="admin-pagination-page"'),
    ('class="cms-gallery-page-size"', 'class="admin-oldalmeret admin-pagination-size"')
]:
    if old not in gallery_js:
        raise SystemExit(f'gallery pagination markup missing: {old}')
    gallery_js = gallery_js.replace(old, new)
write(gallery_js_path, gallery_js)


# 6) CMS + booking action buttons share the same icon-button primitive.
image_js_path = 'src/admin/46-cms-image-workspace.js'
image_js = read(image_js_path)
image_js = replace_once(
    image_js,
    "                        upload.classList.remove('cms-icon-button');",
    "                        upload.classList.remove('cms-icon-button', 'admin-control-icon-button');",
    'gallery hidden upload removes shared icon class'
)
image_js = replace_once(
    image_js,
    "        label.classList.add('cms-icon-button');",
    "        label.classList.add('cms-icon-button', 'admin-control-icon-button');",
    'image upload shared icon class'
)
image_js = replace_once(
    image_js,
    "        button.classList.add('cms-icon-button');",
    "        button.classList.add('cms-icon-button', 'admin-control-icon-button');",
    'image button shared icon class'
)
write(image_js_path, image_js)


booking_js_path = 'src/admin/10-bookings-events.js'
booking_js = read(booking_js_path)
count = booking_js.count('class="admin-booking-icon-button')
if count < 2:
    raise SystemExit(f'booking icon button markup: expected at least 2, got {count}')
booking_js = booking_js.replace('class="admin-booking-icon-button', 'class="admin-booking-icon-button admin-control-icon-button')

event_start = '    function esemenynaploLapozoHtml() {'
event_end = '    function esemenynaploLapozoRenderelese() {'
event_html = r'''    function esemenynaploLapozoHtml() {
        const osszes = esemenynaploOsszesOldal();
        const vanElem = allapot.esemenynaploElemek.length > 0;
        const oldalSzoveg = vanElem ? `${allapot.esemenynaploOldal} / ${osszes}` : '0 / 0';
        return `
            <div class="admin-lapozo-nav" role="group" aria-label="Eseménynapló lapozása">
                <button type="button" class="admin-pagination-button" data-esemenynaplo-oldal="elozo" aria-label="Előző oldal" title="Előző oldal" ${allapot.esemenynaploOldal <= 1 || !vanElem ? 'disabled' : ''}>
                    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m15 18-6-6 6-6"></path></svg>
                    <span>Előző</span>
                </button>
                <span class="admin-pagination-page" aria-label="${html(oldalSzoveg)}">${html(oldalSzoveg)}</span>
                <button type="button" class="admin-pagination-button" data-esemenynaplo-oldal="kovetkezo" aria-label="Következő oldal" title="Következő oldal" ${allapot.esemenynaploOldal >= osszes || !vanElem ? 'disabled' : ''}>
                    <span>Következő</span>
                    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m9 18 6-6-6-6"></path></svg>
                </button>
            </div>
            <div class="admin-lapozo-jobb">
                <label class="admin-oldalmeret admin-pagination-size">
                    <span>Oldalanként</span>
                    ${oldalmeretGombok(allapot.esemenynaploOldalMeret, 'esemenynaplo-oldalmeret')}
                </label>
            </div>
        `;
    }
'''
booking_js = replace_between(booking_js, event_start, event_end, event_html, 'event log shared paginator markup')
write(booking_js_path, booking_js)


# Regression test: verifies source ownership and real mobile geometry.
test_path = Path('tests/admin-shared-components.spec.js')
test_path.write_text(r'''const { test, expect } = require('playwright/test');
const fs = require('fs');
const path = require('path');

function source(relativePath) {
    return fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');
}

test('shared admin controls have one visual owner and equal mobile pagination geometry', async ({ page }) => {
    const components = source('src/admin-styles/10-components.css');
    const bookings = source('src/admin-styles/30-bookings.css');
    const content = source('src/admin-styles/40-content-editor.css');
    const imageControls = source('src/admin-styles/42-cms-image-controls.css');
    const gallery = source('src/admin-styles/45-gallery-editor.css');
    const galleryJs = source('src/admin/45-gallery-workspace.js');
    const imageJs = source('src/admin/46-cms-image-workspace.js');
    const bookingJs = source('src/admin/10-bookings-events.js');

    expect(components).toContain('Shared pagination: bookings, event log and gallery');
    expect(components).toContain('.admin-control-icon-button');
    expect(components).toContain('#admin-panel-szovegek .cms-view-tabs');
    expect(components).toContain('.cms-gallery-home-choice input[type="checkbox"]');
    expect(bookings).not.toMatch(/#admin-panel-foglalasok \.admin-lapozo-nav\s*\{/);
    expect(bookings).not.toMatch(/#admin-panel-foglalasok \.admin-pagination-button\s*\{/);
    expect(gallery).not.toContain('.cms-gallery-page-nav');
    expect(gallery).not.toContain('.cms-gallery-page-button');
    expect(gallery).not.toContain('.cms-gallery-page-label');
    expect(imageControls).not.toMatch(/\.cms-icon-button\s*\{[^}]*width:/s);
    expect(content).not.toContain('width: 18px; height: 18px; margin: 0; accent-color');
    expect(galleryJs).toContain('class="admin-lapozo-nav"');
    expect(galleryJs).toContain('class="admin-pagination-button"');
    expect(galleryJs).toContain('class="admin-pagination-page"');
    expect(galleryJs).toContain('admin-oldalmeret admin-pagination-size');
    expect(imageJs).toContain("classList.add('cms-icon-button', 'admin-control-icon-button')");
    expect(bookingJs).toContain('admin-booking-icon-button admin-control-icon-button');
    expect(bookingJs).toContain('aria-label="Eseménynapló lapozása"');

    for (const css of [components, bookings, content, imageControls, gallery]) {
        expect(css).not.toContain('!important');
    }

    const css = [
        '00-foundation.css', '05-panel-state.css', '10-components.css', '15-responsive-context.css',
        '20-workspace.css', '30-bookings.css', '40-content-editor.css', '42-cms-image-controls.css',
        '45-gallery-editor.css'
    ].map(file => source(`src/admin-styles/${file}`)).join('\n');

    await page.setViewportSize({ width: 390, height: 844 });
    await page.setContent(`<!doctype html><html><head><style>${css}</style></head><body class="admin-body admin-v2"><main id="admin-tartalom">
        <section id="admin-panel-foglalasok"><div class="admin-lapozo"><div class="admin-lapozo-nav" data-booking-nav>
            <button class="admin-pagination-button"><svg viewBox="0 0 24 24"><path d="m15 18-6-6 6-6"></path></svg><span>Előző</span></button><span class="admin-pagination-page">1 / 5</span><button class="admin-pagination-button"><span>Következő</span><svg viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"></path></svg></button>
        </div><div class="admin-lapozo-jobb"><label class="admin-oldalmeret admin-pagination-size"><span>Oldalanként</span><select class="admin-oldalmeret-select" data-booking-size><option>10</option></select></label></div></div>
        <div class="admin-foglalas-nezetvalto"><button class="admin-foglalas-nezet-gomb aktiv">Lista</button><button class="admin-foglalas-nezet-gomb">Naptár</button></div>
        <button class="admin-control-icon-button admin-booking-icon-button" data-booking-icon><svg viewBox="0 0 24 24"><path d="M4 4h16v16H4z"></path></svg></button></section>
        <section id="admin-panel-szovegek"><div id="admin-cms-root" data-lumi-cms-gallery-context="images"><div class="cms-gallery-pagination"><div class="admin-lapozo-nav" data-gallery-nav>
            <button class="admin-pagination-button"><svg viewBox="0 0 24 24"><path d="m15 18-6-6 6-6"></path></svg><span>Előző</span></button><span class="admin-pagination-page">1 / 2</span><button class="admin-pagination-button"><span>Következő</span><svg viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"></path></svg></button>
        </div><label class="admin-oldalmeret admin-pagination-size"><span>Oldalanként</span><select class="admin-oldalmeret-select" data-gallery-size><option>10</option></select></label></div>
        <div class="cms-view-tabs"><button class="cms-view-tab" aria-selected="true">Főoldal</button><button class="cms-view-tab">Foglalás</button></div><label class="cms-gallery-home-choice"><input type="checkbox" data-gallery-checkbox><span>Megjelenjen</span></label><button class="cms-icon-button admin-control-icon-button" data-gallery-icon><svg viewBox="0 0 24 24"><path d="M4 4h16v16H4z"></path></svg></button></div></section>
    </main></body></html>`);

    const metrics = await page.evaluate(() => {
        const rect = selector => { const r = document.querySelector(selector).getBoundingClientRect(); return { width: r.width, height: r.height }; };
        const style = selector => getComputedStyle(document.querySelector(selector));
        return {
            bookingNav: rect('[data-booking-nav]'), galleryNav: rect('[data-gallery-nav]'),
            bookingButton: rect('[data-booking-nav] .admin-pagination-button'), galleryButton: rect('[data-gallery-nav] .admin-pagination-button'),
            bookingPage: rect('[data-booking-nav] .admin-pagination-page'), galleryPage: rect('[data-gallery-nav] .admin-pagination-page'),
            bookingSize: rect('[data-booking-size]'), gallerySize: rect('[data-gallery-size]'),
            bookingSegmentRadius: style('.admin-foglalas-nezetvalto').borderRadius, cmsSegmentRadius: style('.cms-view-tabs').borderRadius,
            bookingActiveBg: style('.admin-foglalas-nezet-gomb.aktiv').backgroundColor, cmsActiveBg: style('.cms-view-tab[aria-selected="true"]').backgroundColor,
            bookingIcon: rect('[data-booking-icon]'), galleryIcon: rect('[data-gallery-icon]'), galleryCheckbox: rect('[data-gallery-checkbox]')
        };
    });

    expect(metrics.galleryNav.height).toBeCloseTo(metrics.bookingNav.height, 1);
    expect(metrics.galleryButton).toEqual(metrics.bookingButton);
    expect(metrics.galleryPage).toEqual(metrics.bookingPage);
    expect(metrics.gallerySize).toEqual(metrics.bookingSize);
    expect(metrics.cmsSegmentRadius).toBe(metrics.bookingSegmentRadius);
    expect(metrics.cmsActiveBg).toBe(metrics.bookingActiveBg);
    expect(metrics.galleryIcon).toEqual(metrics.bookingIcon);
    expect(metrics.galleryCheckbox.width).toBeCloseTo(18, 1);
    expect(metrics.galleryCheckbox.height).toBeCloseTo(18, 1);
});
''', encoding='utf-8')

print('Shared admin control refactor prepared.')
