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
  '19-service-detail.css',
  '25-customer-account.css',
  '30-booking.css',
  '99-unified-design.css'
];

function withoutComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, '');
}

function splitTopLevel(value, separator) {
  const parts = [];
  let start = 0;
  let depth = 0;
  let quote = '';
  let escaped = false;

  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === quote) quote = '';
      continue;
    }

    if (character === '"' || character === "'") quote = character;
    else if (character === '(' || character === '[') depth += 1;
    else if (character === ')' || character === ']') depth = Math.max(0, depth - 1);
    else if (character === separator && depth === 0) {
      parts.push(value.slice(start, index));
      start = index + 1;
    }
  }

  parts.push(value.slice(start));
  return parts;
}

function matchingBrace(css, openingBrace) {
  let depth = 1;
  let quote = '';
  let escaped = false;

  for (let index = openingBrace + 1; index < css.length; index += 1) {
    const character = css[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === quote) quote = '';
      continue;
    }

    if (character === '"' || character === "'") quote = character;
    else if (character === '{') depth += 1;
    else if (character === '}') {
      depth -= 1;
      if (depth === 0) return index;
    }
  }

  return css.length - 1;
}

function collectDeclarations(css, file, start = 0, end = css.length, contexts = [], output = []) {
  let cursor = start;
  while (cursor < end) {
    const openingBrace = css.indexOf('{', cursor);
    if (openingBrace < 0 || openingBrace >= end) break;

    let prelude = css.slice(cursor, openingBrace).trim();
    if (prelude.includes(';')) prelude = prelude.slice(prelude.lastIndexOf(';') + 1).trim();
    const closingBrace = matchingBrace(css, openingBrace);
    const normalizedContext = contexts.join(' && ') || 'base';

    if (prelude.startsWith('@')) {
      if (/^@(media|supports|container|layer)\b/i.test(prelude)) {
        collectDeclarations(css, file, openingBrace + 1, closingBrace, [...contexts, prelude], output);
      }
    } else if (prelude && !css.slice(openingBrace + 1, closingBrace).includes('{')) {
      const selectors = splitTopLevel(prelude, ',')
        .map(selector => selector.trim().replace(/\s+/g, ' '))
        .filter(Boolean);
      const declarations = splitTopLevel(css.slice(openingBrace + 1, closingBrace), ';');

      for (const declaration of declarations) {
        const separator = declaration.indexOf(':');
        if (separator < 0) continue;
        const property = declaration.slice(0, separator).trim().toLowerCase();
        const value = declaration.slice(separator + 1).trim().replace(/\s+/g, ' ');
        if (!/^(?:--)?[a-z][\w-]*$/i.test(property)) continue;

        for (const selector of selectors) {
          const maxWidthMatch = normalizedContext.match(/max-width\s*:\s*(\d+)px/i);
          output.push({
            context: normalizedContext,
            file,
            maxWidth: maxWidthMatch ? Number(maxWidthMatch[1]) : null,
            property,
            selector,
            value
          });
        }
      }
    }

    cursor = closingBrace + 1;
  }

  return output;
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

const publicDeclarations = [];
for (const name of actualFiles) {
  collectDeclarations(cssByFile.get(name), name, 0, cssByFile.get(name).length, [], publicDeclarations);
}

const declarationsByExactContext = new Map();
const declarationsByOwner = new Map();
for (const declaration of publicDeclarations) {
  const exactKey = [declaration.file, declaration.selector, declaration.property, declaration.context].join('\0');
  if (!declarationsByExactContext.has(exactKey)) declarationsByExactContext.set(exactKey, []);
  declarationsByExactContext.get(exactKey).push(declaration);

  const ownerKey = [declaration.file, declaration.selector, declaration.property].join('\0');
  if (!declarationsByOwner.has(ownerKey)) declarationsByOwner.set(ownerKey, []);
  declarationsByOwner.get(ownerKey).push(declaration);
}

for (const declarations of declarationsByExactContext.values()) {
  const values = new Set(declarations.map(declaration => declaration.value));
  if (values.size > 1) {
    const declaration = declarations[0];
    fail(`conflicting repeated declaration in ${declaration.file}: ${declaration.selector} / ${declaration.property} / ${declaration.context}`);
  }
}

for (const declarations of declarationsByOwner.values()) {
  for (let index = 0; index < declarations.length; index += 1) {
    const earlier = declarations[index];
    for (const later of declarations.slice(index + 1)) {
      if (earlier.value === later.value) continue;
      if (earlier.context !== 'base' && later.context === 'base') {
        fail(`later base rule overrides a responsive rule in ${earlier.file}: ${earlier.selector} / ${earlier.property}`);
        break;
      }
      if (earlier.maxWidth !== null && later.maxWidth !== null && later.maxWidth >= earlier.maxWidth) {
        fail(`later broader media rule overrides a narrower rule in ${earlier.file}: ${earlier.selector} / ${earlier.property}`);
        break;
      }
    }
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
  { pattern: '.seo-szolgaltatas-oldal', owner: '19-service-detail.css' },
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

const sharedSelectorOwnership = [
  { selector: 'h2', owner: '00-base.css' },
  { selector: '.szekcio-kicker', owner: '00-base.css' },
  { selector: '.szoveges-link', owner: '00-base.css' }
];

for (const rule of sharedSelectorOwnership) {
  const declarations = publicDeclarations.filter(declaration => declaration.selector === rule.selector);
  if (!declarations.some(declaration => declaration.file === rule.owner)) {
    fail(`${rule.selector} is missing from its shared owner: ${rule.owner}`);
  }

  const offenders = [...new Set(
    declarations
      .filter(declaration => declaration.file !== rule.owner)
      .map(declaration => declaration.file)
  )];
  if (offenders.length) {
    fail(`${rule.selector} has a second shared owner: ${offenders.join(', ')}; owner: ${rule.owner}`);
  }
}

if (!process.exitCode) {
  console.log(`OK public CSS architecture: ${expectedFiles.length} ordered sources with explicit component ownership`);
}
