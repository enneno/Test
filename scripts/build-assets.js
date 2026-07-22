const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

const bundles = [
    {
        output: 'style.css',
        sourceDir: 'src/styles',
        extension: '.css',
        banner: '/* Generated from src/styles by npm run build. Edit the source parts, not this file. */\n\n'
    },
    {
        output: 'script.js',
        sourceDir: 'src/public',
        extension: '.js',
        banner: '// Generated from src/public by npm run build. Edit the source parts, not this file.\n\n'
    },
    {
        output: 'booking.js',
        sourceDir: 'src/booking',
        extension: '.js',
        banner: '// Generated from src/booking by npm run build. Edit the source parts, not this file.\n\n'
    },
    {
        output: 'admin-supabase.js',
        sourceDir: 'src/admin',
        extension: '.js',
        banner: '// Generated from src/admin by npm run build. Edit the source parts, not this file.\n\n'
    }
];

function sourceFiles(bundle) {
    const directory = path.join(root, bundle.sourceDir);
    if (!fs.existsSync(directory)) {
        throw new Error(`Missing source directory: ${bundle.sourceDir}`);
    }

    return fs.readdirSync(directory)
        .filter((name) => name.endsWith(bundle.extension))
        .sort((left, right) => left.localeCompare(right, 'en'))
        .map((name) => path.join(directory, name));
}

function renderBundle(bundle) {
    const files = sourceFiles(bundle);
    if (!files.length) throw new Error(`No sources found in ${bundle.sourceDir}`);
    const body = files.map((file) => fs.readFileSync(file, 'utf8').trimEnd()).join('\n\n');
    return `${bundle.banner}${body}\n`;
}

function main() {
    const checkOnly = process.argv.includes('--check');
    let mismatch = false;

    for (const bundle of bundles) {
        const outputPath = path.join(root, bundle.output);
        const expected = renderBundle(bundle);
        const current = fs.existsSync(outputPath) ? fs.readFileSync(outputPath, 'utf8') : '';

        if (current === expected) {
            console.log(`OK ${bundle.output}`);
            continue;
        }

        if (checkOnly) {
            mismatch = true;
            console.error(`OUTDATED ${bundle.output} (run npm run build)`);
            continue;
        }

        fs.writeFileSync(outputPath, expected, 'utf8');
        console.log(`BUILT ${bundle.output}`);
    }

    if (mismatch) process.exitCode = 1;
}

main();
