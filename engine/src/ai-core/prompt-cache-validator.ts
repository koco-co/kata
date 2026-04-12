import type { AiCoreIssue, AiCoreResult } from "./types.ts";

const VALID_AFTER_ORDER = ["system", "user", "tools", "context"] as const;
const VALID_FALLBACK_STRATEGIES = ["refuse_with_budget_report", "downgrade", "retry_once"] as const;
const VALID_FALLBACK_CONDITIONS = [
  "budget_low",
  "primary_unavailable",
  "context_overflow",
] as const;
const VALID_PROVIDERS = ["anthropic"] as const;
const MAX_CACHE_BREAKPOINTS = 4;

const KNOWN_MODEL_CAPABILITIES: Record<string, ReadonlyArray<string>> = {
  "claude-opus-4-7": ["structured_output", "long_context", "vision"],
  "claude-opus-4-7[1m]": ["structured_output", "long_context", "vision"],
  "claude-sonnet-4-6": ["structured_output", "long_context", "vision"],
  "claude-haiku-4-5-20251001": ["structured_output", "long_context"],
};

export type PromptCacheBreakpoint = {
  id: string;
  after: (typeof VALID_AFTER_ORDER)[number];
  min_tokens: number;
};

export type ModelRoutingChoice = {
  provider: string;
  model_id: string;
  fallback_strategy?: string;
  condition?: string;
};

export type ModelRouting = {
  primary: ModelRoutingChoice;
  fallback?: ModelRoutingChoice[];
};

export type PromptCacheAndRouting = {
  cache_breakpoints: PromptCacheBreakpoint[];
  model_routing: ModelRouting | undefined;
  model_id: string | undefined;
};

type BunWithYAML = {
  YAML?: { parse: (text: string) => unknown };
};

function issue(code: string, message: string, path: string): AiCoreIssue {
  return { code, severity: "error", message, path };
}

export function validatePromptCacheAndRouting(
  yamlText: string,
  path: string,
): AiCoreResult<PromptCacheAndRouting> {
  const bun = (globalThis as { Bun?: BunWithYAML }).Bun;
  if (!bun?.YAML?.parse) {
    return {
      ok: false,
      issues: [
        issue(
          "prompt.yaml_parser_unavailable",
          "Bun.YAML.parse is required to validate prompt cache_breakpoints and model_routing.",
          path,
        ),
      ],
    };
  }
  let parsed: unknown;
  try {
    parsed = bun.YAML.parse(yamlText);
  } catch (error) {
    return {
      ok: false,
      issues: [
        issue(
          "prompt.yaml_parse_failed",
          error instanceof Error ? error.message : String(error),
          path,
        ),
      ],
    };
  }
  if (!isPlainRecord(parsed)) {
    return {
      ok: false,
      issues: [issue("prompt.yaml_invalid_root", "Prompt yaml root must be a mapping.", path)],
    };
  }

  const issues: AiCoreIssue[] = [];
  issues.push(...validateCacheBreakpoints(parsed.cache_breakpoints, path));
  issues.push(...validateModelRouting(parsed.model_routing, parsed.model_lock, path));
  issues.push(...validateModelIdExclusivity(parsed.model_id, parsed.model_routing, path));

  const value: PromptCacheAndRouting = {
    cache_breakpoints: Array.isArray(parsed.cache_breakpoints)
      ? (parsed.cache_breakpoints as PromptCacheBreakpoint[])
      : [],
    model_routing: isPlainRecord(parsed.model_routing)
      ? (parsed.model_routing as ModelRouting)
      : undefined,
    model_id: typeof parsed.model_id === "string" ? parsed.model_id : undefined,
  };

  return {
    ok: issues.every((i) => i.severity !== "error"),
    value,
    issues,
  };
}

