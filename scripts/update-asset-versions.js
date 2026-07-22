'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const HTML_FILES = [
    'index.html',
    'admin/index.html',
    'arlista/index.html',
    'galeria/index.html',
    'foglalas/index.html',
    'adatkezeles/index.html'
];
const ASSETS = [
    'style.css',
    'supabase-config.js',
    'script.js',
    'booking.js',
    'admin-supabase.js',
    'admin-content.js'
];

function assetHash(relativePath) {
    const bytes = fs.readFileSync(path.join(ROOT, relativePath));
    return crypto.createHash('sha256').update(bytes).digest('hex').slice(0, 12);
}

function escapeRegExp(value) {
    return value.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&');
}

const hashes = Object.fromEntries(ASSETS.map(asset => [asset, assetHash(asset)]));

for (const htmlFile of HTML_FILES) {
    const filePath = path.join(ROOT, htmlFile);
    let html = fs.readFileSync(filePath, 'utf8');

    for (const asset of ASSETS) {
        const pattern = new RegExp('/' + escapeRegExp(asset) + '(?:\\?v=[^"\\s>]+)?', 'g');
        html = html.replace(pattern, '/' + asset + '?v=' + hashes[asset]);
    }

    fs.writeFileSync(filePath, html, 'utf8');
}

console.log('Asset verziók frissítve:');
for (const entry of Object.entries(hashes)) {
    console.log('- ' + entry[0] + ': ' + entry[1]);
}
