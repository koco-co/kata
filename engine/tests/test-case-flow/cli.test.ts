import { describe, expect, it } from "bun:test";
import { Command } from "commander";
import { registerTestCaseFlow } from "../../src/test-case-flow";

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
