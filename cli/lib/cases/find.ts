import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { assertFeatureNoSymlink, assertNoSymlinkPath } from "../features-layout.ts";

/** Locate the single canonical yaml under <featureDir>/cases. */
export function findCasesYaml(featureDir: string): { yamlPath: string; name: string } {
  const casesDir = join(featureDir, "cases");
  assertFeatureNoSymlink(featureDir);
  assertNoSymlinkPath(featureDir, casesDir, "cases");
  if (!existsSync(casesDir)) throw new Error(`cases 目录不存在: ${casesDir}`);
  const yamls = readdirSync(casesDir).filter((f) => f.endsWith(".yaml"));
  if (yamls.length === 0) throw new Error(`cases/ 下没有 yaml 用例源: ${casesDir}`);
  if (yamls.length > 1) throw new Error(`cases/ 下 yaml 不唯一: ${yamls.join(", ")}`);
  const yamlPath = join(casesDir, yamls[0]);
  assertNoSymlinkPath(featureDir, yamlPath, "cases YAML");
  return { yamlPath, name: yamls[0].replace(/\.yaml$/, "") };
}
