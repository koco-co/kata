import { describe, expect, it } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

describe("bug report renderer resources", () => {
  it("loads bundled templates independently of the current workspace root", () => {
    const fakeRoot = mkdtempSync(join(tmpdir(), "kata-render-root-"));
    mkdirSync(join(fakeRoot, "workspace"));
    writeFileSync(join(fakeRoot, "package.json"), '{"name":"external-kata-workspace"}\n');
    const moduleUrl = pathToFileURL(
      resolve(import.meta.dir, "../../cli/lib/bug-report-render.ts"),
    ).href;
    const script = [
      `import { renderBugReport } from ${JSON.stringify(moduleUrl)};`,
      "const html = renderBugReport({",
      '  title: "外部工作区模板验证",',
      '  severity: "normal",',
      '  summary: "summary",',
      '  problem_type: "代码问题",',
      '  conclusion: "conclusion",',
      '  evidence: "evidence",',
      '  actual_behavior: "actual",',
      '  expected_behavior: "expected",',
      '  reproduction_steps: ["step"],',
      '  root_cause: "cause",',
      '  recommendations: ["fix"]',
      "});",
      "process.stdout.write(html);",
    ].join("\n");

    try {
      const result = spawnSync("bun", ["-e", script], {
        cwd: fakeRoot,
        encoding: "utf8",
      });
      expect(result.status).toBe(0);
      expect(result.stderr).toBe("");
      expect(result.stdout).toContain("外部工作区模板验证");
    } finally {
      rmSync(fakeRoot, { recursive: true, force: true });
    }
  });
});
