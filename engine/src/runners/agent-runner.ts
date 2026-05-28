import { mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { validateHandoffEnvelope } from "../policy/schema-guard.ts";
import type { KataIssue, KataResult } from "../result-types.ts";
import { isCanonicalSourceRef, validateSourceRefFreshness } from "../source-ref/resolvers.ts";

const RUN_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]*$/;

export type PatchOnlyAgentInput = {
  agentId: string;
  patch: string;
  sourceRefs: string[];
  sourceContents?: Record<string, string>;
  runId?: string;
  stagingRoot?: string;
};

export type HandoffEnvelopeRecord = {
  schema_version: 1;
  from_agent: string;
  to_agent: string;
  status: "done";
  summary: string;
  artifacts: { path: string; kind: "patch" }[];
  issues: { severity: "error" | "warning"; message: string }[];
  provenance: { sourceRefs: string[] };
};

export type PatchOnlyAgentRecord = {
  agentId: string;
  runner: "worktree_patch";
  patch: string;
  sourceRefs: string[];
  handoff: HandoffEnvelopeRecord;
  stagedPatchPath: string;
};

function issue(code: string, message: string, path: string): KataIssue {
  return { code, severity: "error", message, path };
}

function safeAgentId(agentId: string): string {
  return agentId.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function patchArtifactPath(agentId: string, runId: string): string {
  return `.kata/runs/${runId}/artifacts/${safeAgentId(agentId)}.patch`;
}

function defaultStagingRoot(): string {
  return resolve(tmpdir(), "kata-agent-runner-staging");
}

function isContainedPath(root: string, path: string): boolean {
  const rel = relative(root, path);
  return rel === "" || (!rel.startsWith("..") && !rel.includes(`..${sep}`) && !isAbsolute(rel));
}

function resolveStagedPatchPath(stagingRoot: string, relativePath: string): KataResult<string> {
  const root = resolve(stagingRoot);
  const fullPath = resolve(root, relativePath);
  if (!isContainedPath(root, fullPath)) {
    return {
      ok: false,
      issues: [
        issue(
          "runner.staging_path_escape",
          "Patch artifact path must stay inside the staging root.",
          "stagingRoot",
        ),
      ],
    };
  }
  return { ok: true, value: fullPath, issues: [] };
}

function stagePatch(input: PatchOnlyAgentInput, stagedPatchPath: string): string {
  mkdirSync(dirname(stagedPatchPath), { recursive: true });
  writeFileSync(stagedPatchPath, input.patch, "utf8");
  return stagedPatchPath;
}

function hasMissingSourceRefs(sourceRefs: string[]): boolean {
  return (
    !Array.isArray(sourceRefs) ||
    sourceRefs.length === 0 ||
    sourceRefs.some((ref) => typeof ref === "string" && ref.trim() === "")
  );
}

function hasInvalidSourceRefs(sourceRefs: string[]): boolean {
  return sourceRefs.some((ref) => typeof ref !== "string" || !isCanonicalSourceRef(ref));
}

function sourceRefId(sourceRef: string): string {
  return sourceRef.slice(0, sourceRef.indexOf("#sha256:"));
}

function sourceContentFor(
  sourceRef: string,
  sourceContents: Record<string, string> | undefined,
): string | undefined {
  return sourceContents?.[sourceRef] ?? sourceContents?.[sourceRefId(sourceRef)];
}

function validateSourceRefEvidence(input: PatchOnlyAgentInput): KataIssue[] {
  const issues: KataIssue[] = [];

  for (const sourceRef of input.sourceRefs) {
    const currentContent = sourceContentFor(sourceRef, input.sourceContents);
    if (typeof currentContent !== "string") {
      issues.push(
        issue(
          "runner.source_ref_unresolved",
          "Patch-only agent SourceRef requires matching current source content.",
          "sourceContents",
        ),
      );
      continue;
    }

    const freshness = validateSourceRefFreshness(sourceRef, currentContent);
    if (!freshness.ok) {
      issues.push(...freshness.issues);
    }
  }

  return issues;
}

export async function runPatchOnlyAgent(
  input: PatchOnlyAgentInput,
): Promise<KataResult<PatchOnlyAgentRecord>> {
  const issues: KataIssue[] = [];
  const runId = input.runId ?? "local";

  if (!input.patch.startsWith("diff --git")) {
    issues.push(
      issue("runner.patch_not_diff", "Patch-only agent must return a unified git diff.", "patch"),
    );
  }
  if (!RUN_ID_PATTERN.test(runId)) {
    issues.push(
      issue("runner.run_id_invalid", "Patch-only agent runId must be a safe id.", "runId"),
    );
  }
  if (hasMissingSourceRefs(input.sourceRefs)) {
    issues.push(
      issue(
        "runner.source_refs_missing",
        "Patch-only agent output requires non-empty SourceRefs.",
        "sourceRefs",
      ),
    );
  } else if (hasInvalidSourceRefs(input.sourceRefs)) {
    issues.push(
      issue(
        "runner.source_ref_invalid",
        "Patch-only agent output requires canonical SourceRefs.",
        "sourceRefs",
      ),
    );
  } else {
    issues.push(...validateSourceRefEvidence(input));
  }
  if (issues.length > 0) {
    return { ok: false, issues };
  }

  const relativePatchPath = patchArtifactPath(input.agentId, runId);
  const stagedPath = resolveStagedPatchPath(
    input.stagingRoot ?? defaultStagingRoot(),
    relativePatchPath,
  );
  if (!stagedPath.ok || !stagedPath.value) {
    return { ok: false, issues: stagedPath.issues };
  }
  const handoff: HandoffEnvelopeRecord = {
    schema_version: 1,
    from_agent: input.agentId,
    to_agent: "orchestrator",
    status: "done",
    summary: "Patch-only output accepted.",
    artifacts: [{ path: relativePatchPath, kind: "patch" }],
    issues: [],
    provenance: { sourceRefs: input.sourceRefs },
  };
  const handoffValidation = validateHandoffEnvelope(handoff);
  if (!handoffValidation.ok) {
    return {
      ok: false,
      issues: [
        ...handoffValidation.issues,
        issue(
          "runner.handoff_invalid",
          "Patch-only agent handoff does not match schema.",
          "handoff",
        ),
      ],
    };
  }
  const stagedPatchPath = stagePatch(input, stagedPath.value);

  return {
    ok: true,
    value: {
      agentId: input.agentId,
      runner: "worktree_patch",
      patch: input.patch,
      sourceRefs: input.sourceRefs,
      handoff,
      stagedPatchPath,
    },
    issues: [],
  };
}

export const enforcePatchOnly = runPatchOnlyAgent;
