import { readFileSync } from "node:fs";
import {
  cancel,
  confirm,
  intro,
  isCancel,
  log,
  multiselect,
  note,
  outro,
  select,
  text,
} from "@clack/prompts";
import { runAllCasesLint, runCasesLint } from "../../commands/cases.ts";
import { findCasesYaml, runCasesBuild } from "../../commands/cases-build.ts";
import { runFeaturesList } from "../../commands/features.ts";
import type { CaseExportFormat } from "../cases/formats.ts";
import { listWorkspaceProjects } from "../workspace-locator.ts";
import { recentHistory, recordFeature } from "./history.ts";
import { existingCaseModuleId, featureRefByProjectPath, formatBuildReport } from "./registry.ts";
import type { FeatureRef } from "./types.ts";

export interface TuiInitialFeature {
  project: string;
  relativePath: string;
}

export async function startTui(initial?: TuiInitialFeature): Promise<void> {
  intro("kata TUI");
  if (initial) {
    const ref = featureRefByProjectPath(initial.project, initial.relativePath);
    if (!ref) {
      log.error(`未找到 feature: ${initial.project}:${initial.relativePath}`);
      outro("退出 kata TUI");
      return;
    }
    await featureMenu(ref);
    outro("退出 kata TUI");
    return;
  }
  await rootMenu();
  outro("退出 kata TUI");
}

async function rootMenu(): Promise<void> {
  for (;;) {
    const choice = await select({
      message: "选择操作",
      options: [
        { value: "features", label: "Features", hint: "按项目浏览 Feature" },
        { value: "cases", label: "Cases", hint: "用例全局操作" },
        { value: "history", label: "History", hint: "最近操作 5 个 Feature" },
        { value: "__exit__", label: "退出", hint: "退出 kata TUI" },
      ],
    });
    if (isCancel(choice) || choice === "__exit__") return;
    if (choice === "features") {
      await featuresMenu();
    } else if (choice === "cases") {
      await casesMenu();
    } else if (choice === "history") {
      await historyMenu();
    }
  }
}

async function featuresMenu(): Promise<void> {
  const project = await pickProject();
  if (!project) return;
  const version = await pickVersion(project);
  if (!version) return;
  const ref = await pickFeature(project, version);
  if (!ref) return;
  await featureMenu(ref);
}

async function casesMenu(): Promise<void> {
  for (;;) {
    const choice = await select({
      message: "Cases",
      options: [
        { value: "list", label: "List", hint: "项目/Feature 列表" },
        { value: "build", label: "Build", hint: "选择 Feature 构建" },
        { value: "lint", label: "Lint", hint: "全部或单项目 lint" },
        { value: "back", label: "返回", hint: "返回主菜单" },
      ],
    });
    if (isCancel(choice) || choice === "back") return;
    if (choice === "lint") {
      await casesLint();
    } else {
      const project = await pickProject();
      if (!project) continue;
      const version = await pickVersion(project);
      if (!version) continue;
      const ref = await pickFeature(project, version);
      if (ref) await featureMenu(ref);
    }
  }
}

async function casesLint(): Promise<void> {
  const scope = await select({
    message: "Lint 范围",
    options: [
      { value: "all", label: "全部项目" },
      { value: "project", label: "单个项目" },
      { value: "back", label: "返回" },
    ],
  });
  if (isCancel(scope) || scope === "back") return;
  try {
    if (scope === "all") {
      const result = runAllCasesLint();
      note(
        formatViolations(result.violations),
        `全部项目 Lint · ${result.violations.length} violation(s)`,
      );
      return;
    }
    const project = await pickProject();
    if (!project) return;
    const result = runCasesLint({ project });
    note(
      formatViolations(result.violations),
      `${project} Lint · ${result.violations.length} violation(s)`,
    );
  } catch (error) {
    log.error(`Lint 失败: ${errorMessage(error)}`);
  }
}

async function historyMenu(): Promise<void> {
  const entries = recentHistory();
  if (entries.length === 0) {
    note("打开或操作 Feature 后会记录最近 5 条", "History");
    return;
  }
  const choice = await select({
    message: "最近操作",
    options: entries.map((entry) => ({
      value: entry.feature_key,
      label: entry.title,
      hint: `${entry.project} · ${entry.relative_path}`,
    })),
  });
  if (isCancel(choice)) return;
  const entry = entries.find((item) => item.feature_key === choice);
  if (!entry) return;
  try {
    const ref = featureRefByProjectPath(entry.project, entry.relative_path);
    if (!ref) {
      log.error(`Feature 已失效: ${entry.project}:${entry.relative_path}`);
      return;
    }
    await featureMenu(ref);
  } catch (error) {
    log.error(`Feature 已失效: ${errorMessage(error)}`);
  }
}

