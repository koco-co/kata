import { test as base, expect } from "../../../../_shared/fixtures/step-screenshot";
import { getEnvConfig } from "../../../../_shared/runtime/env-profile";
import { runUniversalPrecond } from "../precond/universal-precond";

export const test = base.extend<{}, { preconditionsReady: void }>({
  preconditionsReady: [
    async ({ browser }, use) => {
      const env = getEnvConfig();
      const page = await browser.newPage({ storageState: env.auth.sessionPath });
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
