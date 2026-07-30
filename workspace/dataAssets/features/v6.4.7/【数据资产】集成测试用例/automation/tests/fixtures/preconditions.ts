import { test as base, expect } from "../../../../../../_shared/fixtures/step-screenshot";
import {
  cookieHeaderToPlaywrightState,
  getEnvConfig,
} from "../../../../../../_shared/runtime/env-profile";
import { runUniversalPrecond } from "./precond/universal-precond";

export const test = base.extend<{}, { preconditionsReady: void }>({
  preconditionsReady: [
    async ({ browser }, use) => {
      const env = getEnvConfig();
      const state = cookieHeaderToPlaywrightState(env.urls.baseUrl, env.auth.cookie);
      const page = await browser.newPage({
        storageState: { cookies: [...state.cookies], origins: [...state.origins] },
      });
      try {
        await runUniversalPrecond(page);
      } finally {
        await page.close();
      }
      await use();
    },
    { scope: "worker", auto: true },
  ],
});

export { expect };
