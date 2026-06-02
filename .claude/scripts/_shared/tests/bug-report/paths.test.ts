import { describe, expect, test } from "bun:test";
import { defectDir } from "@shared/lib/paths.ts";

describe("defectDir", () => {
  test("points to the project defects bucket", () => {
    const dir = defectDir("dtstack", "202606", "bug_order-npe");
    expect(dir).toContain("/_shared/archive/defects/202606-bug_order-npe");
  });
});
