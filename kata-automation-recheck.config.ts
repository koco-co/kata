import config from "./playwright.config.ts";

export default {
  ...config,
  testMatch: [
    "workspace/dataAssets/features/**/automation/scripts/one-shot/result-recheck.spec.ts",
  ],
};
