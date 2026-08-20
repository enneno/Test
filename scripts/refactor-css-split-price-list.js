'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const unifiedPath = path.join(ROOT, 'src/styles/99-unified-design.css');
const foundationPath = path.join(ROOT, 'src/styles/90-unified-foundation.css');
const priceListPath = path.join(ROOT, 'src/styles/91-unified-price-list.css');

const PRICE_START = '/* Price list */';
const PRICE_END = '/* Standalone gallery: CSS columns avoid empty grid holes. */';

const unified = fs.readFileSync(unifiedPath, 'utf8');
const start = unified.indexOf(PRICE_START);
const end = unified.indexOf(PRICE_END);

if (start === -1) {
    if (fs.existsSync(foundationPath) && fs.existsSync(priceListPath) && unified.includes(PRICE_END)) {
        console.log('Unified CSS price-list split already applied.');
        process.exit(0);
    }
    throw new Error('Price-list start marker not found in 99-unified-design.css.');
}

if (end === -1 || end <= start) {
    throw new Error('Price-list end marker not found after its start marker.');
}

if (fs.existsSync(foundationPath) || fs.existsSync(priceListPath)) {
    throw new Error('Refactor target files already exist; refusing to overwrite them.');
}

const foundation = unified.slice(0, start).trimEnd();
const priceList = unified.slice(start, end).trim();
const remainder = unified.slice(end).trimStart();

if (!foundation || !priceList || !remainder) {
    throw new Error('Unified CSS split produced an empty section.');
}

fs.writeFileSync(foundationPath, `${foundation}\n`, 'utf8');
fs.writeFileSync(priceListPath, `${priceList}\n`, 'utf8');
fs.writeFileSync(unifiedPath, `${remainder}\n`, 'utf8');

console.log('Split unified CSS into foundation, price-list, and remaining design layers without changing their load order.');
