import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const REPO_ROOT = resolve(import.meta.dirname, "../../../..");

function readRepoFile(path: string): string {
  return readFileSync(resolve(REPO_ROOT, path), "utf8");
}

describe("P4-06 command execution hardening", () => {
  it("keeps scoped integration command runners off execSync shell strings", () => {
    const scopedFiles = [
      ".claude/packages/dtstack/src/adapters/execute-table.ts",
      ".claude/plugins/lanhu/fetch.ts",
    ];

    for (const file of scopedFiles) {
      expect(readRepoFile(file), file).not.toContain("execSync(");
    }
  });

  it("keeps Zentao plugin secret names aligned with current env names", () => {
    const manifest = JSON.parse(readRepoFile(".claude/plugins/zentao/plugin.json")) as {
      env_required: string[];
    };

    expect(manifest.env_required).not.toContain("KATA_ZENTAO_TOKEN");
    expect(manifest.env_required).toEqual(
      expect.arrayContaining([
        "KATA_ZENTAO_BASE_URL",
        "KATA_ZENTAO_ACCOUNT",
        "KATA_ZENTAO_PASSWORD",
      ]),
    );
  });
});
