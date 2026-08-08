import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { cancel, confirm, isCancel, log, note, password, select } from "@clack/prompts";
import { runFeaturesShow } from "../../commands/features.ts";
import { writeFileAtomic } from "../atomic-writer.ts";
import { inspectAutomationCoverage } from "../automation/automation-contract.ts";
import { runAutomationLint } from "../automation/automation-lint.ts";
import { findCasesYaml } from "../cases/find.ts";
import { parseCasesYaml } from "../cases/parse.ts";
import { setAutomationEnv } from "../cases/serialize.ts";
import { runsDir } from "../features-layout.ts";
import { listPlatformEnvs, resolvePlatformEnv, setPlatformEnvCookie } from "../platform-env.ts";
import { openAllureReport, readAllureServers, stopAllureServices } from "./allure.ts";
import { type AutomationPreview, buildAutomationPreview } from "./automation-preview.ts";
import { type AutomationRunHandle, startAutomationRun } from "./automation-run.ts";
import { recordFeature } from "./history.ts";
import { selectPagedItem } from "./paged.ts";
import { showProgressScreen } from "./progress-screen.ts";
import { existingAutomationEnv } from "./registry.ts";
import { renderTerminalTable } from "./terminal-table.ts";
import type { FeatureRef } from "./types.ts";

