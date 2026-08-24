const { defineConfig } = require('playwright/test');

const testPort = Number(process.env.LUMI_TEST_PORT || 8101);

module.exports = defineConfig({
    testDir: './tests',
    testIgnore: [
        'admin-redesign-prototype.spec.js',
        'admin-redesign-prototype-drawer.spec.js'
    ],
    timeout: 30000,
    fullyParallel: false,
    reporter: [['list']],
    use: {
        baseURL: `http://127.0.0.1:${testPort}`,
        headless: true,
        channel: 'msedge',
        trace: 'retain-on-failure'
    },
    webServer: {
        command: `node scripts/static-server.js --port ${testPort}`,
        url: `http://127.0.0.1:${testPort}`,
        reuseExistingServer: true,
        timeout: 15000
    }
});
