import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { repoRoot } from "@shared/lib/paths.ts";

const HOOK = join(import.meta.dirname, "../../hooks/pre-edit-guard.ts");
const REPO = repoRoot();

describe("pre-edit-guard hook (H1)", () => {
  test("blocks Edit on .kata/repos/", () => {
    const input = JSON.stringify({
      tool_name: "Edit",
      tool_input: { file_path: join(REPO, ".kata/repos/dataAssets/foo/bar.ts") },
    });
    const r = spawnSync("bun", ["run", HOOK], { input, encoding: "utf8" });
    expect(r.status).toBe(2);
    expect(r.stderr).toContain("source repository evidence");
  });

  test("blocks Edit on workspace/{p}/.kata/repos/", () => {
    const input = JSON.stringify({
      tool_name: "Edit",
      tool_input: {
        file_path: join(REPO, "workspace/dataAssets/.kata/repos/group/repo/src/index.ts"),
      },
    });
    const r = spawnSync("bun", ["run", HOOK], { input, encoding: "utf8" });
    expect(r.status).toBe(2);
    expect(r.stderr).toContain("source repository evidence");
  });

  test("allows Edit on workspace/{p}/features/", () => {
    const input = JSON.stringify({
      tool_name: "Edit",
      tool_input: {
        file_path: join(REPO, "workspace/dataAssets/features/202604-foo/tests/cases/t1.ts"),
      },
    });
    const r = spawnSync("bun", ["run", HOOK], { input, encoding: "utf8" });
    expect(r.status).toBe(0);
  });
});
