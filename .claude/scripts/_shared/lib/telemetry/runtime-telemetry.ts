import type { KataIssue, KataResult } from "@shared/lib/result-types.ts";

const ALLOWED_FIELDS = new Set([
  "event_id",
  "event_kind",
  "run_id",
  "skill_id",
  "skill_version",
  "workflow_id",
  "agent_id",
  "prompt_id",
  "plugin_id",
  "input_tokens",
  "output_tokens",
  "status",
  "rule_id",
  "hashed_artifact_ref",
]);
const EVENT_KIND_VALUES = new Set([
  "artifact",
  "policy",
  "plugin",
  "agent",
  "source_ref",
  "config",
]);
const STATUS_VALUES = new Set(["success", "partial", "failed", "blocked"]);
const STRING_MAX_LENGTH = 256;
const HASHED_ARTIFACT_REF_PATTERN = /^sha256:[a-f0-9]{64}$/;
const SECRET_LIKE_VALUE_PATTERN =
  /(?:token=|secret=|password=|cookie=|api_key=|access_key=|private_key=|sk-[A-Za-z0-9_-]+)/i;
const STRING_FIELDS = new Set([
  "event_id",
  "event_kind",
  "run_id",
  "skill_id",
  "workflow_id",
  "agent_id",
  "prompt_id",
  "plugin_id",
  "status",
  "rule_id",
  "hashed_artifact_ref",
]);
const NUMBER_FIELDS = new Set(["skill_version", "input_tokens", "output_tokens"]);

function issue(code: string, message: string, path: string): KataIssue {
  return { code, severity: "error", message, path };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

export function validateTelemetryEvent(
  event: Record<string, unknown>,
): KataResult<Record<string, unknown>> {
  const issues: KataIssue[] = [];

  if (!isRecord(event)) {
    return {
      ok: false,
      issues: [issue("telemetry.invalid_event", "Telemetry event must be an object.", "telemetry")],
    };
  }

  if (typeof event.body === "string") {
    issues.push(
      issue(
        "telemetry.free_text_blocked",
        "Telemetry events must not contain free-text artifact bodies.",
        "body",
      ),
    );
  }

  for (const [field, value] of Object.entries(event)) {
    if (!ALLOWED_FIELDS.has(field)) {
      issues.push(
        issue("telemetry.unknown_field", `Telemetry field is not allowed: ${field}`, field),
      );
      continue;
    }
    if (STRING_FIELDS.has(field)) {
      if (typeof value !== "string") {
        issues.push(
          issue(
            "telemetry.field_type_invalid",
            `Telemetry field must be a string: ${field}`,
            field,
          ),
        );
        continue;
      }
      if (value.length > STRING_MAX_LENGTH) {
        issues.push(
          issue("telemetry.string_too_long", `Telemetry string field is too long: ${field}`, field),
        );
      }
      if (SECRET_LIKE_VALUE_PATTERN.test(value)) {
        issues.push(
          issue(
            "telemetry.secret_like_value_blocked",
            `Telemetry string field looks secret-like: ${field}`,
            field,
          ),
        );
      }
      continue;
    }
    if (NUMBER_FIELDS.has(field)) {
      if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
        issues.push(
          issue(
            "telemetry.field_type_invalid",
            `Telemetry field must be a non-negative integer: ${field}`,
            field,
          ),
        );
      }
    }
  }

  for (const field of ["event_id", "event_kind", "run_id", "status"]) {
    if (typeof event[field] !== "string" || event[field].length === 0) {
      issues.push(issue("telemetry.required_field_missing", `Telemetry requires ${field}.`, field));
    }
  }

  if (typeof event.status === "string" && !STATUS_VALUES.has(event.status)) {
    issues.push(issue("telemetry.status_invalid", "Telemetry status is invalid.", "status"));
  }

  if (typeof event.event_kind === "string" && !EVENT_KIND_VALUES.has(event.event_kind)) {
    issues.push(
      issue("telemetry.event_kind_invalid", "Telemetry event_kind is invalid.", "event_kind"),
    );
  }

  if (
    event.hashed_artifact_ref !== undefined &&
    (typeof event.hashed_artifact_ref !== "string" ||
      !HASHED_ARTIFACT_REF_PATTERN.test(event.hashed_artifact_ref))
  ) {
    issues.push(
      issue(
        "telemetry.hash_invalid",
        "Telemetry hashed_artifact_ref must be a sha256 hash reference.",
        "hashed_artifact_ref",
      ),
    );
  }

  return { ok: issues.length === 0, value: event, issues };
}
