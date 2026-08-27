from pathlib import Path
import runpy

# Repair the temporary refactor helper before executing it.
p = Path('scripts/chatgpt-unify-shared-controls.py')
s = p.read_text(encoding='utf-8')
start = "for pattern, label in [\n    (r'\\.admin-body\\.admin-v2 #admin-panel-szovegek \\.cms-icon-button:hover"
end = "write(image_controls_path, image_controls)"
a = s.index(start)
b = s.index(end, a)
replacement = """image_controls, count = re.subn(r'\\.admin-body\\.admin-v2 #admin-panel-szovegek \\.cms-icon-button svg \\{.*?\\n\\}\\n\\n', '', image_controls, count=1, flags=re.S)\nif count != 1:\n    raise SystemExit(f'cms icon svg: expected 1 replacement, got {count}')\n"""
p.write_text(s[:a] + replacement + s[b:], encoding='utf-8')

runpy.run_path(str(p), run_name='__main__')

# Keep common component CSS independent from feature panel IDs.
p = Path('src/admin-styles/10-components.css')
s = p.read_text(encoding='utf-8')
start = s.index('/* Shared segmented navigation:')
end = s.index('/* Shared compact icon button.', start)
shared = '''/* Shared segmented navigation: visual treatment belongs here; feature files own only layout. */
.admin-body.admin-v2 .admin-segmented {
  gap: 2px;
  padding: 3px;
  border: 1px solid var(--admin-v2-border);
  border-radius: 12px;
  background: #f3eeea;
  box-shadow: inset 0 1px 2px rgba(67, 42, 35, .035);
}

.admin-body.admin-v2 .admin-segmented-item {
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

.admin-body.admin-v2 :is(.admin-segmented-item.aktiv, .admin-segmented-item[aria-selected="true"]) {
  color: var(--admin-v2-brand-dark);
  background: var(--admin-v2-surface);
  box-shadow: 0 1px 4px rgba(67, 42, 35, .12);
}

'''
s = s[:start] + shared + s[end:]
s = s.replace('.admin-body.admin-v2 #admin-tartalom .admin-control-icon-button', '.admin-body.admin-v2 .admin-control-icon-button')
p.write_text(s, encoding='utf-8')

# Static booking segmented control uses the common semantic classes.
p = Path('admin/index.html')
s = p.read_text(encoding='utf-8')
s = s.replace('class="admin-foglalas-nezetvalto"', 'class="admin-foglalas-nezetvalto admin-segmented"', 1)
s = s.replace('class="admin-foglalas-nezet-gomb aktiv"', 'class="admin-foglalas-nezet-gomb admin-segmented-item aktiv"', 1)
s = s.replace('class="admin-foglalas-nezet-gomb" data-foglalas-nezet="naptar"', 'class="admin-foglalas-nezet-gomb admin-segmented-item" data-foglalas-nezet="naptar"', 1)
p.write_text(s, encoding='utf-8')

# Runtime CMS tabs get the same shared semantic classes.
p = Path('src/admin/45-gallery-workspace.js')
s = p.read_text(encoding='utf-8')
needle = "        const tabs = root.querySelector('.cms-view-tabs');\n        if (!tabs) return;\n"
replacement = "        const tabs = root.querySelector('.cms-view-tabs');\n        if (!tabs) return;\n\n        tabs.classList.add('admin-segmented');\n        tabs.querySelectorAll('.cms-view-tab').forEach(button => button.classList.add('admin-segmented-item'));\n"
if needle not in s:
    raise SystemExit('CMS tabs enhancement marker not found')
s = s.replace(needle, replacement, 1)
s = s.replace("galleryTab.className = 'cms-view-tab cms-view-tab-gallery';", "galleryTab.className = 'cms-view-tab cms-view-tab-gallery admin-segmented-item';", 1)
p.write_text(s, encoding='utf-8')

# Existing booking architecture test intentionally follows the new common token.
p = Path('tests/admin-booking-css-architecture.spec.js')
s = p.read_text(encoding='utf-8')
old = "expect(css).toContain('grid-template-columns: var(--booking-status-width) var(--booking-action-size) var(--booking-action-size);');"
new = "expect(css).toContain('grid-template-columns: var(--booking-status-width) var(--admin-ui-icon-button-size) var(--admin-ui-icon-button-size);');\n  expect(css).not.toContain('--booking-action-size');"
if old not in s:
    raise SystemExit('Old booking action-size expectation not found')
s = s.replace(old, new, 1)
p.write_text(s, encoding='utf-8')

# Align the new shared-components regression with the semantic shared class contract.
p = Path('tests/admin-shared-components.spec.js')
s = p.read_text(encoding='utf-8')
s = s.replace("expect(components).toContain('#admin-panel-szovegek .cms-view-tabs');", "expect(components).toContain('.admin-segmented');")
s = s.replace('class="admin-foglalas-nezetvalto"', 'class="admin-foglalas-nezetvalto admin-segmented"')
s = s.replace('class="admin-foglalas-nezet-gomb aktiv"', 'class="admin-foglalas-nezet-gomb admin-segmented-item aktiv"')
s = s.replace('class="admin-foglalas-nezet-gomb">Naptár', 'class="admin-foglalas-nezet-gomb admin-segmented-item">Naptár')
s = s.replace('class="cms-view-tabs"', 'class="cms-view-tabs admin-segmented"')
s = s.replace('class="cms-view-tab" aria-selected="true"', 'class="cms-view-tab admin-segmented-item" aria-selected="true"')
s = s.replace('class="cms-view-tab">Foglalás', 'class="cms-view-tab admin-segmented-item">Foglalás')
old = """    for (const css of [components, bookings, content, imageControls, gallery]) {
        expect(css).not.toContain('!important');
    }
"""
new = """    for (const css of [components, bookings, content, imageControls, gallery]) {
        const codeOnly = css.replace(/\/\*[\s\S]*?\*\//g, '');
        expect(codeOnly).not.toContain('!important');
    }
"""
if old not in s:
    raise SystemExit('Shared component !important assertion block not found')
s = s.replace(old, new, 1)
p.write_text(s, encoding='utf-8')

print('Shared admin refactor and regression expectations prepared.')