function validateCacheBreakpoints(breakpoints: unknown, path: string): AiCoreIssue[] {
  if (breakpoints === undefined || breakpoints === null) return [];
  const out: AiCoreIssue[] = [];
  if (!Array.isArray(breakpoints)) {
    out.push(
      issue("prompt.cache_breakpoints_invalid_type", "cache_breakpoints must be an array.", path),
    );
    return out;
  }
  if (breakpoints.length > MAX_CACHE_BREAKPOINTS) {
    out.push(
      issue(
        "prompt.cache_breakpoints_too_many",
        `cache_breakpoints supports at most ${MAX_CACHE_BREAKPOINTS} entries (got ${breakpoints.length}).`,
        path,
      ),
    );
  }
  let lastAfterIndex = -1;
  let lastMinTokens = 0;
  const seenIds = new Set<string>();
  for (const [index, entry] of breakpoints.entries()) {
    const where = `cache_breakpoints[${index}]`;
    if (!isPlainRecord(entry)) {
      out.push(issue("prompt.cache_breakpoint_not_object", `${where} must be an object.`, path));
      continue;
    }
    const id = entry.id;
    if (typeof id !== "string" || id.length === 0) {
      out.push(
        issue("prompt.cache_breakpoint_missing_id", `${where} requires a non-empty id.`, path),
      );
    } else if (seenIds.has(id)) {
      out.push(
        issue("prompt.cache_breakpoint_duplicate_id", `${where} duplicates id ${id}.`, path),
      );
    } else {
      seenIds.add(id);
    }
    const after = entry.after;
    const afterIndex =
      typeof after === "string"
        ? VALID_AFTER_ORDER.indexOf(after as (typeof VALID_AFTER_ORDER)[number])
        : -1;
    if (afterIndex === -1) {
      out.push(
        issue(
          "prompt.cache_breakpoint_invalid_after",
          `${where}.after must be one of ${VALID_AFTER_ORDER.join(", ")}.`,
          path,
        ),
      );
    } else if (afterIndex < lastAfterIndex) {
      out.push(
        issue(
          "prompt.cache_breakpoint_after_out_of_order",
          `${where}.after '${after}' must follow ${VALID_AFTER_ORDER[lastAfterIndex]} (or later) in the system→user→tools→context order.`,
          path,
        ),
      );
    } else if (afterIndex === lastAfterIndex) {
      out.push(
        issue(
          "prompt.cache_breakpoint_after_duplicate",
          `${where}.after '${after}' duplicates the previous segment; collapse them or split with a different segment.`,
          path,
        ),
      );
    }
    if (afterIndex !== -1) lastAfterIndex = afterIndex;

    const minTokens = entry.min_tokens;
    if (typeof minTokens !== "number" || !Number.isInteger(minTokens) || minTokens < 1) {
      out.push(
        issue(
          "prompt.cache_breakpoint_invalid_min_tokens",
          `${where}.min_tokens must be a positive integer.`,
          path,
        ),
      );
    } else if (minTokens <= lastMinTokens) {
      out.push(
        issue(
          "prompt.cache_breakpoint_min_tokens_not_monotonic",
          `${where}.min_tokens (${minTokens}) must exceed the previous breakpoint min_tokens (${lastMinTokens}).`,
          path,
        ),
      );
    } else {
      lastMinTokens = minTokens;
    }
  }
  return out;
}