export async function automationMenu(ref: FeatureRef): Promise<void> {
  recordFeature(ref);
  for (;;) {
    const choice = await select({
      message: `${ref.title} (${ref.project} · ${ref.version})`,
      options: [
        { value: "run", label: "Run", hint: "Run Playwright and show progress" },
        { value: "lint", label: "Lint", hint: "Lint automation code" },
        { value: "coverage", label: "Coverage", hint: "Check case mappings" },
        { value: "results", label: "Results", hint: "Open Allure reports" },
        { value: "back", label: "Back", hint: "Return to the previous menu" },
      ],
    });
    if (isCancel(choice) || choice === "back") return;
    if (choice === "run") {
      await runAutomationFlow(ref);
    } else if (choice === "lint") {
      await lintAutomation(ref);
    } else if (choice === "coverage") {
      await coverageAutomation(ref);
    } else {
      await resultsMenu(ref);
    }
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function selectEnvironment(ref: FeatureRef): Promise<string | undefined> {
  const envs = listPlatformEnvs();
  if (envs.length === 0) {
    log.warn("No environments under config/private/environments");
    return undefined;
  }
  const saved = existingAutomationEnv(ref);
  const savedAvailable = Boolean(saved && envs.some((item) => item.name === saved));
  if (savedAvailable) {
    const choice = await select({
      message: "Environment",
      options: [
        { value: `saved:${saved}`, label: "Use saved environment", hint: saved },
        { value: "choose", label: "Choose another environment" },
        { value: "back", label: "Back" },
      ],
    });
    if (isCancel(choice) || choice === "back") return undefined;
    if (choice === "choose") return pickEnvironment(envs);
    return saved;
  }
  return pickEnvironment(envs);
}

function pickEnvironment(
  envs: Array<{ name: string; cookieConfigured: boolean; valid: boolean }>,
): Promise<string | undefined> {
  return select({
    message: "Select environment",
    options: envs.map((item) => ({
      value: item.name,
      label: item.name,
      hint: `${item.cookieConfigured ? "cookie configured" : "cookie missing"}${
        item.valid ? "" : " · invalid"
      }`,
    })),
  }).then((choice) => (isCancel(choice) ? undefined : String(choice)));
}

async function verifyCookie(env: string): Promise<boolean> {
  try {
    await resolvePlatformEnv(env);
    return true;
  } catch (error) {
    log.warn(`Cookie validation failed: ${errorMessage(error)}`);
    for (;;) {
      const cookie = await password({
        message: "Paste a valid Cookie header",
        mask: "*",
      });
      if (isCancel(cookie)) return false;
      try {
        await setPlatformEnvCookie(env, cookie);
        return true;
      } catch (verifyError) {
        log.error(`Cookie rejected: ${errorMessage(verifyError)}`);
      }
    }
  }
}

function persistAutomationEnv(ref: FeatureRef, env: string): void {
  try {
    const { yamlPath } = findCasesYaml(ref.featureDir);
    writeFileAtomic(yamlPath, setAutomationEnv(readFileSync(yamlPath, "utf8"), env));
  } catch (error) {
    log.warn(`Could not persist environment: ${errorMessage(error)}`);
  }
}

async function showRunPreview(ref: FeatureRef, env: string): Promise<boolean> {
  let preview: AutomationPreview;
  try {
    preview = buildAutomationPreview(ref, env);
  } catch (error) {
    log.error(`Preview failed: ${errorMessage(error)}`);
    return false;
  }
  note(
    renderTerminalTable({
      columns: [
        { header: "Item", minWidth: 12, maxWidth: 24 },
        { header: "Value", minWidth: 20, maxWidth: 52 },
      ],
      rows: preview.summary,
    }),
    "Run preview",
  );
  for (;;) {
    const choice = await select({
      message: "Run preview",
      options: [
        { value: "environment", label: "Environment", hint: env },
        { value: "config", label: "Automation config", hint: "playwright.yaml" },
        { value: "feature", label: "Feature", hint: ref.title },
        { value: "start", label: "Start run" },
        { value: "back", label: "Back" },
      ],
    });
    if (isCancel(choice) || choice === "back") return false;
    if (choice === "environment") {
      note(preview.environmentDetail, "Environment detail");
    } else if (choice === "config") {
      note(preview.configDetail, "Automation config detail");
    } else if (choice === "feature") {
      note(preview.featureDetail, "Feature detail");
    } else {
      return true;
    }
  }
}

async function runAutomationFlow(ref: FeatureRef): Promise<void> {
  const env = await selectEnvironment(ref);
  if (!env) return;
  if (!(await verifyCookie(env))) return;
  persistAutomationEnv(ref, env);
  if (!(await showRunPreview(ref, env))) return;
  const start = await confirm({
    message: "Start automation run?",
    initialValue: true,
  });
  if (isCancel(start) || !start) {
    cancel("Cancelled");
    return;
  }

  let handle: AutomationRunHandle;
  try {
    handle = await startAutomationRun(ref, env);
  } catch (error) {
    log.error(`Run failed to start: ${errorMessage(error)}`);
    return;
  }
  const cases = readCases(ref);
  await showProgressScreen({
    runId: handle.runId,
    runPath: handle.runPath,
    cases,
    exit: handle.exit,
  });
  const exitCode = await handle.exit;
  if (exitCode !== 0) log.warn(`Automation run finished with exit code ${exitCode}`);
  try {
    const report = await openAllureReport(handle.runPath);
    note(`Allure report: ${report.url}`, "Report");
  } catch (error) {
    log.error(`Could not open Allure report: ${errorMessage(error)}`);
  }
}

function readCases(ref: FeatureRef) {
  const { yamlPath } = findCasesYaml(ref.featureDir);
  return parseCasesYaml(readFileSync(yamlPath, "utf8")).cases;
}

async function lintAutomation(ref: FeatureRef): Promise<void> {
  try {
    const report = runAutomationLint({ featureDir: ref.featureDir });
    if (report.violations.length === 0) {
      note("No violations", "Automation lint");
      return;
    }
    await selectPagedItem(
      `Automation lint · ${ref.title}`,
      report.violations,
      {
        label: (violation) => `${violation.path}:${violation.line} [${violation.rule}]`,
        hint: (violation) => violation.message.split("\n")[0],
        detail: (violation) => `${violation.path}:${violation.line}\n\n${violation.message}`,
        detailTitle: (violation) => `Lint · ${violation.rule}`,
      },
      "violation(s)",
      "No violations",
    );
  } catch (error) {
    log.error(`Automation lint failed: ${errorMessage(error)}`);
  }
}

async function coverageAutomation(ref: FeatureRef): Promise<void> {
  try {
    const coverage = inspectAutomationCoverage(ref.featureDir);
    const summary = [
      ["Implemented", String(coverage.implemented.length)],
      ["API", String(coverage.api.length)],
      ["Unmapped", String(coverage.unmapped.length)],
      ["Not implemented", String(coverage.mappedNotImplemented.length)],
      ["Missing script", String(coverage.missingScript.length)],
      ["Orphan script", String(coverage.orphanScripts.length)],
    ];
    note(
      renderTerminalTable({
        columns: [
          { header: "Item", minWidth: 12, maxWidth: 24 },
          { header: "Count", minWidth: 8, maxWidth: 12 },
        ],
        rows: summary,
      }),
      "Automation coverage",
    );
    await selectPagedItem(
      `Coverage · ${ref.title}`,
      coverage.cases,
      {
        label: (item) => `【${item.id}】${item.title}`,
        hint: (item) => item.status,
        detail: (item) =>
          [
            `Case: ${item.id}`,
            `Executor: ${item.executor}`,
            item.specFile ? `Spec: ${item.specFile}` : "",
            item.implementationIssue ? `Issue: ${item.implementationIssue}` : "",
            item.titleMismatch ? `Title mismatch: ${item.titleMismatch}` : "",
          ]
            .filter(Boolean)
            .join("\n"),
        detailTitle: (item) => `Coverage · ${item.id}`,
      },
      "case(s)",
      "No cases",
    );
  } catch (error) {
    log.error(`Coverage failed: ${errorMessage(error)}`);
  }
}

function runStatus(runPath: string): string {
  const path = join(runPath, "status.json");
  if (!existsSync(path)) return "missing";
  try {
    const status = JSON.parse(readFileSync(path, "utf8")) as { status?: string };
    return status.status ?? "unknown";
  } catch {
    return "invalid";
  }
}

function runResultSummary(runPath: string): {
  passed: number;
  failed: number;
  broken: number;
  skipped: number;
} {
  const resultsDir = join(runPath, "allure-results");
  const counts = { passed: 0, failed: 0, broken: 0, skipped: 0 };
  if (!existsSync(resultsDir)) return counts;
  for (const name of readdirSync(resultsDir)) {
    if (!name.endsWith("-result.json")) continue;
    try {
      const result = JSON.parse(readFileSync(join(resultsDir, name), "utf8")) as {
        status?: string;
      };
      const status = result.status;
      if (status && status in counts) counts[status as keyof typeof counts] += 1;
    } catch {
      // Ignore malformed auxiliary files; run verify remains authoritative.
    }
  }
  return counts;
}

async function resultsMenu(ref: FeatureRef): Promise<void> {
  const action = await select({
    message: "Results",
    options: [
      { value: "open", label: "Open report", hint: "Select a recent run" },
      { value: "stop", label: "Stop services", hint: "Stop running Allure servers" },
      { value: "back", label: "Back" },
    ],
  });
  if (isCancel(action) || action === "back") return;
  if (action === "stop") {
    const servers = readAllureServers();
    if (servers.length === 0) {
      note("No running Allure services", "Services");
      return;
    }
    note(servers.map((item) => `${item.runPath}\n  ${item.url}`).join("\n"), "Running services");
    const stop = await confirm({ message: "Stop all Allure services?", initialValue: false });
    if (isCancel(stop) || !stop) return;
    const result = stopAllureServices();
    note(`${result.stopped} service(s) stopped`, "Services");
    return;
  }

  const feature = runFeaturesShow({ project: ref.project, featurePath: ref.relativePath });
  const runs = feature.recent_runs ?? [];
  if (runs.length === 0) {
    note("No runs under this feature", "Results");
    return;
  }
  const selectedRun = await selectPagedItem(
    `Results · ${ref.title}`,
    runs,
    {
      label: (runId) => runId,
      hint: (runId) => {
        const status = runStatus(join(runsDir(ref.featureDir), runId));
        const counts = runResultSummary(join(runsDir(ref.featureDir), runId));
        return `${status} · passed ${counts.passed} · failed ${counts.failed} · skipped ${counts.skipped}`;
      },
    },
    "run(s)",
    "No runs",
  );
  if (!selectedRun) return;
  try {
    const report = await openAllureReport(join(runsDir(ref.featureDir), selectedRun));
    note(`Allure report: ${report.url}`, "Report");
  } catch (error) {
    log.error(`Could not open Allure report: ${errorMessage(error)}`);
  }
}
