'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const fix = process.argv.includes('--fix');
const adminHtmlPath = path.join(root, 'admin', 'index.html');
const workspaceCssPath = path.join(root, 'src', 'admin-styles', 'admin-workspace-v2.css');
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

    const physicalTouchBlock = `  .admin-body.admin-v2 .admin-v2-nav-item,
  .admin-body.admin-v2 .admin-v2-public-link,
  .admin-body.admin-v2 .admin-v2-profile,
  .admin-body.admin-v2 .admin-v2-logout,
  .admin-body.admin-v2 .admin-v2-icon-button,
  .admin-body.admin-v2 .admin-v2-button,
  .admin-body.admin-v2 .admin-panel .admin-v2-button,
  .admin-body.admin-v2 .admin-v2-subnav button,
  .admin-body.admin-v2 .admin-v2-task-item > button {
    min-height: 44px;
  }

  .admin-body.admin-v2 .admin-v2-icon-button {
    width: 44px;
    height: 44px;
  }
`;
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

const config = fs.readFileSync(path.join(root, 'supabase-config.js'), 'utf8');
if (!config.includes('isAdminPath') || !config.includes('isAdminPath || document.querySelector')) {
    fail('supabase-config.js does not explicitly exclude admin from public typography-tuning.css injection.');
}

if (!process.exitCode) {
    console.log(`OK admin CSS isolation: ${styles[0]}`);
}
