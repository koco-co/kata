import { describe, expect, test } from "bun:test";
import { repoRoot } from "../../lib/paths.ts";
import { checkRoutes, formatRouteCheckReport } from "../../src/skills/route-check.ts";

describe("repository route contracts", () => {
  test("route contracts cover every runtime skill", () => {
    const root = repoRoot();
    const report = checkRoutes(root);
    expect(formatRouteCheckReport(report, root)).toBe("route check passed");
  });
});
