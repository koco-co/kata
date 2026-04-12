import { existsSync, readFileSync } from "node:fs";
import { join, posix } from "node:path";
import {
  type ProjectionRuntime,
  skillProjectionPath,
  skillReferencePath,
} from "../runtime/projection-targets.ts";
import {
  type ProductSkillProjectionContract,
  parseProductSkillContract,
  type SkillSection,
} from "./product-skill-contract.ts";
import type { AiCoreIssue, AiCoreResult } from "./types.ts";

export type RenderedSkillFile = {
  path: string;
  content: string;
};

export type SkillCallGraph = {
  upstreamCommands: string[];
  downstreamWorkflows: string[];
  downstreamAgents: string[];
  downstreamPlugins: string[];
  downstreamPrompts: string[];
};

type RenderProductSkillOptions = {
  runtime: ProjectionRuntime;
  skillRoot: string;
  repoRelativeSkillRoot: string;
  generatedHeader: string;
  callGraph?: SkillCallGraph;
};

function renderListSection(title: string, values: string[]): string[] {
  return [
    `## ${title}`,
    "",
    ...(values.length > 0 ? values.map((value) => `- ${value}`) : ["- none"]),
    "",
  ];
}

function renderKeyValueSection(title: string, values: Record<string, string | string[]>): string[] {
  return [
    `## ${title}`,
    "",
    ...Object.entries(values).flatMap(([key, value]) => {
      if (!Array.isArray(value)) return [`- ${key}: ${value}`];
      return [`- ${key}:`, ...value.map((item) => `  - ${item}`)];
    }),
    "",
  ];
}

function renderYamlBlockSection(title: string, lines: string[]): string[] {
  return [`## ${title}`, "", "```yaml", ...(lines.length > 0 ? lines : ["{}"]), "```", ""];
}

function isSafeReferencePath(path: string): boolean {
  if (!path.startsWith("references/")) return false;
  if (path.includes("\\") || path.includes("\0")) return false;
  const normalized = posix.normalize(path);
  return (
    normalized === path &&
    !normalized.startsWith("../") &&
    !normalized.includes("/../") &&
    normalized !== "references"
  );
}

function declaredReferencePaths(skill: ProductSkillProjectionContract): string[] {
  return [
    ...new Set([
      ...skill.alwaysLoad,
      ...skill.loadWhen.map((ref) => ref.path),
      ...skill.references.map((ref) => ref.path),
      ...skill.fewShots.map((fs) => fs.path),
    ]),
  ].sort();
}

function renderRoutingSummary(skill: ProductSkillProjectionContract): string[] {
  if (skill.routingSummary.length === 0) return [];
  return ["## 路由摘要", "", ...skill.routingSummary.map((s) => `- ${s}`), ""];
}

function renderInputs(skill: ProductSkillProjectionContract): string[] {
  if (skill.inputs.length === 0) return [];
  const lines: string[] = ["## 输入", ""];
  for (const input of skill.inputs) {
    const required =
      input.required === "true"
        ? "required"
        : input.required === "false"
          ? "optional"
          : "unspecified";
    const parts: string[] = [required];
    if (input.kind) parts.push(`kind=${input.kind}`);
    if (input.schema) parts.push(`schema=${input.schema}`);
    lines.push(`- ${input.name} (${parts.join(", ")})`);
  }
  lines.push("");
  return lines;
}

function renderCommandAliases(skill: ProductSkillProjectionContract): string[] {
  if (skill.commandAliases.length === 0) return [];
  const lines: string[] = ["## 命令别名", ""];
  for (const alias of skill.commandAliases) {
    const parts: string[] = [];
    if (alias.userInvocable) parts.push(`user_invocable=${alias.userInvocable}`);
    if (alias.lifecycle) parts.push(`lifecycle=${alias.lifecycle}`);
    if (alias.sinceVersion) parts.push(`since_version=${alias.sinceVersion}`);
    if (alias.removeAfter && alias.removeAfter !== "null")
      parts.push(`remove_after=${alias.removeAfter}`);
    const meta = parts.length > 0 ? ` (${parts.join(", ")})` : "";
    lines.push(`- ${alias.name}${meta}`);
    if (alias.reason) lines.push(`  - 原因: ${alias.reason}`);
  }
  lines.push("");
  return lines;
}

function renderCallGraph(callGraph: SkillCallGraph | undefined): string[] {
  if (!callGraph) return [];
  const hasAny =
    callGraph.upstreamCommands.length > 0 ||
    callGraph.downstreamWorkflows.length > 0 ||
    callGraph.downstreamAgents.length > 0 ||
    callGraph.downstreamPlugins.length > 0 ||
    callGraph.downstreamPrompts.length > 0;
  if (!hasAny) return [];
  const lines: string[] = ["## 调用图", ""];
  if (callGraph.upstreamCommands.length > 0) {
    lines.push(`- 上游命令: ${callGraph.upstreamCommands.map((c) => `/${c}`).join(", ")}`);
  }
  if (callGraph.downstreamWorkflows.length > 0) {
    lines.push(`- 下游 workflow: ${callGraph.downstreamWorkflows.join(", ")}`);
  }
  if (callGraph.downstreamAgents.length > 0) {
    lines.push(`- 下游 agents: ${callGraph.downstreamAgents.join(", ")}`);
  }
  if (callGraph.downstreamPrompts.length > 0) {
    lines.push(`- 下游 prompts: ${callGraph.downstreamPrompts.join(", ")}`);
  }
  if (callGraph.downstreamPlugins.length > 0) {
    lines.push(`- 下游 plugins: ${callGraph.downstreamPlugins.join(", ")}`);
  }
  lines.push("");
  return lines;
}

