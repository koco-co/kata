import { describe, expect, it } from "bun:test";
import { validatePromptCacheAndRouting } from "../../src/ai-core/prompt-cache-validator.ts";

const PROMPT_PATH = ".ai/core/prompts/test.prompt.yaml";

function makePrompt(extra: string): string {
  return [
    "id: test@1",
    "schema_ref: PromptContract@1",
    "locale: zh-CN",
    "model_lock:",
    "  required_capabilities:",
    "    - structured_output",
    "    - long_context",
    "  minimum_context_tokens: 32000",
    "input_schema:",
    "  name: TestInput@1",
    "  required:",
    "    - foo",
    "output_schema:",
    "  name: TestOutput@1",
    "  required:",
    "    - bar",
    "rendering:",
    "  role_sections:",
    "    system: sys",
    "    user: usr",
    "  boundaries:",
    "    untrusted_context_tag: context",
    "    source_ref_tag: source_ref",
    "prefill:",
    "  enabled: true",
    "  text: '{'",
    "fallback:",
    "  deterministic_parse: true",
    "  on_schema_error: refuse",
    "hallucination_policy:",
    "  unknown_fact: pending",
    "  missing_source_ref: refuse",
    extra,
  ].join("\n");
}

describe("prompt-cache-validator", () => {
  it("accepts a prompt with a legal cache_breakpoints + model_routing combo", () => {
    const yamlText = makePrompt(
      [
        "cache_breakpoints:",
        "  - id: kata-system",
        "    after: system",
        "    min_tokens: 1024",
        "  - id: kata-context",
        "    after: context",
        "    min_tokens: 2048",
        "model_routing:",
        "  primary:",
        "    provider: anthropic",
        "    model_id: claude-sonnet-4-6",
        "    fallback_strategy: refuse_with_budget_report",
        "  fallback:",
        "    - provider: anthropic",
        "      model_id: claude-haiku-4-5-20251001",
        "      condition: budget_low",
      ].join("\n"),
    );
    const result = validatePromptCacheAndRouting(yamlText, PROMPT_PATH);
    expect(result.ok).toBe(true);
    expect(result.issues.filter((issue) => issue.severity === "error")).toEqual([]);
  });

  it("rejects cache_breakpoints whose 'after' violates the system→user→tools→context order", () => {
    const yamlText = makePrompt(
      [
        "cache_breakpoints:",
        "  - id: a",
        "    after: context",
        "    min_tokens: 1024",
        "  - id: b",
        "    after: system",
        "    min_tokens: 2048",
      ].join("\n"),
    );
    const result = validatePromptCacheAndRouting(yamlText, PROMPT_PATH);
    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain(
      "prompt.cache_breakpoint_after_out_of_order",
    );
  });

  it("rejects cache_breakpoints with more than 4 entries", () => {
    const yamlText = makePrompt(
      [
        "cache_breakpoints:",
        "  - id: a",
        "    after: system",
        "    min_tokens: 100",
        "  - id: b",
        "    after: user",
        "    min_tokens: 200",
        "  - id: c",
        "    after: tools",
        "    min_tokens: 300",
        "  - id: d",
        "    after: context",
        "    min_tokens: 400",
        "  - id: e",
        "    after: context",
        "    min_tokens: 500",
      ].join("\n"),
    );
    const result = validatePromptCacheAndRouting(yamlText, PROMPT_PATH);
    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain("prompt.cache_breakpoints_too_many");
  });

  it("rejects cache_breakpoints whose min_tokens is not strictly increasing", () => {
    const yamlText = makePrompt(
      [
        "cache_breakpoints:",
        "  - id: a",
        "    after: system",
        "    min_tokens: 2048",
        "  - id: b",
        "    after: user",
        "    min_tokens: 1024",
      ].join("\n"),
    );
    const result = validatePromptCacheAndRouting(yamlText, PROMPT_PATH);
    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain(
      "prompt.cache_breakpoint_min_tokens_not_monotonic",
    );
  });

  it("rejects model_routing whose primary.model_id lacks a model_lock required capability", () => {
    const yamlText = makePrompt(
      [
        "model_routing:",
        "  primary:",
        "    provider: anthropic",
        "    model_id: claude-haiku-4-5-20251001",
        "    fallback_strategy: refuse_with_budget_report",
      ].join("\n"),
    ).replace("    - long_context", "    - long_context\n    - vision");
    const result = validatePromptCacheAndRouting(yamlText, PROMPT_PATH);
    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain(
      "prompt.model_routing_capability_mismatch",
    );
  });

  it("rejects model_id and model_routing being declared together", () => {
    const yamlText = makePrompt(
      [
        "model_id: claude-sonnet-4-6",
        "model_routing:",
        "  primary:",
        "    provider: anthropic",
        "    model_id: claude-sonnet-4-6",
        "    fallback_strategy: refuse_with_budget_report",
      ].join("\n"),
    );
    const result = validatePromptCacheAndRouting(yamlText, PROMPT_PATH);
    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain("prompt.model_id_routing_conflict");
  });

  it("rejects model_routing.primary missing fallback_strategy", () => {
    const yamlText = makePrompt(
      [
        "model_routing:",
        "  primary:",
        "    provider: anthropic",
        "    model_id: claude-sonnet-4-6",
      ].join("\n"),
    );
    const result = validatePromptCacheAndRouting(yamlText, PROMPT_PATH);
    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain(
      "prompt.model_routing_invalid_fallback_strategy",
    );
  });

  it("rejects fallback entries that miss the condition field", () => {
    const yamlText = makePrompt(
      [
        "model_routing:",
        "  primary:",
        "    provider: anthropic",
        "    model_id: claude-sonnet-4-6",
        "    fallback_strategy: refuse_with_budget_report",
        "  fallback:",
        "    - provider: anthropic",
        "      model_id: claude-haiku-4-5-20251001",
      ].join("\n"),
    );
    const result = validatePromptCacheAndRouting(yamlText, PROMPT_PATH);
    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain(
      "prompt.model_routing_invalid_condition",
    );
  });

  it("treats prompts with neither cache_breakpoints nor model_routing as valid", () => {
    const yamlText = makePrompt("");
    const result = validatePromptCacheAndRouting(yamlText, PROMPT_PATH);
    expect(result.ok).toBe(true);
    expect(result.issues.filter((issue) => issue.severity === "error")).toEqual([]);
  });

  it("rejects cache_breakpoints whose 'after' duplicates the previous segment", () => {
    const yamlText = makePrompt(
      [
        "cache_breakpoints:",
        "  - id: a",
        "    after: system",
        "    min_tokens: 1024",
        "  - id: b",
        "    after: system",
        "    min_tokens: 2048",
      ].join("\n"),
    );
    const result = validatePromptCacheAndRouting(yamlText, PROMPT_PATH);
    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain(
      "prompt.cache_breakpoint_after_duplicate",
    );
  });
});
