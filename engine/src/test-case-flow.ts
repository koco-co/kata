import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { outputJson } from "@shared/lib/cli.ts";
import type { Command } from "commander";
import { resolveProject } from "./test-case-flow/project-resolver";
import {
  checkResumeSession,
  createSessionId,
  evaluateKnowledgeDropped,
  evaluateNextStep,
  loadSessionState,
  saveSessionState,
} from "./test-case-flow/session";
import { createSourceConsent } from "./test-case-flow/source-consent";
import { resolveTestCaseSource, type TestCaseSource } from "./test-case-flow/source-resolver";

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

export function registerTestCaseFlow(program: Command): void {
  const cmd = program.command("test-case-flow").description("Test case flow orchestration harness");

  cmd
    .command("start")
    .description("Start a new test case flow session")
    .option("--source <source>", "Source URL or path")
    .option("--project <project>", "Project name or auto", "auto")
    .option("--dry-run", "Preview without writing")
    .option("--json", "Output as JSON")
    .option("--resume <session-id>", "Resume existing session")
    .action(async (options) => {
      const sourceRaw: string = options.source || "";
      const projectRaw: string = options.project || "auto";
      const dryRun: boolean = options.dryRun || false;
      const jsonOutput: boolean = options.json || false;

      // 1. Resolve source
      let source: TestCaseSource;
      try {
        source = resolveTestCaseSource(sourceRaw);
      } catch (err) {
        outputJson({
          status: "invalid_input",
          error: String(err),
          source: { value: sourceRaw },
        });
        return;
      }

      // 2. List workspace projects
      const workspaceProjects = listWorkspaceProjects();

      // 3. Resolve project
      const projectResult = resolveProject({
        explicitProject: projectRaw,
        workspaceProjects,
      });

      const projectName = "project" in projectResult ? projectResult.project : null;

      if (!projectName) {
        outputJson({
          status: projectResult.status || "needs_project_selection",
          source,
          candidates: "candidates" in projectResult ? projectResult.candidates : workspaceProjects,
          reason: projectResult.reason || "Project selection required",
        });
        return;
      }

      // 4. Create source consent
      const consent = createSourceConsent(
        source.kind === "prd_file" ? { reference_level: "full" } : { reference_level: "none" },
      );

      // 5. Create session
      const sourceHash = hashSource(sourceRaw);
      const sessionId = createSessionId({ project: projectName, sourceHash });

      // Check if resuming
      if (options.resume) {
        const resume = checkResumeSession({ sessionId: options.resume });
        if (resume.exists) {
          outputJson({
            status: "resumed",
            sessionId: options.resume,
            lastStep: resume.lastStep,
          });
          return;
        }
      }

      const session = {
        sessionId,
        project: projectName,
        currentStep: "init",
        sourceHash,
        sourceKind: source.kind,
        sourceValue: source.value,
        lastUpdated: new Date().toISOString(),
      };

      // 6. In dry-run mode, preview without writing
      if (dryRun) {
        const envelope = {
          status: "ready_to_probe",
          source,
          project: projectName,
          sessionId,
          consent,
        };
        if (jsonOutput) {
          outputJson(envelope);
        } else {
          console.log(`Source: ${source.kind} (${source.value})`);
          console.log(`Project: ${projectName}`);
          console.log(`Session: ${sessionId}`);
          console.log(`Next step: init`);
        }
        return;
      }

      // 7. Save session state
      saveSessionState(session);

      const envelope = {
        status: "started",
        sessionId,
        project: projectName,
        source,
        currentStep: "init",
        consent,
      };

      if (jsonOutput) {
        outputJson(envelope);
      } else {
        console.log(`Session started: ${sessionId}`);
        console.log(`Source: ${source.kind} (${source.value})`);
        console.log(`Project: ${projectName}`);
        console.log(`Next step: init`);
      }
    });

  cmd
    .command("status")
    .description("Check session status")
    .option("--session <session-id>", "Session ID")
    .option("--json", "Output as JSON")
    .action(async (options) => {
      const sessionId: string = options.session || "";
      if (!sessionId) {
        outputJson({ error: "session ID required" });
        return;
      }

      const session = loadSessionState(sessionId);
      if (!session) {
        outputJson({ error: "Session not found", sessionId });
        return;
      }

      if (options.json) {
        outputJson(session);
      } else {
        console.log(`Session: ${session.sessionId}`);
        console.log(`Project: ${session.project}`);
        console.log(`Current step: ${session.currentStep}`);
      }
    });

  cmd
    .command("continue")
    .description("Continue an existing session with gate checks")
    .option("--session <session-id>", "Session ID")
    .option("--json", "Output as JSON")
    .action(async (options) => {
      const sessionId: string = options.session || "";
      if (!sessionId) {
        outputJson({ error: "session ID required" });
        return;
      }

      const session = loadSessionState(sessionId);
      if (!session) {
        outputJson({ error: "Session not found", sessionId });
        return;
      }

      // Locate enhanced.md — prefer stored path, else derive from session
      const enhancedPath: string | undefined = (session as Record<string, unknown>).enhancedPath as
        | string
        | undefined;

      let enhancedContent = "";
      if (enhancedPath && existsSync(enhancedPath)) {
        enhancedContent = readFileSync(enhancedPath, "utf8");
      }

      const nextStep = evaluateNextStep({ enhancedContent });
      const knowledge = evaluateKnowledgeDropped({ enhancedContent });

      const envelope = {
        sessionId,
        currentStep: session.currentStep,
        next_step: nextStep.next_step,
        blocked: nextStep.blocked,
        reason: nextStep.reason,
        knowledge_dropped: knowledge.knowledge_dropped,
        knowledge_summary: knowledge.knowledge_summary,
      };

      if (options.json) {
        outputJson(envelope);
      } else {
        console.log(`Session: ${sessionId}`);
        console.log(`Next step: ${nextStep.next_step}${nextStep.blocked ? " (BLOCKED)" : ""}`);
        console.log(`Reason: ${nextStep.reason}`);
        console.log(`Knowledge dropped: ${knowledge.knowledge_summary}`);
      }
    });
}
