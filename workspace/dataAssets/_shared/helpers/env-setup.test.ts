import { describe, expect, test } from "bun:test";

import { buildDataAssetsApiUrl } from "./env-setup";

describe("dataAssets API URL builder", () => {
  test("builds backend API URLs from the environment base URL without the UI product path", () => {
    expect(buildDataAssetsApiUrl("/dassets/v1/scheduleJob/affectCountStatistic", "http://example.test")).toBe(
      "http://example.test/dassets/v1/scheduleJob/affectCountStatistic",
    );
  });

  test("strips a trailing UI /dataAssets path before appending backend API paths", () => {
    expect(buildDataAssetsApiUrl("/dassets/v1/scheduleJob/saveOneDayDataDistribution", "http://example.test/dataAssets")).toBe(
      "http://example.test/dassets/v1/scheduleJob/saveOneDayDataDistribution",
    );
  });
});
