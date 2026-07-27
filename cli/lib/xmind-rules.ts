import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export interface XmindRules {
  root_title_template: string;
  iteration_id: string;
}

// 中性默认值。如需带产品名前缀，在项目级 `workspace/{project}/_shared/rules/xmind-structure.md`
// 中 override `root_title_template` 与 `iteration_id`。模板支持 {{project_name}}、{{prd_version}}、{{iteration_id}}。
const DEFAULTS: XmindRules = {
  root_title_template: "{{project_name}}v{{prd_version}}迭代用例(#{{iteration_id}})",
  iteration_id: "23",
};

/** Parse xmind-structure.md content, overriding base rules with any `root_title_template` / `iteration_id` found. */
function parseRulesFromContent(content: string, base: XmindRules): XmindRules {
  const result = { ...base };
  const tmplMatch = content.match(/root_title_template:\s*`([^`]+)`/);
  if (tmplMatch) result.root_title_template = tmplMatch[1];
  const idMatch = content.match(/iteration_id:\s*(\S+)/);
  if (idMatch) result.iteration_id = idMatch[1];
  return result;
}

/** Load xmind rendering rules: project override (workspace/<project>/_shared/rules) over neutral defaults. */
export function loadXmindRules(projectDir?: string): XmindRules {
  let result = { ...DEFAULTS };
  if (projectDir) {
    try {
      const projPath = join(projectDir, "_shared", "rules", "xmind-structure.md");
      if (existsSync(projPath)) {
        result = parseRulesFromContent(readFileSync(projPath, "utf-8"), result);
      }
    } catch {
      // 读取失败回落默认值
    }
  }
  return result;
}

/** Build the xmind root node title from a version string and rendering rules. */
export function buildRootName(
  version: string | undefined,
  rules?: XmindRules,
  projectName?: string,
): string {
  if (!version) return "";
  const p = rules ?? DEFAULTS;
  const ver = version.replace(/^v/i, "");
  // 占位符全局替换:模板允许同一占位符出现多次
  return p.root_title_template
    .replaceAll("{{project_name}}", projectName ?? "")
    .replaceAll("{{prd_version}}", ver)
    .replaceAll("{{iteration_id}}", p.iteration_id);
}
