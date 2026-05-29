import { createHash } from "node:crypto";
import { existsSync, readdirSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { createCli } from "@shared/lib/cli-runner.ts";
import { contractPluginsDir, pluginsDir } from "@shared/lib/paths.ts";
import { loadAllPlugins } from "@shared/lib/plugin-utils.ts";
import { resolveProject } from "./test-case-flow/project-resolver.ts";
import { createSessionId, saveSessionState } from "./test-case-flow/session.ts";
import { createSourceConsent } from "./test-case-flow/source-consent.ts";
import { resolveTestCaseSource, type TestCaseSource } from "./test-case-flow/source-resolver.ts";

type CaseDraftStartOptions = {
  source?: string;
  project?: string;
  dryRun?: boolean;
  json?: boolean;
};

function workspaceRoot(): string {
  return resolve(process.cwd(), "workspace");
}

function listWorkspaceProjects(): string[] {
  const ws = workspaceRoot();
  if (!existsSync(ws)) return [];
  return readdirSync(ws).filter((entry) => {
    const full = resolve(ws, entry);
    return statSync(full).isDirectory() && !entry.startsWith(".");
  });
}

function hashSource(source: string): string {
  return createHash("sha256").update(source).digest("hex");
}

function shellEscape(value: string): string {
  return `'${value.replace(/'/g, "'\\''")}'`;
}

function matchesUrlPattern(url: string, patterns: string[]): boolean {
  return patterns.some((pattern) => url.includes(pattern));
}

function renderPluginCommand(template: string, input: { url: string; project: string }): string {
  return template
    .replace(/\{\{url\}\}/g, shellEscape(input.url))
    .replace(/\{\{project\}\}/g, shellEscape(input.project));
}

function resolveDesignPlugin(
  source: TestCaseSource,
  project: string,
): {
  active?: boolean;
  fetchCommand?: string;
  matched: boolean;
  name?: string;
} {
  if (source.kind !== "lanhu_url") return { matched: false };
  const plugins = loadAllPlugins(contractPluginsDir(), { legacyRoot: pluginsDir() });
  const plugin = plugins.find((candidate) =>
    matchesUrlPattern(source.value, candidate.data.url_patterns ?? []),
  );
  if (!plugin) return { matched: false };
  const fetchTemplate = plugin.data.commands?.fetch;
  return {
    active: plugin.active,
    fetchCommand: fetchTemplate
      ? renderPluginCommand(fetchTemplate, { url: source.value, project })
      : undefined,
    matched: true,
    name: plugin.name,
  };
}

function buildStartEnvelope(options: CaseDraftStartOptions): Record<string, unknown> {
  const sourceRaw = options.source ?? "";
  const projectRaw = options.project ?? "auto";
  const source = resolveTestCaseSource(sourceRaw);
  const projectResult = resolveProject({
    explicitProject: projectRaw,
    workspaceProjects: listWorkspaceProjects(),
  });
  const projectName = "project" in projectResult ? projectResult.project : null;

  if (!projectName) {
    return {
      status: projectResult.status || "needs_project_selection",
      source,
      candidates: "candidates" in projectResult ? projectResult.candidates : [],
      reason: projectResult.reason || "Project selection required",
    };
  }

  const sourceHash = hashSource(sourceRaw);
  const sessionId = createSessionId({ project: projectName, sourceHash });
  const consent = createSourceConsent(
    source.kind === "prd_file" ? { reference_level: "full" } : { reference_level: "none" },
  );
  const plugin = resolveDesignPlugin(source, projectName);

  if (options.dryRun !== true) {
    saveSessionState({
      sessionId,
      project: projectName,
      currentStep: "init",
      sourceHash,
      sourceKind: source.kind,
      sourceValue: source.value,
      lastUpdated: new Date().toISOString(),
    });
  }

  return {
    status: options.dryRun === true ? "ready_to_probe" : "started",
    sessionId,
    project: projectName,
    source,
    consent,
    currentStep: "init",
    nextStep: "probe",
    plugin,
  };
}

function printEnvelope(envelope: Record<string, unknown>, json: boolean): void {
  if (json) {
    process.stdout.write(`${JSON.stringify(envelope, null, 2)}\n`);
    return;
  }
  process.stdout.write(`${JSON.stringify(envelope)}\n`);
}

export const program = createCli({
  name: "case-draft",
  description: "case-draft 工作流入口",
  commands: [
    {
      name: "start",
      description: "Start a case-draft workflow session from a PRD, fixture, or design URL",
      options: [
        {
          flag: "--source <source>",
          description: "Source URL, PRD path, or fixture",
          required: true,
        },
        { flag: "--project <project>", description: "Project name or auto", defaultValue: "auto" },
        { flag: "--dry-run", description: "Preview without writing a session" },
        { flag: "--json", description: "Output a structured JSON envelope" },
      ],
      action: (options: CaseDraftStartOptions) => {
        printEnvelope(buildStartEnvelope(options), options.json === true);
      },
    },
  ],
});

export { buildStartEnvelope };
