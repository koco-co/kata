import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const REPO_ROOT = resolve(import.meta.dirname, "../..");

function readRepoFile(path: string): string {
  return readFileSync(resolve(REPO_ROOT, path), "utf8");
}

describe("P4-06 command execution hardening", () => {
  it("keeps scoped integration command runners off execSync shell strings", () => {
    const scopedFiles = [
      "tools/dtstack-sdk/src/adapters/execute-table.ts",
      "plugins/lanhu/fetch.ts",
    ];

    for (const file of scopedFiles) {
      expect(readRepoFile(file), file).not.toContain("execSync(");
    }
  });

  it("keeps Zentao plugin secret names aligned with runtime env names", () => {
    const manifest = JSON.parse(
      readRepoFile("docs/skills/contracts/plugins/zentao/plugin.json"),
    ) as {
      capability_required: { secret_refs: string[] };
    };
    const runtime = JSON.parse(
      readRepoFile("docs/skills/contracts/plugins/zentao/runtime.json"),
    ) as {
      env_required: string[];
    };

    expect(manifest.capability_required.secret_refs).not.toContain("KATA_ZENTAO_TOKEN");
    expect(manifest.capability_required.secret_refs).toEqual(
      expect.arrayContaining(runtime.env_required),
    );
  });
});
