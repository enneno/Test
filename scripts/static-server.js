'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const portIndex = process.argv.indexOf('--port');
const PORT = Number(portIndex >= 0 ? process.argv[portIndex + 1] : process.env.PORT || 8101);
const hostIndex = process.argv.indexOf('--host');
const HOST = hostIndex >= 0 ? process.argv[hostIndex + 1] : process.env.HOST || '127.0.0.1';
const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.webmanifest': 'application/manifest+json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.txt': 'text/plain; charset=utf-8',
    '.xml': 'application/xml; charset=utf-8'
};

const PUBLIC_ROOT_FILES = new Set([
    'index.html',
    'adatkezeles.html',
    'admin.html',
    'arlista.html',
    'foglalas.html',
    'galeria.html',
    'admin-content.js',
    'admin-export.js',
    'admin-supabase.js',
    'booking.js',
    'booking-manage.js',
    'booking-manage.css',
    'home-account-strip.js',
    'home-account-strip.css',
    'typography-tuning.css',
    'account-entry.js',
    'account.js',
    'script.js',
    'style.css',
    'admin-v2.css',
    'supabase-config.js',
    'pwa.js',
    'pwa-admin-shell.js',
    'sw.js',
    'manifest.webmanifest',
    'favicon.ico',
    'robots.txt',
    'sitemap.xml'
]);
const PUBLIC_DIRECTORIES = new Set(['adatkezeles', 'admin', 'arlista', 'fiokom', 'foglalas', 'galeria', 'kepek']);
const PUBLIC_NESTED_EXTENSIONS = new Set(['.html', '.jpg', '.jpeg', '.png', '.webp', '.svg', '.ico']);

function isPublicFile(filePath) {
    const relativePath = path.relative(ROOT, filePath);
    const segments = relativePath.split(path.sep);
    if (!relativePath || relativePath.startsWith('..') || path.isAbsolute(relativePath)) return false;
    if (segments.length === 1) return PUBLIC_ROOT_FILES.has(segments[0]);
    return PUBLIC_DIRECTORIES.has(segments[0])
        && PUBLIC_NESTED_EXTENSIONS.has(path.extname(filePath).toLowerCase());
}

const server = http.createServer((request, response) => {
    try {
        const host = request.headers.host || HOST + ':' + PORT;
        const url = new URL(request.url, 'http://' + host);
        let pathname = decodeURIComponent(url.pathname);
        if (pathname.endsWith('/')) pathname += 'index.html';

        const requestedPath = path.resolve(ROOT, '.' + pathname);
        if (!requestedPath.startsWith(ROOT + path.sep) && requestedPath !== ROOT) {
            response.writeHead(403).end('Forbidden');
            return;
        }

        let filePath = requestedPath;
        if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
            filePath = path.join(filePath, 'index.html');
        }
        if (!isPublicFile(filePath)) {
            response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Not found');
            return;
        }

        if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
            response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Not found');
            return;
        }

        response.writeHead(200, {
            'Content-Type': MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
            'Cache-Control': 'no-store',
            'X-Content-Type-Options': 'nosniff'
        });
        fs.createReadStream(filePath).pipe(response);
    } catch (error) {
        response.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Server error');
    }
});

server.listen(PORT, HOST, () => {
    console.log('Lumi Nails tesztszerver: http://' + HOST + ':' + PORT);
});
