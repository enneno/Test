'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const fix = process.argv.includes('--fix');
const adminHtmlPath = path.join(root, 'admin', 'index.html');
const adminStyleDir = path.join(root, 'src', 'admin-styles');
const workspaceCssPath = path.join(adminStyleDir, 'admin-workspace-v2.css');
const interactionCssPath = path.join(adminStyleDir, 'zz-admin-interaction.css');
const forbiddenPublicSources = [
    path.join(root, 'src', 'styles', '20-content-admin.css'),
    path.join(root, 'src', 'styles', '35-admin-booking.css'),
    path.join(root, 'src', 'styles', '40-admin.css')
];

function localStylesheets(html) {
    return [...html.matchAll(/<link\b[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["'][^>]*>/gi)]
        .map(match => match[1])
        .filter(href => href.startsWith('/') && href.includes('.css'));
}

function fail(message) {
    console.error(`ADMIN CSS ISOLATION ERROR: ${message}`);
    process.exitCode = 1;
}

let adminHtml = fs.readFileSync(adminHtmlPath, 'utf8');
let workspaceCss = fs.readFileSync(workspaceCssPath, 'utf8');

if (fix) {
    adminHtml = adminHtml.replace(/^\s*<link\s+rel=["']stylesheet["']\s+href=["']\/style\.css[^"']*["']>\s*\r?\n/gim, '');

    workspaceCss = workspaceCss.replace(
` .admin-body.admin-v2 .admin-statusz,
.admin-body.admin-v2 .admin-pill,
.admin-body.admin-v2 .admin-allapot-jelzes {
  font-size: 9px;
  line-height: 1.2;
}`.trimStart(),
`.admin-body.admin-v2 .admin-statusz,
.admin-body.admin-v2 .admin-pill,
.admin-body.admin-v2 .admin-allapot-jelzes {
  font-size: 12px;
  line-height: 1.2;
}`
    );

    const physicalTouchBlock = `  .admin-body.admin-v2 .admin-v2-nav-item,\n  .admin-body.admin-v2 .admin-v2-public-link,\n  .admin-body.admin-v2 .admin-v2-profile,\n  .admin-body.admin-v2 .admin-v2-logout,\n  .admin-body.admin-v2 .admin-v2-icon-button,\n  .admin-body.admin-v2 .admin-v2-button,\n  .admin-body.admin-v2 .admin-panel .admin-v2-button,\n  .admin-body.admin-v2 .admin-v2-subnav button,\n  .admin-body.admin-v2 .admin-v2-task-item > button {\n    min-height: 44px;\n  }\n\n  .admin-body.admin-v2 .admin-v2-icon-button {\n    width: 44px;\n    height: 44px;\n  }\n`;
    workspaceCss = workspaceCss.replace(physicalTouchBlock, '');

    fs.writeFileSync(adminHtmlPath, adminHtml, 'utf8');
    fs.writeFileSync(workspaceCssPath, workspaceCss, 'utf8');
}

const styles = localStylesheets(adminHtml);
if (styles.length !== 1 || !styles[0].startsWith('/admin-v2.css')) {
    fail(`admin/index.html must load exactly one local stylesheet (/admin-v2.css). Found: ${styles.join(', ') || 'none'}`);
}

if (/\/style\.css(?:\?|["'])/i.test(adminHtml)) {
    fail('admin/index.html still references the public /style.css bundle.');
}

for (const oldPath of forbiddenPublicSources) {
    if (fs.existsSync(oldPath)) {
        fail(`admin-only source still exists in public src/styles: ${path.relative(root, oldPath)}`);
    }
}

if (!workspaceCss.includes('font-size: 12px;') || workspaceCss.includes('font-size: 9px;\n  line-height: 1.2;')) {
    fail('admin status typography was not normalized to 12px in the admin source.');
}

const adminCssSources = fs.readdirSync(adminStyleDir)
    .filter(name => name.endsWith('.css'))
    .sort((left, right) => left.localeCompare(right, 'en'));

if (adminCssSources.at(-1) !== 'zz-admin-interaction.css') {
    fail(`zz-admin-interaction.css must remain the final admin CSS source. Current last source: ${adminCssSources.at(-1) || 'none'}`);
}

const interactionCss = fs.readFileSync(interactionCssPath, 'utf8');
const requiredControlTokens = [
    '--admin-ui-field-height:',
    '--admin-ui-choice-height:',
    '--admin-ui-button-height:',
    '--admin-ui-icon-button-size:',
    '--admin-ui-touch-target:',
    '--admin-ui-control-radius:',
    '--admin-ui-field-padding-x:',
    '--admin-ui-choice-padding-x:',
    '--admin-ui-button-padding-x:'
];

for (const token of requiredControlTokens) {
    if (!interactionCss.includes(token)) {
        fail(`canonical admin control token is missing: ${token}`);
    }
}

if (!interactionCss.includes('height: var(--admin-ui-field-height);') ||
    !interactionCss.includes('min-height: var(--admin-ui-field-height);')) {
    fail('editable admin fields are not owned by the canonical field-height token.');
}

if (!interactionCss.includes('select,') ||
    !interactionCss.includes('.admin-db-statusz {') ||
    !interactionCss.includes('height: var(--admin-ui-choice-height);')) {
    fail('admin select/status choices are not owned by the canonical choice-control role.');
}

if (!interactionCss.includes('height: var(--admin-ui-button-height);')) {
    fail('admin text buttons are not owned by the canonical button-height token.');
}

if (!interactionCss.includes('width: var(--admin-ui-icon-button-size);') ||
    !interactionCss.includes('var(--admin-ui-touch-target)')) {
    fail('admin icon buttons do not preserve compact visuals with a tokenized touch target.');
}

if (interactionCss.includes('--lumi-input-optical-ratio: 0.3')) {
    fail('status selectors must not use the old input-specific optical-size override in the final component layer.');
}

if (interactionCss.includes('!important')) {
    fail('the canonical admin component layer must use the cascade, not !important.');
}

const config = fs.readFileSync(path.join(root, 'supabase-config.js'), 'utf8');
if (!config.includes('isAdminPath') || !config.includes('isAdminPath || document.querySelector')) {
    fail('supabase-config.js does not explicitly exclude admin from public typography-tuning.css injection.');
}

if (!process.exitCode) {
    console.log(`OK admin CSS isolation and component system: ${styles[0]}`);
}
