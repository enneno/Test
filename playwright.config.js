const { defineConfig } = require('playwright/test');

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
        baseURL: 'http://127.0.0.1:8101',
        headless: true,
        channel: 'msedge',
        trace: 'retain-on-failure'
    },
    webServer: {
        command: 'node scripts/static-server.js --port 8101',
        url: 'http://127.0.0.1:8101',
        reuseExistingServer: true,
        timeout: 15000
    }
});
