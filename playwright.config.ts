import { defineConfig } from "@playwright/test";

export default defineConfig({
    testDir: "./tests",
    timeout: 30000,
    retries: 0,
    use: {
        baseURL: "http://localhost:8000",
        headless: true,
        viewport: { width: 1280, height: 900 },
        screenshot: "only-on-failure",
    },
    webServer: {
        command: "python3 -m http.server 8000 -d dist",
        port: 8000,
        reuseExistingServer: true,
        timeout: 10000,
    },
    projects: [
        {
            name: "chromium",
            use: { browserName: "chromium" },
        },
    ],
});
