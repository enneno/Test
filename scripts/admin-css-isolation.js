'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const adminHtmlPath = path.join(root, 'admin', 'index.html');
const adminStyleDir = path.join(root, 'src', 'admin-styles');

const expectedFiles = [
  '00-foundation.css',
  '10-components.css',
  '20-workspace.css',
  '30-bookings.css',
  '40-content-editor.css',
  '45-gallery-editor.css',
  '50-services.css',
  '60-coupons.css',
  '70-availability.css',
  '80-communications.css',
  '90-customers.css',
  '95-pwa.css'
];

function localStylesheets(html) {
  return [...html.matchAll(/<link\b[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["'][^>]*>/gi)]
    .map(match => match[1])
    .filter(href => href.startsWith('/') && href.includes('.css'));
}

function cssRules(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, '');
}

function fail(message) {
  console.error(`ADMIN CSS ARCHITECTURE ERROR: ${message}`);
  process.exitCode = 1;
}

const adminHtml = fs.readFileSync(adminHtmlPath, 'utf8');
const styles = localStylesheets(adminHtml);
if (styles.length !== 1 || !styles[0].startsWith('/admin-v2.css')) {
  fail(`admin/index.html must load exactly one local stylesheet (/admin-v2.css). Found: ${styles.join(', ') || 'none'}`);
}
if (/\/style\.css(?:\?|["'])/i.test(adminHtml)) {
  fail('admin/index.html must not load the public /style.css bundle.');
}

const actualFiles = fs.readdirSync(adminStyleDir)
  .filter(name => name.endsWith('.css'))
  .sort((a, b) => a.localeCompare(b, 'en'));
const expectedSorted = [...expectedFiles].sort((a, b) => a.localeCompare(b, 'en'));
if (JSON.stringify(actualFiles) !== JSON.stringify(expectedSorted)) {
  fail(`admin source manifest differs. Expected: ${expectedSorted.join(', ')}. Found: ${actualFiles.join(', ')}`);
}

const cssByFile = new Map();
for (const name of actualFiles) {
  if (/^(?:zy|zz)|legacy|override|polish|final-fix|hotfix/i.test(name)) {
    fail(`temporary/cascade-order filename is forbidden: ${name}`);
  }
  const css = fs.readFileSync(path.join(adminStyleDir, name), 'utf8');
  const rules = cssRules(css);
  cssByFile.set(name, rules);
  if (rules.includes('!important')) {
    fail(`!important declaration is forbidden in admin CSS: ${name}`);
  }
  if (/\.foglalas-(?:oldal|asszisztens|nyito|ut-kartya)\b/.test(rules)) {
    fail(`public booking-page CSS leaked into admin bundle: ${name}`);
  }
}

const componentCss = cssByFile.get('10-components.css');
const requiredTokens = [
  '--admin-ui-field-height:',
  '--admin-ui-choice-height:',
  '--admin-ui-button-height:',
  '--admin-ui-icon-button-size:',
  '--admin-ui-touch-target:',
  '--admin-ui-control-radius:',
  '--admin-ui-field-padding-x:',
  '--admin-ui-choice-padding-x:',
  '--admin-ui-button-padding-x:',
  '--admin-ui-action-font-size:',
  '--admin-ui-placeholder-font-size:'
];
for (const token of requiredTokens) {
  if (!componentCss.includes(token)) fail(`canonical component token is missing: ${token}`);
}

const ownership = [
  { pattern: '#admin-panel-foglalasok', owners: ['30-bookings.css'] },
  { pattern: '#admin-panel-szolgaltatasok', owners: ['50-services.css'] },
  { pattern: '#admin-panel-kuponok', owners: ['60-coupons.css'] },
  { pattern: '#admin-panel-idosavok', owners: ['70-availability.css'] },
  { pattern: '#admin-idosav-', owners: ['70-availability.css'] },
  { pattern: '#admin-tiltas-', owners: ['70-availability.css'] },
  { pattern: '#admin-panel-esemenynaplo', owners: ['80-communications.css'] },
  { pattern: '#admin-esemenynaplo-', owners: ['80-communications.css'] },
  { pattern: '.admin-email-teszt-', owners: ['80-communications.css'] },
  { pattern: '#admin-panel-szovegek', owners: ['40-content-editor.css', '45-gallery-editor.css'] }
];

for (const rule of ownership) {
  const offenders = actualFiles.filter(name => {
    if (rule.owners.includes(name)) return false;
    return cssByFile.get(name).includes(rule.pattern);
  });
  if (offenders.length) {
    fail(`${rule.pattern} has non-owner CSS: ${offenders.join(', ')}; owner: ${rule.owners.join(' / ')}`);
  }
}

const buildScript = fs.readFileSync(path.join(root, 'scripts', 'build-assets.js'), 'utf8');
for (const name of expectedFiles) {
  if (!buildScript.includes(`'${name}'`)) fail(`admin bundle order is missing ${name}`);
}
if (!buildScript.includes('files: ADMIN_STYLE_FILES')) {
  fail('admin bundle must use an explicit source manifest instead of filename sorting.');
}

const config = fs.readFileSync(path.join(root, 'supabase-config.js'), 'utf8');
if (!config.includes('isAdminPath') || !config.includes('isAdminPath || document.querySelector')) {
  fail('supabase-config.js does not explicitly exclude admin from public typography injection.');
}

if (!process.exitCode) {
  console.log(`OK admin CSS architecture: ${expectedFiles.length} explicit sources -> ${styles[0]}`);
}
