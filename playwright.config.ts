import { defineConfig, devices } from "@playwright/test";

const externalBaseUrl = process.env.E2E_BASE_URL?.trim();
const baseURL = externalBaseUrl || "http://127.0.0.1:3000";
const authState = process.env.E2E_AUTH_STATE?.trim();
const isLocalBaseUrl = !externalBaseUrl || /^https?:\/\/(?:localhost|127\.0\.0\.1|\[::1\])(?::\d+)?\/?$/i.test(externalBaseUrl);

export default defineConfig({
  testDir: "./e2e",
  outputDir: "test-results",
  // Next dev/Turbopack can invalidate a mobile browser's HMR chunks while
  // another project is navigating. Serial local runs keep smoke failures
  // attributable to the app instead of the dev server's transient chunks.
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : 1,
  reporter: process.env.CI
    ? [["line"], ["html", { open: "never" }]]
    : [["list"], ["html", { open: "never" }]],
  timeout: 45_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL,
    actionTimeout: 10_000,
    navigationTimeout: 30_000,
    // UI checks should exercise the current deployment, not a previously
    // cached immutable chunk. /sw.js is verified independently by the PWA test.
    serviceWorkers: "block",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "desktop-chromium",
      testMatch: /public-smoke\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "iphone-16-webkit",
      testMatch: /public-smoke\.spec\.ts/,
      use: {
        ...devices["iPhone 15 Pro"],
        viewport: { width: 393, height: 852 },
      },
    },
    {
      name: "iphone-17-webkit",
      testMatch: /public-smoke\.spec\.ts/,
      use: {
        ...devices["iPhone 15 Pro"],
        viewport: { width: 402, height: 874 },
      },
    },
    {
      name: "android-chromium",
      testMatch: /public-smoke\.spec\.ts/,
      use: { ...devices["Pixel 7"] },
    },
    ...(authState
      ? [
          {
            name: "authenticated-admin",
            testMatch: /authenticated-workflows\.spec\.ts/,
            use: {
              ...devices["Desktop Chrome"],
              storageState: authState,
            },
          },
          {
            name: "authenticated-iphone-16",
            testMatch: /authenticated-workflows\.spec\.ts/,
            use: {
              ...devices["iPhone 15 Pro"],
              viewport: { width: 393, height: 852 },
              storageState: authState,
            },
          },
        ]
      : []),
  ],
  webServer: isLocalBaseUrl
    ? {
        command: "npm run dev -- --hostname 127.0.0.1 --port 3000",
        url: `${baseURL}/api/health`,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        stdout: "pipe",
        stderr: "pipe",
      }
    : undefined,
});
