import { afterEach, describe, expect, test } from "bun:test";
import {
  parseAgentRuntimeSelector,
  requireConcreteAgentRuntime,
  resolveAgentRuntime,
} from "../../lib/paths.ts";

const OLD_ENV = process.env.KATA_AGENT_RUNTIME;

afterEach(() => {
  if (OLD_ENV === undefined) delete process.env.KATA_AGENT_RUNTIME;
  else process.env.KATA_AGENT_RUNTIME = OLD_ENV;
});

describe("agent runtime env parsing", () => {
  test("explicit runtime wins over environment", () => {
    process.env.KATA_AGENT_RUNTIME = "codex";
    expect(resolveAgentRuntime("claude")).toBe("claude");
  });

  test("selector allows all for audit commands", () => {
    expect(parseAgentRuntimeSelector("all")).toBe("all");
  });

  test("concrete runtime rejects all", () => {
    expect(() => requireConcreteAgentRuntime("all")).toThrow("requires a concrete runtime");
  });

  test("invalid environment value throws", () => {
    process.env.KATA_AGENT_RUNTIME = "bad-runtime";
    expect(() => resolveAgentRuntime()).toThrow("Invalid agent runtime");
  });
});
