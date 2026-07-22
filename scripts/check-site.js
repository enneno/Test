'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const HTML_FILES = [
    'index.html',
    'admin/index.html',
    'arlista/index.html',
    'galeria/index.html',
    'foglalas/index.html',
    'adatkezeles/index.html'
];
const JS_FILES = [
    'supabase-config.js',
    'script.js',
    'booking.js',
    'admin-supabase.js',
    'admin-content.js'
];
const VERSIONED_ASSETS = ['style.css'].concat(JS_FILES);
const errors = [];

function fail(message) {
    errors.push(message);
}

function hash(relativePath) {
    return crypto.createHash('sha256')
        .update(fs.readFileSync(path.join(ROOT, relativePath)))
        .digest('hex')
        .slice(0, 12);
}

function escapeRegExp(value) {
    return value.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&');
}

for (const relativePath of HTML_FILES.concat(JS_FILES, ['style.css'])) {
    if (!fs.existsSync(path.join(ROOT, relativePath))) {
        fail('Hiányzó aktív fájl: ' + relativePath);
    }
}

for (const htmlFile of HTML_FILES) {
    const filePath = path.join(ROOT, htmlFile);
    const html = fs.readFileSync(filePath, 'utf8');

    if (!html.includes('@supabase/supabase-js@2.110.7')) {
        fail(htmlFile + ': a Supabase CDN nincs 2.110.7 verzióra rögzítve.');
    }
    if (html.includes('@supabase/supabase-js@2"')) {
        fail(htmlFile + ': lebegő Supabase főverzió maradt.');
    }

    const ids = Array.from(html.matchAll(/\bid="([^"]+)"/g), match => match[1]);
    const duplicateIds = Array.from(new Set(ids.filter((id, index) => ids.indexOf(id) !== index)));
    if (duplicateIds.length) {
        fail(htmlFile + ': duplikált id: ' + duplicateIds.join(', '));
    }

    for (const asset of VERSIONED_ASSETS) {
        if (!html.includes('/' + asset)) continue;
        const reference = new RegExp('/' + escapeRegExp(asset) + '\\?v=([a-f0-9]{12})');
        const match = html.match(reference);
        if (!match || match[1] !== hash(asset)) {
            fail(htmlFile + ': elavult vagy hiányzó verzió a(z) ' + asset + ' fájlhoz.');
        }
    }

    for (const match of html.matchAll(/(?:src|href)="(\/[^"#?]+)(?:\?[^"]*)?"/g)) {
        const relative = match[1].replace(/^\//, '');
        if (!relative || relative.endsWith('/')) continue;
        if (!fs.existsSync(path.join(ROOT, relative))) {
            fail(htmlFile + ': hiányzó helyi hivatkozás: ' + match[1]);
        }
    }
}

for (const relativePath of HTML_FILES.concat(JS_FILES, ['style.css'])) {
    const content = fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
    if (/[�ÃÂÄĹĂ]/.test(content)) {
        fail(relativePath + ': hibás karakterkódolásra utaló szöveg található.');
    }
}
for (const jsFile of JS_FILES) {
    try {
        execFileSync(process.execPath, ['--check', path.join(ROOT, jsFile)], { stdio: 'pipe' });
    } catch (error) {
        fail(jsFile + ': JavaScript szintaktikai hiba.');
    }
}

const bookingJs = fs.readFileSync(path.join(ROOT, 'booking.js'), 'utf8');
const bookingHtml = fs.readFileSync(path.join(ROOT, 'foglalas/index.html'), 'utf8');
const referencedIds = Array.from(bookingJs.matchAll(/getElementById\(['"]([^'"]+)['"]\)/g), match => match[1]);
for (const id of new Set(referencedIds)) {
    const idPattern = new RegExp('id=["' + "'" + ']' + escapeRegExp(id) + '["' + "'" + ']');
    if (!idPattern.test(bookingHtml)) {
        fail('Foglalás: hiányzó HTML-azonosító: ' + id);
    }
}

const sourceText = JS_FILES.map(file => fs.readFileSync(path.join(ROOT, file), 'utf8')).join('\n');
if (/service[_ -]?role|SUPABASE_SERVICE_ROLE/i.test(sourceText)) {
    fail('Service role kulcsra utaló kliensoldali kód található.');
}
const directClientCalls = Array.from(sourceText.matchAll(/\.createClient\(/g)).length;
if (directClientCalls !== 1) {
    fail('A Supabase kliensnek pontosan egyszer kell létrejönnie, jelenleg: ' + directClientCalls + '.');
}

const css = fs.readFileSync(path.join(ROOT, 'style.css'), 'utf8');
const openBraces = (css.match(/\{/g) || []).length;
const closeBraces = (css.match(/\}/g) || []).length;
if (openBraces !== closeBraces) {
    fail('CSS kapcsos zárójel eltérés: ' + openBraces + '/' + closeBraces + '.');
}
if (css.includes('!important')) {
    fail('A CSS !important szabályt tartalmaz.');
}

const allowedBreakpoints = new Set(['380', '420', '480', '520', '640', '768', '769', '900']);
const breakpoints = Array.from(css.matchAll(/@media[^\{]*(?:min|max)-width:\s*(\d+)px/g), match => match[1]);
const unexpectedBreakpoints = Array.from(new Set(breakpoints.filter(value => !allowedBreakpoints.has(value))));
if (unexpectedBreakpoints.length) {
    fail('Nem szabványos CSS töréspont: ' + unexpectedBreakpoints.join(', ') + ' px.');
}
if (errors.length) {
    console.error('\nEllenőrzési hibák:');
    for (const error of errors) console.error('- ' + error);
    process.exit(1);
}

console.log('Statikus ellenőrzés rendben: ' + HTML_FILES.length + ' oldal, ' + JS_FILES.length + ' script, ' + new Set(referencedIds).size + ' foglalási elem.');
