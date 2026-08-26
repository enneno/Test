from pathlib import Path

components = Path('src/admin-styles/10-components.css')
bookings = Path('src/admin-styles/30-bookings.css')
pwa = Path('src/admin-styles/95-pwa.css')
availability = Path('src/admin-styles/70-availability.css')

c = components.read_text(encoding='utf-8')
b = bookings.read_text(encoding='utf-8')
p = pwa.read_text(encoding='utf-8')
a = availability.read_text(encoding='utf-8')

marker = '/* Shared native date/time/month controls: one visual owner for the entire admin. */'
if marker in c:
    raise SystemExit('Shared date control rule already exists')

anchor = '.admin-body.admin-v2 :is(#admin-tartalom, #admin-bejelentkezes-panel) textarea {'
if anchor not in c:
    raise SystemExit('Components insertion anchor not found')

shared = r'''/* Shared native date/time/month controls: one visual owner for the entire admin. */
.admin-body.admin-v2 {
  --admin-ui-date-icon: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M8 2v4'/%3E%3Cpath d='M16 2v4'/%3E%3Crect width='18' height='18' x='3' y='4' rx='2'/%3E%3Cpath d='M3 10h18'/%3E%3C/svg%3E");
  --admin-ui-time-icon: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='12' cy='12' r='9'/%3E%3Cpath d='M12 7v5l3 2'/%3E%3C/svg%3E");
}

.admin-body.admin-v2 :is(#admin-tartalom, #admin-bejelentkezes-panel) :is(input[type="date"], input[type="time"], input[type="month"]) {
  position: relative;
  display: block;
  box-sizing: border-box;
  inline-size: 100%;
  width: 100%;
  max-inline-size: 100%;
  max-width: 100%;
  min-inline-size: 0;
  min-width: 0;
  height: 34px;
  min-height: 34px;
  padding: 0 20px 0 5px;
  overflow: hidden;
  appearance: none;
  -webkit-appearance: none;
  border: 1px solid var(--admin-v2-border);
  border-radius: 12px;
  color: var(--admin-v2-ink);
  background-color: var(--admin-v2-surface);
  background-position: right 10px center;
  background-repeat: no-repeat;
  background-size: 15px 15px;
  box-shadow: 0 1px 2px rgba(67, 42, 35, .04);
  font-family: inherit;
  font-size: 16px;
  font-weight: 720;
  line-height: 1;
  text-align: left;
}

.admin-body.admin-v2 :is(#admin-tartalom, #admin-bejelentkezes-panel) :is(input[type="date"], input[type="month"]) {
  background-image: var(--admin-ui-date-icon);
}

.admin-body.admin-v2 :is(#admin-tartalom, #admin-bejelentkezes-panel) input[type="time"] {
  background-image: var(--admin-ui-time-icon);
}

.admin-body.admin-v2 :is(#admin-tartalom, #admin-bejelentkezes-panel) :is(input[type="date"], input[type="time"], input[type="month"])::-webkit-date-and-time-value {
  box-sizing: border-box;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  margin: 0;
  padding: 0;
  overflow: hidden;
  font-size: 16px;
  line-height: 1;
  text-align: left;
  white-space: nowrap;
}

.admin-body.admin-v2 :is(#admin-tartalom, #admin-bejelentkezes-panel) :is(input[type="date"], input[type="time"], input[type="month"])::-webkit-datetime-edit,
.admin-body.admin-v2 :is(#admin-tartalom, #admin-bejelentkezes-panel) :is(input[type="date"], input[type="time"], input[type="month"])::-webkit-datetime-edit-fields-wrapper {
  box-sizing: border-box;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  margin: 0;
  padding: 0;
  font-size: 16px;
  line-height: 1;
}

.admin-body.admin-v2 :is(#admin-tartalom, #admin-bejelentkezes-panel) :is(
  input[type="date"]::-webkit-datetime-edit-year-field,
  input[type="date"]::-webkit-datetime-edit-month-field,
  input[type="date"]::-webkit-datetime-edit-day-field,
  input[type="date"]::-webkit-datetime-edit-text,
  input[type="month"]::-webkit-datetime-edit-year-field,
  input[type="month"]::-webkit-datetime-edit-month-field,
  input[type="month"]::-webkit-datetime-edit-text,
  input[type="time"]::-webkit-datetime-edit-hour-field,
  input[type="time"]::-webkit-datetime-edit-minute-field,
  input[type="time"]::-webkit-datetime-edit-ampm-field,
  input[type="time"]::-webkit-datetime-edit-text
) {
  font-size: 16px;
  line-height: 1;
}

.admin-body.admin-v2 :is(#admin-tartalom, #admin-bejelentkezes-panel) :is(input[type="date"], input[type="time"], input[type="month"]):focus {
  border-color: color-mix(in srgb, var(--admin-v2-brand) 58%, var(--admin-v2-border));
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--admin-v2-brand-soft) 78%, transparent);
  outline: 0;
}

.admin-body.admin-v2 :is(#admin-tartalom, #admin-bejelentkezes-panel) :is(input[type="date"], input[type="time"], input[type="month"])::-webkit-calendar-picker-indicator {
  width: 22px;
  max-width: 22px;
  height: 100%;
  margin: 0;
  opacity: 0;
  cursor: pointer;
}

'''

