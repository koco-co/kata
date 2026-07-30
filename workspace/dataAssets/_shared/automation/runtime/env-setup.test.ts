import { describe, expect, test } from "bun:test";

import { buildDataAssetsApiUrl } from "./env-setup";

describe("dataAssets API URL builder", () => {
  const testBaseUrl = ["http:", "", "example.test"].join("/");

  test("builds backend API URLs from the environment base URL without the UI product path", () => {
    expect(buildDataAssetsApiUrl("/dassets/v1/scheduleJob/affectCountStatistic", testBaseUrl)).toBe(
      `${testBaseUrl}/dassets/v1/scheduleJob/affectCountStatistic`,
    );
  });

  test("strips a trailing UI /dataAssets path before appending backend API paths", () => {
    expect(
      buildDataAssetsApiUrl(
        "/dassets/v1/scheduleJob/saveOneDayDataDistribution",
        `${testBaseUrl}/dataAssets`,
      ),
    ).toBe(`${testBaseUrl}/dassets/v1/scheduleJob/saveOneDayDataDistribution`);
  });
});
