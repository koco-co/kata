import type { KataIssue, KataResult } from "@shared/lib/result-types.ts";
import { isCanonicalSourceRef } from "@shared/lib/source-ref/resolvers.ts";

const HANDOFF_STATUSES = new Set(["done", "done_with_concerns", "blocked", "needs_context"]);
const ISSUE_SEVERITIES = new Set(["error", "warning"]);
const HANDOFF_FIELDS = new Set([
  "schema_version",
  "from_agent",
  "to_agent",
  "status",
  "summary",
  "artifacts",
  "issues",
  "provenance",
]);
const ARTIFACT_FIELDS = new Set(["path", "kind"]);
const ISSUE_FIELDS = new Set(["severity", "message"]);
const PROVENANCE_FIELDS = new Set(["sourceRefs"]);

function issue(code: string, message: string, path: string): KataIssue {
  return {
    code,
    severity: "error",
    message,
    path,
  };
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  return value as Record<string, unknown>;
}

function requiredNonEmptyStringIssue(
  envelope: Record<string, unknown> | undefined,
  field: string,
): KataIssue | undefined {
  const value = envelope?.[field];
  if (typeof value === "string" && value.trim().length > 0) return undefined;
  return issue(
    `${field}_missing`,
    `HandoffEnvelope requires non-empty ${field}.`,
    `handoff.${field}`,
  );
}

function requiredStringIssue(
  envelope: Record<string, unknown> | undefined,
  field: string,
): KataIssue | undefined {
  if (typeof envelope?.[field] === "string") return undefined;
  return issue(`${field}_missing`, `HandoffEnvelope requires ${field}.`, `handoff.${field}`);
}

function hasUnexpectedKeys(record: Record<string, unknown>, allowed: Set<string>): boolean {
  return Object.keys(record).some((key) => !allowed.has(key));
}

function isValidArtifact(value: unknown): boolean {
  const artifact = asRecord(value);
  return Boolean(
    artifact &&
      typeof artifact.path === "string" &&
      artifact.path.trim().length > 0 &&
      typeof artifact.kind === "string" &&
      artifact.kind.trim().length > 0 &&
      !hasUnexpectedKeys(artifact, ARTIFACT_FIELDS),
  );
}

function isValidIssue(value: unknown): boolean {
  const handoffIssue = asRecord(value);
  return Boolean(
    handoffIssue &&
      typeof handoffIssue.severity === "string" &&
      ISSUE_SEVERITIES.has(handoffIssue.severity) &&
      typeof handoffIssue.message === "string" &&
      handoffIssue.message.trim().length > 0 &&
      !hasUnexpectedKeys(handoffIssue, ISSUE_FIELDS),
  );
}

function isValidProvenance(value: unknown): boolean {
  const provenance = asRecord(value);
  return Boolean(
    provenance &&
      !hasUnexpectedKeys(provenance, PROVENANCE_FIELDS) &&
      Array.isArray(provenance.sourceRefs) &&
      provenance.sourceRefs.length > 0 &&
      provenance.sourceRefs.every(
        (sourceRef) => typeof sourceRef === "string" && isCanonicalSourceRef(sourceRef),
      ),
  );
}

export function validateHandoffEnvelope(value: unknown): KataResult<unknown> {
  const envelope = asRecord(value);
  const issues: KataIssue[] = [];

  if (envelope && hasUnexpectedKeys(envelope, HANDOFF_FIELDS)) {
    issues.push(
      issue("additional_property", "HandoffEnvelope contains unsupported fields.", "handoff"),
    );
  }

  if (envelope?.schema_version === undefined) {
    issues.push(
      issue(
        "schema_version_missing",
        "HandoffEnvelope requires schema_version.",
        "handoff.schema_version",
      ),
    );
  } else if (envelope.schema_version !== 1 || !Number.isInteger(envelope.schema_version)) {
    issues.push(
      issue(
        "schema_version_invalid",
        "HandoffEnvelope schema_version must be 1.",
        "handoff.schema_version",
      ),
    );
  }

  for (const field of ["from_agent", "to_agent"]) {
    const fieldIssue = requiredNonEmptyStringIssue(envelope, field);
    if (fieldIssue) issues.push(fieldIssue);
  }

  const summaryIssue = requiredStringIssue(envelope, "summary");
  if (summaryIssue) issues.push(summaryIssue);

  if (envelope?.status === undefined || envelope.status === "") {
    issues.push(issue("status_missing", "HandoffEnvelope requires status.", "handoff.status"));
  } else if (typeof envelope.status !== "string" || !HANDOFF_STATUSES.has(envelope.status)) {
    issues.push(
      issue(
        "status_invalid",
        "HandoffEnvelope status must be done, done_with_concerns, blocked, or needs_context.",
        "handoff.status",
      ),
    );
  }

  if (!Array.isArray(envelope?.artifacts)) {
    issues.push(
      issue("artifacts_missing", "HandoffEnvelope requires artifacts array.", "handoff.artifacts"),
    );
  } else if (!envelope.artifacts.every(isValidArtifact)) {
    issues.push(
      issue(
        "artifact_invalid",
        "HandoffEnvelope artifacts must contain only path and kind.",
        "handoff.artifacts",
      ),
    );
  }

  if (!Array.isArray(envelope?.issues)) {
    issues.push(
      issue("issues_missing", "HandoffEnvelope requires issues array.", "handoff.issues"),
    );
  } else if (!envelope.issues.every(isValidIssue)) {
    issues.push(
      issue(
        "issue_invalid",
        "HandoffEnvelope issues must contain only severity and message.",
        "handoff.issues",
      ),
    );
  }

  if (envelope?.provenance === undefined) {
    issues.push(
      issue(
        "provenance_missing",
        "HandoffEnvelope requires SourceRef provenance.",
        "handoff.provenance",
      ),
    );
  } else if (!isValidProvenance(envelope.provenance)) {
    issues.push(
      issue(
        "provenance_invalid",
        "HandoffEnvelope provenance requires non-empty canonical SourceRefs.",
        "handoff.provenance",
      ),
    );
  }

  return { ok: issues.length === 0, value, issues };
}

export const requireProvenance = validateHandoffEnvelope;
export const refuseMissingEvidence = validateHandoffEnvelope;
