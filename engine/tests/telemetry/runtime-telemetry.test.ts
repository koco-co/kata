import { describe, expect, it } from "bun:test";
import { validateTelemetryEvent } from "../../src/telemetry/runtime-telemetry.ts";

describe("runtime telemetry", () => {
  it("accepts a closed-schema hashed artifact event", () => {
    const result = validateTelemetryEvent({
      event_id: "evt-1",
      event_kind: "plugin",
      run_id: "run-1",
      plugin_id: "fixture-design-source.fetch-design-doc",
      status: "success",
      hashed_artifact_ref:
        "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    });

    expect(result.ok).toBe(true);
  });

  it("rejects free-text artifact bodies", () => {
    const result = validateTelemetryEvent({
      event: "artifact",
      body: "full generated report text",
    });

    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain("telemetry.free_text_blocked");
  });

  it("rejects long free-text fields", () => {
    const result = validateTelemetryEvent({
      event_id: "evt-1",
      event_kind: "policy",
      run_id: "run-1",
      status: "failed",
      rule_id: "x".repeat(257),
    });

    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain("telemetry.string_too_long");
  });

  it("rejects unknown fields", () => {
    const result = validateTelemetryEvent({
      event_id: "evt-1",
      event_kind: "policy",
      run_id: "run-1",
      status: "failed",
      prompt: "raw prompt text",
    });

    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain("telemetry.unknown_field");
  });

  it("rejects object values in allowed string fields", () => {
    const result = validateTelemetryEvent({
      event_id: "evt-1",
      event_kind: "plugin",
      run_id: "run-1",
      plugin_id: { raw: "secret" },
      status: "success",
    });

    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain("telemetry.field_type_invalid");
  });

  it("rejects arrays in allowed count fields", () => {
    const result = validateTelemetryEvent({
      event_id: "evt-1",
      event_kind: "config",
      run_id: "run-1",
      input_tokens: [123],
      status: "success",
    });

    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain("telemetry.field_type_invalid");
  });

  it("rejects unsupported event kinds", () => {
    const result = validateTelemetryEvent({
      event_id: "evt-1",
      event_kind: "raw_prompt_dump",
      run_id: "run-1",
      status: "failed",
    });

    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain("telemetry.event_kind_invalid");
  });

  it("rejects secret-like values in allowed string fields", () => {
    const result = validateTelemetryEvent({
      event_id: "evt-1",
      event_kind: "agent",
      run_id: "token=real-secret",
      agent_id: "sk-real-secret",
      status: "failed",
    });

    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain(
      "telemetry.secret_like_value_blocked",
    );
    expect(result.issues.map((issue) => issue.path)).toContain("run_id");
    expect(result.issues.map((issue) => issue.path)).toContain("agent_id");
  });

  it("rejects key-shaped secret values in allowed string fields", () => {
    const result = validateTelemetryEvent({
      event_id: "evt-1",
      event_kind: "config",
      run_id: "api_key=real-secret",
      workflow_id: "access_key=real-secret",
      prompt_id: "private_key=real-secret",
      status: "failed",
    });

    expect(result.ok).toBe(false);
    expect(
      result.issues.filter((issue) => issue.code === "telemetry.secret_like_value_blocked"),
    ).toHaveLength(3);
    expect(result.issues.map((issue) => issue.path)).toContain("run_id");
    expect(result.issues.map((issue) => issue.path)).toContain("workflow_id");
    expect(result.issues.map((issue) => issue.path)).toContain("prompt_id");
  });
});
