import { describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { emitBusinessNotification } from "../../cli/integrations/notify/index.ts";

function fixtureRoot(): string {
  const root = mkdtempSync(join(tmpdir(), "kata-notify-path-"));
  mkdirSync(join(root, "workspace", "dataAssets"), { recursive: true });
  return root;
}

describe("notification ledger path policy", () => {
  it("rejects a symlinked state directory before writing a ledger", async () => {
    const root = fixtureRoot();
    const outside = mkdtempSync(join(tmpdir(), "kata-notify-outside-"));
    try {
      symlinkSync(outside, join(root, "workspace", "dataAssets", ".state"));
      await expect(
        emitBusinessNotification(
          "bug-analysis-completed",
          {
            project: "dataAssets",
            version: "v7.0.0",
            feature: "v7.0.0/【模块】需求",
            completed_at: "2026-08-01 00:00:00 Asia/Taipei",
            report_path: "workspace/dataAssets/analyses/bug-report/202608/demo.md",
          },
          { root },
        ),
      ).rejects.toThrow("通知账本目录 不得经过符号链接");
    } finally {
      rmSync(root, { recursive: true, force: true });
      rmSync(outside, { recursive: true, force: true });
    }
  });
});