c = c.replace(anchor, shared + anchor, 1)

start_selector = '.admin-body.admin-v2 #admin-panel-foglalasok .admin-idopont-szerkeszto input[type="date"],\n.admin-body.admin-v2 #admin-panel-foglalasok .admin-idopont-szerkeszto input[type="time"] {'
end_marker = '.admin-body.admin-v2 #admin-panel-foglalasok .admin-idopont-szerkeszto .admin-mezo textarea {'
start = b.find(start_selector)
end = b.find(end_marker, start)
if start < 0 or end < 0:
    raise SystemExit('Booking date control block not found')
removed = b[start:end]
for fragment in (
    'font-size: 16px;',
    '::-webkit-date-and-time-value',
    '::-webkit-datetime-edit',
    '::-webkit-calendar-picker-indicator',
    'background-image: var(--booking-icon-calendar)',
    'background-image: var(--booking-icon-clock)',
):
    if fragment not in removed:
        raise SystemExit(f'Booking block missing expected fragment: {fragment}')
b = b[:start] + b[end:]

old_pwa = ':not([type="date"]):not([type="time"]),'
new_pwa = ':not([type="date"]):not([type="time"]):not([type="month"]),'
if old_pwa not in p:
    raise SystemExit('PWA exclusion selector not found')
p = p.replace(old_pwa, new_pwa, 1)

redundant = '  .admin-body.admin-v2 #admin-idosav-naptar .admin-naptar-sor input[type="time"] {\n    width: 100%;\n    min-width: 0;\n  }\n'
if redundant in a:
    a = a.replace(redundant, '', 1)

components.write_text(c, encoding='utf-8')
bookings.write_text(b, encoding='utf-8')
pwa.write_text(p, encoding='utf-8')
availability.write_text(a, encoding='utf-8')

visual_tokens = ('::-webkit-datetime-edit', '::-webkit-date-and-time-value', '::-webkit-calendar-picker-indicator')
for path in Path('src/admin-styles').glob('*.css'):
    if path.name == '10-components.css':
        continue
    text = path.read_text(encoding='utf-8')
    for token in visual_tokens:
        if token in text:
            raise SystemExit(f'Duplicate native picker styling remains in {path}: {token}')

shared_text = components.read_text(encoding='utf-8')
for typ in ('date', 'time', 'month'):
    if f'input[type="{typ}"]' not in shared_text:
        raise SystemExit(f'Shared rule missing {typ}')
