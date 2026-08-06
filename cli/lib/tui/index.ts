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
import { parseCasesYaml } from "../cases/parse.ts";
import { listWorkspaceProjects } from "../workspace-locator.ts";
import { browseProjectFeature } from "./browse.ts";
import { caseDetail, caseListLabel } from "./case-view.ts";
import { recentHistory, recordFeature } from "./history.ts";
import {
  lintDetail,
  lintLabel,
  lintPageCount,
  lintPageSlice,
  lintSummary,
  PAGE_SIZE,
  type TuiLintViolation,
} from "./lint-result.ts";
import { existingCaseModuleId, featureRefByProjectPath, formatBuildReport } from "./registry.ts";
import type { FeatureRef } from "./types.ts";

const TUI_BANNER = String.raw` _  __      _        _
| |/ /_ __ | |_ __ *| |*
| ' /| '_ \| __/ _| | __|
| . \| | | | || (*| | |*
|*|\_\_| |*|\__\__,_|\__|`;

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
  await browseProjectFeature(featureBrowseMenus());
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
      await browseProjectFeature(featureBrowseMenus());
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
      await showLintViolations("All projects lint", result.violations);
      return;
    }
    const project = await pickProject();
    if (!project) return;
    const result = runCasesLint({ project });
    await showLintViolations(`${project} lint`, result.violations);
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
  for (;;) {
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
    if (!entry) continue;
    try {
      const ref = featureRefByProjectPath(entry.project, entry.relative_path);
      if (!ref) {
        log.error(`Feature is no longer available: ${entry.project}:${entry.relative_path}`);
        continue;
      }
      await featureMenu(ref);
    } catch (error) {
      log.error(`Feature is no longer available: ${errorMessage(error)}`);
    }
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
        { value: "view", label: "View", hint: "View cases" },
        { value: "back", label: "Back", hint: "Go back" },
      ],
    });
    if (isCancel(choice) || choice === "back") return;
    if (choice === "lint") {
      await lintFeature(ref);
    } else if (choice === "build") {
      await buildFeature(ref);
    } else {
      await viewCases(ref);
    }
  }
}

async function lintFeature(ref: FeatureRef): Promise<void> {
  try {
    const result = runCasesLint({ project: ref.project, feature: ref.relativePath });
    await showLintViolations(`Lint · ${ref.title}`, result.violations);
  } catch (error) {
    log.error(`Lint failed: ${errorMessage(error)}`);
  }
}

async function buildFeature(ref: FeatureRef): Promise<void> {
  const formatChoice = await multiselect({
    message: "Select export formats (multi-select)",
    options: [
      { value: "xmind", label: "XMind" },
      { value: "csv", label: "CSV" },
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

async function viewCases(ref: FeatureRef): Promise<void> {
  try {
    const { yamlPath } = findCasesYaml(ref.featureDir);
    const file = parseCasesYaml(readFileSync(yamlPath, "utf8"));
    const caseView: PagedItemView<(typeof file.cases)[number]> = {
      label: caseListLabel,
      hint: (item) => `Priority ${item.priority}`,
      detail: caseDetail,
      detailTitle: caseListLabel,
    };
    if (file.meta.layout === "requirements" && file.requirements?.length) {
      for (;;) {
        const requirement = await selectPagedItem(
          `Requirements · ${ref.title}`,
          file.requirements,
          {
            label: (item) => `【${item.requirement_id}】${item.title}`,
            hint: (item) =>
              `${file.cases.filter((c) => c.requirement_id === item.requirement_id).length} case(s)`,
          },
          "requirement(s)",
          "No requirements",
        );
        if (!requirement) return;
        await showPagedItems(
          `View · ${requirement.title}`,
          file.cases.filter((item) => item.requirement_id === requirement.requirement_id),
          caseView,
          "case(s)",
          "No cases",
        );
      }
    }
    await showPagedItems(`View · ${ref.title}`, file.cases, caseView, "case(s)", "No cases");
  } catch (error) {
    log.error(`Failed to view cases: ${errorMessage(error)}`);
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

function featureBrowseMenus() {
  return {
    pickProject,
    pickVersion,
    pickFeature,
    openFeature: featureMenu,
  };
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
    message: `Features · ${project}`,
    options: rows.map((row) => ({
      value: row.relative_path,
      label: row.title,
      hint: row.dir_name,
    })),
  });
  if (isCancel(choice)) return undefined;
  const ref = featureRefByProjectPath(project, choice);
  if (!ref) log.error(`Feature not found: ${choice}`);
  return ref;
}

async function showLintViolations(
  title: string,
  violations: readonly TuiLintViolation[],
): Promise<void> {
  await showPagedItems(
    title,
    violations,
    {
      label: lintLabel,
      hint: lintSummary,
      detail: lintDetail,
      detailTitle: (violation) => `${lintLabel(violation)} · detail`,
    },
    "violation(s)",
    "No violations",
  );
}

interface PagedItemView<T> {
  label: (item: T) => string;
  hint: (item: T) => string;
  detail?: (item: T) => string;
  detailTitle?: (item: T) => string;
}

async function showPagedItems<T>(
  title: string,
  items: readonly T[],
  view: PagedItemView<T>,
  countLabel: string,
  emptyMessage: string,
): Promise<void> {
  for (;;) {
    const selected = await selectPagedItem(title, items, view, countLabel, emptyMessage);
    if (!selected || !view.detail) return;
    note(
      view.detail(selected),
      view.detailTitle ? view.detailTitle(selected) : view.label(selected),
    );
  }
}

async function selectPagedItem<T>(
  title: string,
  items: readonly T[],
  view: PagedItemView<T>,
  countLabel: string,
  emptyMessage: string,
): Promise<T | undefined> {
  if (items.length === 0) {
    note(emptyMessage, title);
    return undefined;
  }
  const totalPages = lintPageCount(items.length);
  let page = 0;
  let showAll = false;
  for (;;) {
    const visible = showAll ? items : lintPageSlice(items, page);
    const options = visible.map((item, index) => ({
      value: `item:${showAll ? index : page * PAGE_SIZE + index}`,
      label: view.label(item),
      hint: view.hint(item),
    }));
    if (!showAll) {
      if (page > 0) {
        options.push({
          value: "previous",
          label: "Previous page",
          hint: `Page ${page}/${totalPages}`,
        });
      }
      if (page < totalPages - 1) {
        options.push({
          value: "next",
          label: "Next page",
          hint: `${items.length - (page + 1) * PAGE_SIZE} more`,
        });
        options.push({
          value: "show-all",
          label: "Show All",
          hint: `${items.length} ${countLabel}`,
        });
      }
    } else {
      options.push({
        value: "back-to-pages",
        label: "Back to pages",
        hint: "Return to paged view",
      });
    }
    options.push({ value: "back", label: "Back", hint: "Return to previous menu" });
    const choice = await select({
      message: `${title} · ${items.length} ${countLabel} · ${
        showAll ? "all" : `page ${page + 1}/${totalPages}`
      }`,
      options,
    });
    if (isCancel(choice) || choice === "back") return undefined;
    if (choice === "previous") {
      page -= 1;
      continue;
    }
    if (choice === "next") {
      page += 1;
      continue;
    }
    if (choice === "show-all") {
      showAll = true;
      page = 0;
      continue;
    }
    if (choice === "back-to-pages") {
      showAll = false;
      continue;
    }
    const index = Number(String(choice).slice("item:".length));
    return items[index];
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
