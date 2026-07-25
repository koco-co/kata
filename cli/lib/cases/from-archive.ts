/**
 * One-shot converter: archive.md -> cases.yaml text.
 * Reuses the T1 archive parser (frontmatter + headings + step tables).
 * Removed after the workspace migration is verified.
 */

import { stringify } from "yaml";
import type { Module, Page, TestCase } from "../intermediate-types.ts";
import { parseArchiveBody, parseFrontMatter } from "../xmind-archive.ts";
import type { CaseItem, CaseMeta } from "./types.ts";

// 合法优先级;parser 从【P\d】取值,可能超出 P0/P1/P2
function clampPriority(p: string): CaseItem["priority"] {
  return p === "P0" || p === "P1" || p === "P2" ? p : "P1";
}

function stripPriority(title: string): string {
  return title.replace(/^【P\d】\s*/, "");
}

/** Flatten the module/page/subgroup tree into CaseItem[] with tag paths. */
export function modulesToCases(modules: Module[]): CaseItem[] {
  const out: CaseItem[] = [];
  let seq = 0;
  const push = (tc: TestCase, tags: string[]) => {
    seq += 1;
    const item: CaseItem = {
      id: tc.case_id ?? `C${String(seq).padStart(3, "0")}`,
      title: stripPriority(tc.title),
      priority: clampPriority(tc.priority),
      // 源档中的标题党用例(无步骤表)补一个空步骤占位,保持 cases.yaml 可校验
      steps:
        tc.steps.length > 0
          ? tc.steps.map((s) => ({ action: s.step, expected: s.expected }))
          : [{ action: "", expected: "" }],
    };
    if (tc.preconditions?.trim()) item.precondition = tc.preconditions;
    // 克隆数组:同一 page 的用例共享 tags 实例会让 yaml 生成锚点/别名
    if (tags.length > 0) item.tags = [...tags];
    out.push(item);
  };
  for (const mod of modules) {
    for (const page of mod.pages) {
      collectPage(page, [mod.name], push);
    }
  }
  return out;
}

function collectPage(
  page: Page,
  path: string[],
  push: (tc: TestCase, tags: string[]) => void,
): void {
  const pagePath = [...path, page.name];
  for (const tc of page.test_cases ?? []) push(tc, pagePath);
  for (const sg of page.sub_groups ?? []) {
    for (const tc of sg.test_cases) push(tc, [...pagePath, sg.name]);
  }
}

/** Convert archive.md text to cases.yaml text with the given meta. */
export function archiveToCasesYaml(mdText: string, meta: CaseMeta): string {
  let { body } = parseFrontMatter(mdText);
  // 变体兼容:有的 archive 用 #### 作用例标题(无 ##### 时),降级处理
  if (!/^##### /m.test(body) && /^#### 【/m.test(body)) {
    body = body.replace(/^#### (【)/gm, "##### $1");
  }
  const modules = parseArchiveBody(body);
  const cases = modulesToCases(modules);
  return stringify({ meta, cases }, { lineWidth: 0 });
}
