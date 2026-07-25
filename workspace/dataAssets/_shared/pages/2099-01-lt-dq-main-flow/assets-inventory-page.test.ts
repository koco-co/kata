import { describe, expect, test } from "bun:test";

import { isAssetsScheduleJobAcceptedStatus } from "./assets-inventory-page";

describe("assets inventory schedule job status handling", () => {
  test("accepts successful backend responses", () => {
    expect(isAssetsScheduleJobAcceptedStatus(200)).toBe(true);
    expect(isAssetsScheduleJobAcceptedStatus(302)).toBe(true);
  });

  test("treats gateway timeout as a tolerated long-running scheduler response", () => {
    expect(isAssetsScheduleJobAcceptedStatus(504)).toBe(true);
  });

  test("rejects other server and client errors", () => {
    expect(isAssetsScheduleJobAcceptedStatus(400)).toBe(false);
    expect(isAssetsScheduleJobAcceptedStatus(500)).toBe(false);
  });
});
