import { defineConfig, devices } from "@playwright/test";

/**
 * Smoke tests against a RUNNING copy of the site (the Docker app, or `npm run dev`); this
 * config deliberately does not start a server. Point it elsewhere with BASE_URL:
 *
 *   npm run test:e2e
 *   BASE_URL=http://100.123.85.59:3000 npm run test:e2e
 *
 * Uses the Google Chrome already installed on the machine (channel "chrome"), so no browser
 * download is needed. Several tests check the content migrated from Wix, so they expect the
 * migrated database; they are grouped under "contenido migrado de Wix".
 */
export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: process.env.BASE_URL ?? "http://localhost:3000",
    trace: "off",
  },
  projects: [{ name: "chrome", use: { ...devices["Desktop Chrome"], channel: "chrome" } }],
});