async function featureMenu(ref: FeatureRef): Promise<void> {
  recordFeature(ref);
  for (;;) {
    const choice = await select({
      message: `${ref.title}（${ref.project} · ${ref.version}）`,
      options: [
        { value: "lint", label: "Lint", hint: "执行 cases lint" },
        { value: "build", label: "Build", hint: "XMind/CSV 构建" },
        { value: "yaml", label: "View YAML", hint: "查看 cases YAML" },
        { value: "back", label: "返回", hint: "返回上一级" },
      ],
    });
    if (isCancel(choice) || choice === "back") return;
    if (choice === "lint") {
      await lintFeature(ref);
    } else if (choice === "build") {
      await buildFeature(ref);
    } else {
      await viewYaml(ref);
    }
  }
}

async function lintFeature(ref: FeatureRef): Promise<void> {
  try {
    const result = runCasesLint({ project: ref.project, feature: ref.relativePath });
    note(formatViolations(result.violations), `Lint · ${result.violations.length} violation(s)`);
  } catch (error) {
    log.error(`Lint 失败: ${errorMessage(error)}`);
  }
}

async function buildFeature(ref: FeatureRef): Promise<void> {
  const formatChoice = await multiselect({
    message: "选择导出格式（可多选）",
    options: [
      { value: "xmind", label: "XMind", hint: "cases/exports/*.xmind" },
      { value: "csv", label: "CSV", hint: "ZenTao 导入格式" },
    ],
    required: false,
  });
  if (isCancel(formatChoice)) return;
  if (!formatChoice || formatChoice.length === 0) {
    log.warn("未选择导出格式");
    return;
  }
  const formats = [...formatChoice] as CaseExportFormat[];
  let caseModuleId: string | undefined;
  if (formats.includes("csv")) {
    const existing = existingCaseModuleId(ref);
    const input = await text({
      message: existing ? `禅道模块 ID（当前 ${existing}）` : "禅道模块 ID",
      initialValue: existing || undefined,
      validate: (value) =>
        /^\d+$/.test((value ?? "").trim()) ? undefined : "模块 ID 必须为非空数字",
    });
    if (isCancel(input)) return;
    caseModuleId = input.trim();
  }
  const formatLabel = formats.map((format) => format.toUpperCase()).join(" + ");
  const confirmed = await confirm({
    message: `确认构建 ${formatLabel} 并写入 cases/exports？`,
    initialValue: true,
  });
  if (isCancel(confirmed) || !confirmed) {
    cancel("已取消");
    return;
  }
  recordFeature(ref);
  try {
    const report = await runCasesBuild(ref.featureDir, { formats, caseModuleId });
    note(formatBuildReport(report), "Build");
  } catch (error) {
    log.error(`构建失败: ${errorMessage(error)}`);
  }
}

async function viewYaml(ref: FeatureRef): Promise<void> {
  try {
    const { yamlPath } = findCasesYaml(ref.featureDir);
    const content = readFileSync(yamlPath, "utf8");
    note(
      content.length > 4000 ? `${content.slice(0, 4000)}\n...(截断)` : content,
      `${ref.title} · YAML`,
    );
  } catch (error) {
    log.error(`读取 YAML 失败: ${errorMessage(error)}`);
  }
}

async function pickProject(): Promise<string | undefined> {
  const projects = listWorkspaceProjects();
  if (projects.length === 0) {
    log.warn("workspace 下没有项目");
    return undefined;
  }
  const choice = await select({
    message: "选择项目",
    options: projects.map((project) => ({ value: project, label: project })),
  });
  return isCancel(choice) ? undefined : choice;
}

async function pickVersion(project: string): Promise<string | undefined> {
  const versions = [
    ...new Set(
      runFeaturesList({ project })
        .map((row) => row.version)
        .filter(Boolean),
    ),
  ].sort((left, right) => right.localeCompare(left, undefined, { numeric: true }));
  if (versions.length === 0) {
    log.warn(`${project} 下没有 Feature`);
    return undefined;
  }
  if (versions.length === 1) return versions[0];
  const choice = await select({
    message: `${project} 的迭代版本`,
    options: versions.map((version) => ({ value: version, label: version })),
  });
  return isCancel(choice) ? undefined : choice;
}

async function pickFeature(project: string, version: string): Promise<FeatureRef | undefined> {
  const rows = runFeaturesList({ project, version });
  if (rows.length === 0) {
    log.warn(`${project} ${version} 下没有 Feature`);
    return undefined;
  }
  const choice = await select({
    message: `${project} · ${version} 的 Feature`,
    options: rows.map((row) => ({
      value: row.relative_path,
      label: row.title,
      hint: `${row.version} · ${row.relative_path}`,
    })),
  });
  if (isCancel(choice)) return undefined;
  const ref = featureRefByProjectPath(project, choice);
  if (!ref) log.error(`未找到 Feature: ${choice}`);
  return ref;
}

function formatViolations(violations: readonly { rule?: string; message: string }[]): string {
  if (violations.length === 0) return "无违规";
  return violations
    .slice(0, 20)
    .map((violation) => `- [${violation.rule ?? "-"}] ${violation.message}`)
    .join("\n");
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
