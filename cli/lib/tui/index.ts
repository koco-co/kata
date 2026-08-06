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

const TUI_BANNER = [
  " _  __      _        _",
  "| |/ /_ __ | |_ __ _| |_",
  "| ' /| '_ \\| __/ _| | __|",
  "| . \\| | | | || (_| | |_",
  "|_|\\_\\_| |_|\\__\\__,_|\\__|",
].join("\n");

export interface TuiInitialFeature {
  project: string;
  relativePath: string;
}

export async function startTui(initial?: TuiInitialFeature): Promise<void> {
  process.stdout.write(`${TUI_BANNER}\n\n`);
  intro("Kata");
  if (initial) {
    const ref = featureRefByProjectPath(initial.project, initial.relativePath);
    if (!ref) {
      log.error(`Feature not found: ${initial.project}:${initial.relativePath}`);
      outro("Goodbye");
      return;
    }
    await featureMenu(ref);
    outro("Goodbye");
    return;
  }
  await rootMenu();
  outro("Goodbye");
}

async function rootMenu(): Promise<void> {
  for (;;) {
    const choice = await select({
      message: "Select an action",
      options: [
        { value: "features", label: "Features", hint: "Browse features by project" },
        { value: "cases", label: "Cases", hint: "Case-level actions" },
        { value: "history", label: "History", hint: "Recent 5 features" },
        { value: "__exit__", label: "Exit", hint: "Leave kata TUI" },
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
        { value: "list", label: "List", hint: "Browse projects and features" },
        { value: "build", label: "Build", hint: "Build a selected feature" },
        { value: "lint", label: "Lint", hint: "Lint all or one project" },
        { value: "back", label: "Back", hint: "Return to the main menu" },
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
    message: "Lint scope",
    options: [
      { value: "all", label: "All projects" },
      { value: "project", label: "One project" },
      { value: "back", label: "Back" },
    ],
  });
  if (isCancel(scope) || scope === "back") return;
  try {
    if (scope === "all") {
      const result = runAllCasesLint();
      note(
        formatViolations(result.violations),
        `All projects lint · ${result.violations.length} violation(s)`,
      );
      return;
    }
    const project = await pickProject();
    if (!project) return;
    const result = runCasesLint({ project });
    note(
      formatViolations(result.violations),
      `${project} lint · ${result.violations.length} violation(s)`,
    );
  } catch (error) {
    log.error(`Lint failed: ${errorMessage(error)}`);
  }
}

async function historyMenu(): Promise<void> {
  const entries = recentHistory();
  if (entries.length === 0) {
    note("Opening or acting on a feature records the latest 5", "History");
    return;
  }
  const choice = await select({
    message: "Recent features",
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
      log.error(`Feature is no longer available: ${entry.project}:${entry.relative_path}`);
      return;
    }
    await featureMenu(ref);
  } catch (error) {
    log.error(`Feature is no longer available: ${errorMessage(error)}`);
  }
}

async function featureMenu(ref: FeatureRef): Promise<void> {
  recordFeature(ref);
  for (;;) {
    const choice = await select({
      message: `${ref.title} (${ref.project} · ${ref.version})`,
      options: [
        { value: "lint", label: "Lint", hint: "Run cases lint" },
        { value: "build", label: "Build", hint: "Build XMind/CSV" },
        { value: "yaml", label: "View YAML", hint: "View cases YAML" },
        { value: "back", label: "Back", hint: "Go back" },
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
    log.error(`Lint failed: ${errorMessage(error)}`);
  }
}

async function buildFeature(ref: FeatureRef): Promise<void> {
  const formatChoice = await multiselect({
    message: "Select export formats (multi-select)",
    options: [
      { value: "xmind", label: "XMind", hint: "cases/exports/*.xmind" },
      { value: "csv", label: "CSV", hint: "ZenTao import format" },
    ],
    required: false,
  });
  if (isCancel(formatChoice)) return;
  if (!formatChoice || formatChoice.length === 0) {
    log.warn("No export format selected");
    return;
  }
  const formats = [...formatChoice] as CaseExportFormat[];
  let caseModuleId: string | undefined;
  if (formats.includes("csv")) {
    const existing = existingCaseModuleId(ref);
    const input = await text({
      message: existing ? `ZenTao module ID (current ${existing})` : "ZenTao module ID",
      initialValue: existing || undefined,
      validate: (value) =>
        /^\d+$/.test((value ?? "").trim()) ? undefined : "Module ID must be a non-empty number",
    });
    if (isCancel(input)) return;
    caseModuleId = input.trim();
  }
  const formatLabel = formats.map((format) => format.toUpperCase()).join(" + ");
  const confirmed = await confirm({
    message: `Build ${formatLabel} and write to cases/exports?`,
    initialValue: true,
  });
  if (isCancel(confirmed) || !confirmed) {
    cancel("Cancelled");
    return;
  }
  recordFeature(ref);
  try {
    const report = await runCasesBuild(ref.featureDir, { formats, caseModuleId });
    note(formatBuildReport(report), "Build");
  } catch (error) {
    log.error(`Build failed: ${errorMessage(error)}`);
  }
}

async function viewYaml(ref: FeatureRef): Promise<void> {
  try {
    const { yamlPath } = findCasesYaml(ref.featureDir);
    const content = readFileSync(yamlPath, "utf8");
    note(
      content.length > 4000 ? `${content.slice(0, 4000)}\n...(truncated)` : content,
      `${ref.title} · YAML`,
    );
  } catch (error) {
    log.error(`Failed to read YAML: ${errorMessage(error)}`);
  }
}

async function pickProject(): Promise<string | undefined> {
  const projects = listWorkspaceProjects();
  if (projects.length === 0) {
    log.warn("No projects under workspace");
    return undefined;
  }
  const choice = await select({
    message: "Select project",
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
    log.warn(`No features under ${project}`);
    return undefined;
  }
  if (versions.length === 1) return versions[0];
  const choice = await select({
    message: `${project} versions`,
    options: versions.map((version) => ({ value: version, label: version })),
  });
  return isCancel(choice) ? undefined : choice;
}

async function pickFeature(project: string, version: string): Promise<FeatureRef | undefined> {
  const rows = runFeaturesList({ project, version });
  if (rows.length === 0) {
    log.warn(`No features in ${project} ${version}`);
    return undefined;
  }
  const choice = await select({
    message: `Features · ${project} · ${version}`,
    options: rows.map((row) => ({
      value: row.relative_path,
      label: row.title,
      hint: `${row.version} · ${row.relative_path}`,
    })),
  });
  if (isCancel(choice)) return undefined;
  const ref = featureRefByProjectPath(project, choice);
  if (!ref) log.error(`Feature not found: ${choice}`);
  return ref;
}

function formatViolations(violations: readonly { rule?: string; message: string }[]): string {
  if (violations.length === 0) return "No violations";
  return violations
    .slice(0, 20)
    .map((violation) => `- [${violation.rule ?? "-"}] ${violation.message}`)
    .join("\n");
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
