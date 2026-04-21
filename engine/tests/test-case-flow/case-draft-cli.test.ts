import { describe, expect, it } from "bun:test";
import { existsSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnKataCli } from "../cli-runner.ts";

describe("case-draft CLI entry", () => {
  it("dry-runs a Lanhu source without writing a session", () => {
    const cwd = mkdtempSync(join(tmpdir(), "kata-case-draft-cli-"));
    const result = spawnKataCli(
      [
        "case-draft",
        "start",
        "--source",
        "https://lanhuapp.com/web/#/item/project/product?tid=xxx&pid=xxx&docId=xxx",
        "--project",
        "dataAssets",
        "--dry-run",
        "--json",
      ],
      {
        cwd,
        env: {
          KATA_LANHU_COOKIE: "test-stub",
        },
      },
    );

    expect(result.status).toBe(0);
    const payload = JSON.parse(result.stdout) as {
      status: string;
      project: string;
      nextStep: string;
      source: { kind: string };
      plugin: { matched: boolean; name: string; fetchCommand: string };
    };
    expect(payload.status).toBe("ready_to_probe");
    expect(payload.project).toBe("dataAssets");
    expect(payload.nextStep).toBe("probe");
    expect(payload.source.kind).toBe("lanhu_url");
    expect(payload.plugin.matched).toBe(true);
    expect(payload.plugin.name).toBe("lanhu");
    expect(payload.plugin.fetchCommand).toContain("plugins/lanhu/fetch.ts");
    expect(existsSync(join(cwd, ".kata", "sessions"))).toBe(false);
  });
});
