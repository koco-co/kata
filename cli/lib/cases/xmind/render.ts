/** Render the canonical CasesFile to a deterministic XMind workbook. */

import { RootTopic, Topic, type TopicBuilder, Workbook } from "xmind-generator";
import { writeFileAtomic } from "../../atomic-writer.ts";
import type { CaseItem, CaseRenderContext, CasesFile } from "../types.ts";
import {
  buildCaseTopic,
  buildL1Labels,
  buildL1Title,
  buildRootTitle,
  normalizeXmindBuffer,
  UNCLASSIFIED,
  type XmindMeta,
} from "./xmind-render.ts";

interface TopicGroup {
  name: string;
  items: Array<{ kind: "case"; value: CaseItem } | { kind: "group"; value: TopicGroup }>;
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
      value: c,
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
    // L1 标题 = 需求名 (#module_id)；需求 id 放入 tags（如 (#15911)）
    const moduleId = requirement.module_id?.trim();
    const title = moduleId ? `${requirement.title} (#${moduleId})` : requirement.title;
    return Topic(title)
      .labels([`(#${requirement.requirement_id})`])
      .children(topicChildren(casesToTopicRoot({ ...file, cases: requirementCases })));
  });
}

function wrappedRequirementTopics(file: CasesFile, meta: XmindMeta): TopicBuilder[] {
  let l1 = Topic(file.meta.l1_title ?? buildL1Title(meta)).children(requirementTopics(file));
  const labels = buildL1Labels(meta);
  if (labels.length > 0) l1 = l1.labels(labels);
  return [l1];
}

function casesMeta(file: CasesFile, projectName: string, context: CaseRenderContext): XmindMeta {
  return {
    project_name: projectName,
    requirement_name: file.meta.title,
    version: context.version,
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
    l1Topics = file.meta.l1_title ? wrappedRequirementTopics(file, meta) : requirementTopics(file);
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
