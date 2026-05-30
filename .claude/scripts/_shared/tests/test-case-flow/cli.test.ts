import { describe, expect, it } from "bun:test";
import { registerTestCaseFlow } from "@skills/case-draft/scripts/test-case-flow.ts";
import { Command } from "commander";

describe("test-case-flow CLI registration", () => {
  it("registers test-case-flow command", () => {
    const program = new Command();
    registerTestCaseFlow(program);
    const cmd = program.commands.find((c) => c.name() === "test-case-flow");
    expect(cmd).toBeDefined();
    expect(cmd?.commands.map((c) => c.name())).toContain("start");
    expect(cmd?.commands.map((c) => c.name())).toContain("status");
    expect(cmd?.commands.map((c) => c.name())).toContain("continue");
  });
});
