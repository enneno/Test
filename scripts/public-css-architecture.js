'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const styleDir = path.join(root, 'src', 'styles');

const expectedFiles = [
  '00-base.css',
  '10-overlays.css',
  '11-price-page.css',
  '12-legal.css',
  '13-gallery-footer-navigation.css',
  '14-promotions.css',
  '15-home-sections.css',
  '16-home-gallery.css',
  '17-floating-cta.css',
  '18-hero-inner-pages.css',
  '25-customer-account.css',
  '30-booking.css',
  '99-unified-design.css'
];

function withoutComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, '');
}

function fail(message) {
  console.error(`PUBLIC CSS ARCHITECTURE ERROR: ${message}`);
  process.exitCode = 1;
}

const actualFiles = fs.readdirSync(styleDir)
  .filter(name => name.endsWith('.css'))
  .sort((left, right) => left.localeCompare(right, 'en'));

if (JSON.stringify(actualFiles) !== JSON.stringify(expectedFiles)) {
  fail(`public source manifest differs. Expected: ${expectedFiles.join(', ')}. Found: ${actualFiles.join(', ')}`);
}

const cssByFile = new Map();
for (const name of actualFiles) {
  if (/^(?:zy|zz)|legacy|override|polish|final-fix|hotfix/i.test(name)) {
    fail(`temporary/cascade-order filename is forbidden: ${name}`);
  }

  const css = fs.readFileSync(path.join(styleDir, name), 'utf8');
  const rules = withoutComments(css);
  cssByFile.set(name, rules);

  if (rules.includes('!important')) {
    fail(`!important declaration is forbidden in public CSS: ${name}`);
  }
}

const retiredLayer = cssByFile.get('99-unified-design.css');
if (retiredLayer.trim()) {
  fail('99-unified-design.css is retired and must remain selector-free.');
}

const baseCss = cssByFile.get('00-base.css');
for (const token of ['--ui-primary:', '--ui-header-height:', '--ui-mobile-type-scale:']) {
  if (!baseCss.includes(token)) fail(`canonical public token is missing from 00-base.css: ${token}`);

  const offenders = actualFiles.filter(name => name !== '00-base.css' && cssByFile.get(name).includes(token));
  if (offenders.length) {
    fail(`${token} must be owned by 00-base.css; additional definitions: ${offenders.join(', ')}`);
  }
}

if (!baseCss.includes('* {') || !baseCss.includes('box-sizing: border-box')) {
  fail('canonical border-box sizing must live in 00-base.css.');
}

const ownership = [
  { pattern: '.arlista-oldal', owner: '11-price-page.css' },
  { pattern: '.jogi-oldal', owner: '12-legal.css' },
  { pattern: '.site-footer', owner: '13-gallery-footer-navigation.css' },
  { pattern: '.akcios-banner', owner: '14-promotions.css' },
  { pattern: '#szolgaltatasok', owner: '15-home-sections.css' },
  { pattern: '#galeria-atvezeto', owner: '16-home-gallery.css' },
  { pattern: '.lebego-foglalas-gomb', owner: '17-floating-cta.css' },
  { pattern: '#hero.hero-preview-refresh', owner: '18-hero-inner-pages.css' },
  { pattern: '.fiok-dashboard', owner: '25-customer-account.css' },
  { pattern: '.foglalas-asszisztens', owner: '30-booking.css' }
];

for (const rule of ownership) {
  if (!cssByFile.get(rule.owner).includes(rule.pattern)) {
    fail(`${rule.pattern} is missing from its owner: ${rule.owner}`);
  }

  const offenders = actualFiles.filter(name => name !== rule.owner && cssByFile.get(name).includes(rule.pattern));
  if (offenders.length) {
    fail(`${rule.pattern} has non-owner CSS: ${offenders.join(', ')}; owner: ${rule.owner}`);
  }
}

if (!process.exitCode) {
  console.log(`OK public CSS architecture: ${expectedFiles.length} ordered sources with explicit component ownership`);
}
