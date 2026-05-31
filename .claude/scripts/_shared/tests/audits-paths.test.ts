import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { auditDir, auditFile, repoRoot } from "@shared/lib/paths.ts";

describe("audit paths", () => {
  test("auditDir resolves under workspace/{project}/_shared/archive/audits/{ym}-{slug}", () => {
    const dir = auditDir("dataAssets", "202604", "release_6_3_x__release_6_3_0_dev");
    expect(dir).toBe(
      join(
        repoRoot(),
        "workspace",
        "dataAssets",
        "_shared",
        "archive",
        "audits",
        "202604-release_6_3_x__release_6_3_0_dev",
      ),
    );
  });

  test("auditFile joins additional segments", () => {
    const file = auditFile("dataAssets", "202604", "slug", "report.json");
    expect(file.endsWith("audits/202604-slug/report.json")).toBe(true);
  });
});
