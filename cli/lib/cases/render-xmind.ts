/**
 * Render CasesFile to xmind by mapping onto the T1 IntermediateJson pipeline.
 */

import { RootTopic, Topic, type TopicBuilder, Workbook } from "xmind-generator";
import { writeFileAtomic } from "../atomic-writer.ts";
import type { IntermediateJson, Module, Page, SubGroup, TestCase } from "../intermediate-types.ts";
import {
  buildCaseTopic,
  buildL1Labels,
  buildL1Title,
  buildRootTitle,
  normalizeXmindBuffer,
  UNCLASSIFIED,
} from "../xmind-render.ts";
import type { CaseRenderContext, CasesFile } from "./types.ts";

/** Map a flat CasesFile back to the hierarchical IntermediateJson for rendering. */
export function casesToIntermediate(
  file: CasesFile,
  projectName: string,
  context: CaseRenderContext,
): IntermediateJson {
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
      project_name: projectName,
      requirement_name: file.meta.title,
      version: context.version,
      case_module_id: file.meta.case_module_id,
      ...(file.meta.requirement_id ? { requirement_id: file.meta.requirement_id } : {}),
      ...(file.meta.source ? { description: file.meta.source } : {}),
    },
    modules,
  };
}

interface TopicGroup {
  name: string;
  items: Array<{ kind: "case"; value: TestCase } | { kind: "group"; value: TopicGroup }>;
  groups: Map<string, TopicGroup>;
}

function newTopicGroup(name: string): TopicGroup {
  return { name, items: [], groups: new Map() };
}

function casesToTopicRoot(file: CasesFile): TopicGroup {
  const root = newTopicGroup(UNCLASSIFIED);
  for (const c of file.cases) {
    let current = root;
    // “未分类”是导入过程的占位层级，不是用户业务分类；直接跳过，
    // 让用例落到最近的真实分类或 L1 下。
    const tags = (c.tags ?? []).filter((tag) => tag !== UNCLASSIFIED);
    for (const tag of tags) {
      let group = current.groups.get(tag);
      if (!group) {
        group = newTopicGroup(tag);
        current.groups.set(tag, group);
        current.items.push({ kind: "group", value: group });
      }
      current = group;
    }
    current.items.push({
      kind: "case",
      value: {
        case_id: c.id,
        title: c.title,
        priority: c.priority,
        ...(c.precondition ? { preconditions: c.precondition } : {}),
        steps: c.steps.map((s) => ({ step: s.action, expected: s.expected })),
      },
    });
  }
  return root;
}

function topicChildren(group: TopicGroup): TopicBuilder[] {
  return group.items.map((item) =>
    item.kind === "case"
      ? buildCaseTopic(item.value)
      : Topic(item.value.name).children(topicChildren(item.value)),
  );
}

function requirementTopics(file: CasesFile): TopicBuilder[] {
  return (file.requirements ?? []).map((requirement) => {
    const requirementCases = file.cases.filter(
      (item) => item.requirement_id === requirement.requirement_id,
    );
    return Topic(requirement.title)
      .labels([`(#${requirement.requirement_id})`])
      .children(topicChildren(casesToTopicRoot({ ...file, cases: requirementCases })));
  });
}

function casesMeta(file: CasesFile, projectName: string, context: CaseRenderContext) {
  return {
    project_name: projectName,
    requirement_name: file.meta.title,
    version: context.version,
    ...(file.meta.source ? { description: file.meta.source } : {}),
    ...(file.meta.requirement_id ? { requirement_id: file.meta.requirement_id } : {}),
    case_module_id: file.meta.case_module_id,
  };
}

/** Render a CasesFile to a deterministic XMind buffer with unlimited tag depth. */
export async function renderXmindBuffer(
  file: CasesFile,
  projectName: string,
  context: CaseRenderContext,
): Promise<Buffer> {
  const meta = casesMeta(file, projectName, context);
  let l1Topics: TopicBuilder[];
  if (file.meta.layout === "requirements") {
    l1Topics = requirementTopics(file);
  } else {
    const l1Children = topicChildren(casesToTopicRoot(file));
    let l1 = Topic(buildL1Title(meta)).children(l1Children);
    const labels = buildL1Labels(meta);
    if (labels.length > 0) l1 = l1.labels(labels);
    l1Topics = [l1];
  }
  const root = RootTopic(buildRootTitle(meta)).children(l1Topics).sheetTitle(buildRootTitle(meta));
  const buffer = await Workbook(root).archive();
  return normalizeXmindBuffer(Buffer.from(buffer));
}

/** Render cases/exports/需求名.xmind from a CasesFile. */
export async function renderXmind(
  file: CasesFile,
  outPath: string,
  projectName: string,
  context: CaseRenderContext,
): Promise<void> {
  writeFileAtomic(outPath, await renderXmindBuffer(file, projectName, context));
}
