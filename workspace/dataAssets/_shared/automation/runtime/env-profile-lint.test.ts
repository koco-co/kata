import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const FORBIDDEN =
  /process\.env\.(QUALITY_PROJECT_ID|VALID_PROJECT_ID|BATCH_PROJECT_NAME|DATASOURCE_MATRIX|DATAASSETS_PROJECT_ID|DATAASSETS_DATASOURCE_ID|SPARK_WAREHOUSE_URI)\b/;
const ALLOWED = new Set([
  "workspace/dataAssets/_shared/automation/runtime/env-profile.ts",
  "workspace/dataAssets/_shared/automation/runtime/env-profile.test.ts",
  "workspace/dataAssets/_shared/automation/runtime/env-profile-lint.test.ts",
]);

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (path.includes("/reports/") || path.includes("/history/") || path.includes("/audits/"))
      continue;
    const stat = statSync(path);
    if (stat.isDirectory()) out.push(...walk(path));
    if (stat.isFile() && path.endsWith(".ts")) out.push(path);
  }
  return out;
}

describe("dataAssets env profile lint", () => {
  test("active TypeScript does not read deprecated env constants directly", () => {
    const offenders = walk("workspace/dataAssets")
      .filter((path) => !ALLOWED.has(path))
      .filter((path) => FORBIDDEN.test(readFileSync(path, "utf8")));
    expect(offenders).toEqual([]);
  });
});
