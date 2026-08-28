const fs = require('fs');
const path = require('path');
const { test, expect } = require('playwright/test');

test('a foglaláskártyák egyetlen kanonikus feature CSS-ből épülnek', () => {
  const root = path.resolve(__dirname, '..');
  const adminStyles = path.join(root, 'src', 'admin-styles');
  const canonicalPath = path.join(adminStyles, '30-bookings.css');
  const obsoleteFiles = [
    '10-admin-booking.css',
    'booking-cards.css',
    'zy-booking-card-marker.css',
    'zyx-booking-list-compact.css',
    'zyy-booking-action-icons.css',
    'zyz-booking-card-polish.css',
    'zyz-card-title-mobile.css'
  ];

  expect(fs.existsSync(canonicalPath)).toBe(true);
  expect(obsoleteFiles.filter(file => fs.existsSync(path.join(adminStyles, file)))).toEqual([]);

  const css = fs.readFileSync(canonicalPath, 'utf8');
  expect(css).not.toContain('!important');
  expect(css).toContain('--booking-status-width');
  expect(css).toContain('--booking-state-color');
  expect(css).toContain('option[value="done"]:checked');
  expect(css).toContain('option[value="cancelled_by_customer"]:checked');
  expect(css).toContain('.admin-foglalas-meta-grid');
  expect(css).toContain('grid-template-columns: var(--booking-status-width) var(--admin-ui-icon-button-size) var(--admin-ui-icon-button-size);');
  expect(css).not.toContain('--booking-action-size');
  expect(css).toContain('font-size: 11px;');
  expect(css).toContain('--booking-icon-pencil');
  expect(css).toContain('--booking-icon-calendar');
});
