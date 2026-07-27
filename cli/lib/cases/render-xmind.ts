/**
 * Render CasesFile to xmind by mapping onto the T1 IntermediateJson pipeline.
 */

import type { IntermediateJson, Module, Page, SubGroup, TestCase } from "../intermediate-types.ts";
import { createXmindReplacing, UNCLASSIFIED } from "../xmind-render.ts";
import type { CasesFile } from "./types.ts";

/** Map a flat CasesFile back to the hierarchical IntermediateJson for rendering. */
export function casesToIntermediate(file: CasesFile): IntermediateJson {
  // 按 tags 层级路径 [module, page, subgroup] 还原树;保持首次出现顺序
  const modules: Module[] = [];
  const moduleIdx = new Map<string, Module>();
  const pageIdx = new Map<string, Page>();
  const groupIdx = new Map<string, SubGroup>();
  for (const c of file.cases) {
    const [modName = UNCLASSIFIED, pageName, groupName] = c.tags ?? [];
    let mod = moduleIdx.get(modName);
    if (!mod) {
      mod = { name: modName, pages: [] };
      moduleIdx.set(modName, mod);
      modules.push(mod);
    }
    const tc: TestCase = {
      case_id: c.id,
      title: c.title,
      priority: c.priority,
      ...(c.precondition ? { preconditions: c.precondition } : {}),
      steps: c.steps.map((s) => ({ step: s.action, expected: s.expected })),
    };
    if (!pageName) {
      // 无页面层级:挂到模块的隐式单页。页名用 UNCLASSIFIED 而非模块名,
      // 既避免「模块>同名模块」嵌套,也让渲染层把用例平铺到模块下
      let page = pageIdx.get(modName);
      if (!page) {
        page = { name: UNCLASSIFIED, test_cases: [] };
        pageIdx.set(modName, page);
        mod.pages.push(page);
      }
      page.test_cases?.push(tc);
      continue;
    }
    const pageKey = `${modName}\u0000${pageName}`;
    let page = pageIdx.get(pageKey);
    if (!page) {
      page = { name: pageName };
      pageIdx.set(pageKey, page);
      mod.pages.push(page);
    }
    if (!groupName) {
      page.test_cases = page.test_cases ?? [];
      page.test_cases.push(tc);
      continue;
    }
    const groupKey = `${pageKey}\u0000${groupName}`;
    let group = groupIdx.get(groupKey);
    if (!group) {
      group = { name: groupName, test_cases: [] };
      groupIdx.set(groupKey, group);
      page.sub_groups = page.sub_groups ?? [];
      page.sub_groups.push(group);
    }
    group.test_cases.push(tc);
  }
  return {
    meta: {
      project_name: file.meta.feature_id,
      requirement_name: file.meta.title,
      version: file.meta.version,
      ...(file.meta.source ? { description: file.meta.source } : {}),
    },
    modules,
  };
}

/** Render cases/需求名.xmind from a CasesFile; atomically replaces any existing file. */
export async function renderXmind(file: CasesFile, outPath: string): Promise<void> {
  await createXmindReplacing(casesToIntermediate(file), outPath);
}