function renderSections(sections: SkillSection[]): string[] {
  if (sections.length === 0) return [];
  const lines: string[] = ["## 条件节", ""];
  for (const s of sections) {
    lines.push(`### ${s.id}`);
    lines.push("");
    lines.push(`- 加载条件: \`${s.loadWhen}\``);
    lines.push(`- ${s.summary}`);
    lines.push("");
  }
  return lines;
}

function renderReferencesSection(skill: ProductSkillProjectionContract): string[] {
  const rows: Array<{
    phases: string[];
    condition: string;
    path: string;
    type: string;
    purpose: string;
  }> = [
    ...skill.references.map((ref) => ({
      phases: ref.loadPhases,
      condition: ref.loadWhen,
      path: ref.path,
      type: ref.type === "normative" ? "规范" : "参考",
      purpose: ref.purpose,
    })),
    ...skill.fewShots.map((shot) => ({
      phases: shot.loadPhases,
      condition: shot.loadWhen,
      path: shot.path,
      type: "few-shot",
      purpose: shot.purpose,
    })),
  ];

  const lines: string[] = [
    "## 按需加载协议",
    "",
    "- 默认只读取当前 SKILL.md。",
    "- 禁止批量读取 references/**。",
    "- 只有当前阶段命中表格中的阶段与条件时，才读取对应文件。",
    "- 没有命中的 reference 不得读取；few-shot 只可作为格式参考，不得作为领域事实证据。",
    "",
  ];
  if (rows.length === 0) {
    lines.push("无外部参考；仅使用当前 SKILL.md 与任务证据。", "");
    return lines;
  }
  lines.push("| 阶段 | 条件 | 文件 | 类型 | 用途 |");
  lines.push("| --- | --- | --- | --- | --- |");
  for (const row of rows) {
    lines.push(
      `| ${row.phases.join(", ")} | \`${row.condition}\` | ${row.path} | ${row.type} | ${row.purpose} |`,
    );
  }
  lines.push("");
  return lines;
}

function renderFewShots(_skill: ProductSkillProjectionContract): string[] {
  return [];
}

function renderSkillContent(
  skill: ProductSkillProjectionContract,
  generatedHeader: string,
  callGraph: SkillCallGraph | undefined,
): string {
  return [
    "---",
    `name: ${skill.name}`,
    `description: ${skill.summary}`,
    "---",
    "",
    `# ${skill.name}`,
    "",
    generatedHeader.trimEnd(),
    "",
    "证据事实必须引用 SourceRef ID。",
    "",
    ...renderRoutingSummary(skill),
    ...renderInputs(skill),
    ...renderCallGraph(callGraph),
    ...renderListSection("触发条件", skill.mustTriggerWhen),
    ...renderListSection("不触发条件", skill.mustNotTriggerWhen),
    ...renderListSection("输出", skill.outputs),
    ...renderListSection("允许的工具", skill.allowedTools),
    ...renderCommandAliases(skill),
    ...renderYamlBlockSection("上下文预算", skill.contextBudgetLines),
    ...renderReferencesSection(skill),
    ...renderFewShots(skill),
    ...renderSections(skill.sections),
    ...renderKeyValueSection("证据策略", skill.evidencePolicy),
    ...renderKeyValueSection("失败策略", skill.failurePolicy),
    "## 硬规则",
    "",
    ...skill.hardRules.map((rule) => `- ${rule}`),
    "",
  ].join("\n");
}

function contractIssue(path: string, message: string): AiCoreIssue {
  return {
    code: "projection.contract_invalid",
    severity: "error",
    message,
    path,
  };
}

export function renderProductSkill(
  options: RenderProductSkillOptions,
): AiCoreResult<RenderedSkillFile[]> {
  const skillSource = readFileSync(join(options.skillRoot, "skill.yaml"), "utf8");
  const contractPath = `${options.repoRelativeSkillRoot}/skill.yaml`;
  const parsedSkill = parseProductSkillContract(skillSource, contractPath);
  if (!parsedSkill.ok) return { ok: false, issues: parsedSkill.issues };
  const skill = parsedSkill.value as ProductSkillProjectionContract;
  const issues: AiCoreIssue[] = [];

  for (const reference of declaredReferencePaths(skill)) {
    if (!isSafeReferencePath(reference)) {
      issues.push(
        contractIssue(
          contractPath,
          "Product skill reference path must be a safe references/** relative path.",
        ),
      );
    }
  }
  for (const reference of declaredReferencePaths(skill)) {
    if (!isSafeReferencePath(reference)) continue;
    if (!existsSync(join(options.skillRoot, reference))) {
      issues.push(
        contractIssue(
          `${options.repoRelativeSkillRoot}/${reference}`,
          "Required product skill reference is missing.",
        ),
      );
    }
  }
  if (issues.length > 0) return { ok: false, issues };

  const files: RenderedSkillFile[] = [
    {
      path: skillProjectionPath(options.runtime, skill.name),
      content: renderSkillContent(skill, options.generatedHeader, options.callGraph),
    },
  ];

  for (const reference of declaredReferencePaths(skill)) {
    const referencePath = join(options.skillRoot, reference);
    if (!existsSync(referencePath)) continue;
    files.push({
      path: skillReferencePath(options.runtime, skill.name, reference.slice("references/".length)),
      content: readFileSync(referencePath, "utf8"),
    });
  }

  return { ok: true, value: files, issues: [] };
}