function validateModelRouting(routing: unknown, modelLock: unknown, path: string): AiCoreIssue[] {
  if (routing === undefined || routing === null) return [];
  if (!isPlainRecord(routing)) {
    return [issue("prompt.model_routing_invalid_type", "model_routing must be an object.", path)];
  }
  const out: AiCoreIssue[] = [];
  const primary = routing.primary;
  if (!isPlainRecord(primary)) {
    out.push(
      issue(
        "prompt.model_routing_missing_primary",
        "model_routing.primary is required and must be an object.",
        path,
      ),
    );
  } else {
    out.push(...validateRoutingChoice(primary, "primary", path, { kind: "primary" }));
    if (typeof primary.model_id === "string") {
      out.push(...validateModelLockCompatibility(primary.model_id, modelLock, path));
    }
  }
  const fallback = routing.fallback;
  if (fallback !== undefined && fallback !== null) {
    if (!Array.isArray(fallback)) {
      out.push(
        issue(
          "prompt.model_routing_fallback_invalid_type",
          "model_routing.fallback must be an array.",
          path,
        ),
      );
    } else {
      for (const [index, entry] of fallback.entries()) {
        if (!isPlainRecord(entry)) {
          out.push(
            issue(
              "prompt.model_routing_fallback_not_object",
              `model_routing.fallback[${index}] must be an object.`,
              path,
            ),
          );
          continue;
        }
        out.push(...validateRoutingChoice(entry, `fallback[${index}]`, path, { kind: "fallback" }));
      }
    }
  }
  return out;
}

function validateRoutingChoice(
  choice: Record<string, unknown>,
  where: string,
  path: string,
  options: { kind: "primary" | "fallback" },
): AiCoreIssue[] {
  const out: AiCoreIssue[] = [];
  const provider = choice.provider;
  if (
    typeof provider !== "string" ||
    !(VALID_PROVIDERS as ReadonlyArray<string>).includes(provider)
  ) {
    out.push(
      issue(
        "prompt.model_routing_invalid_provider",
        `${where}.provider must be one of ${VALID_PROVIDERS.join(", ")}.`,
        path,
      ),
    );
  }
  const modelId = choice.model_id;
  if (typeof modelId !== "string" || modelId.length === 0) {
    out.push(
      issue("prompt.model_routing_missing_model_id", `${where}.model_id is required.`, path),
    );
  }
  if (options.kind === "primary") {
    const strategy = choice.fallback_strategy;
    if (
      typeof strategy !== "string" ||
      !(VALID_FALLBACK_STRATEGIES as ReadonlyArray<string>).includes(strategy)
    ) {
      out.push(
        issue(
          "prompt.model_routing_invalid_fallback_strategy",
          `${where}.fallback_strategy must be one of ${VALID_FALLBACK_STRATEGIES.join(", ")}.`,
          path,
        ),
      );
    }
  } else {
    const condition = choice.condition;
    if (
      typeof condition !== "string" ||
      !(VALID_FALLBACK_CONDITIONS as ReadonlyArray<string>).includes(condition)
    ) {
      out.push(
        issue(
          "prompt.model_routing_invalid_condition",
          `${where}.condition must be one of ${VALID_FALLBACK_CONDITIONS.join(", ")}.`,
          path,
        ),
      );
    }
  }
  return out;
}

function validateModelLockCompatibility(
  modelId: string,
  modelLock: unknown,
  path: string,
): AiCoreIssue[] {
  if (!isPlainRecord(modelLock)) return [];
  const required = modelLock.required_capabilities;
  if (!Array.isArray(required)) return [];
  const known = KNOWN_MODEL_CAPABILITIES[modelId];
  if (!known) return [];
  const missing = required.filter(
    (cap): cap is string => typeof cap === "string" && !known.includes(cap),
  );
  if (missing.length === 0) return [];
  return [
    issue(
      "prompt.model_routing_capability_mismatch",
      `model_routing primary model_id ${modelId} lacks capabilities required by model_lock: ${missing.join(", ")}.`,
      path,
    ),
  ];
}

function validateModelIdExclusivity(
  modelId: unknown,
  routing: unknown,
  path: string,
): AiCoreIssue[] {
  const hasRouting = routing !== undefined && routing !== null;
  if (modelId !== undefined && hasRouting) {
    return [
      issue(
        "prompt.model_id_routing_conflict",
        "model_id and model_routing must not both be present; choose one.",
        path,
      ),
    ];
  }
  if (modelId !== undefined && (typeof modelId !== "string" || modelId.length === 0)) {
    return [issue("prompt.model_id_invalid", "model_id must be a non-empty string.", path)];
  }
  return [];
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
