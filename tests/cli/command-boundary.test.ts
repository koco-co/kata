import { describe, expect, it } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

describe("CLI command error boundary", () => {
  it("delegates process termination to the root CLI entry", () => {
    const commandDir = resolve(import.meta.dir, "../../cli/commands");
    const offenders = readdirSync(commandDir)
      .filter((name) => name.endsWith(".ts"))
      .filter((name) => readFileSync(join(commandDir, name), "utf8").includes("process.exit("));
    expect(offenders).toEqual([]);
  });

  it("keeps DTStack dispatch reusable by returning errors to its root entry", () => {
    const dispatch = readFileSync(
      resolve(import.meta.dir, "../../cli/integrations/dtstack/src/cli/dispatch.ts"),
      "utf8",
    );
    expect(dispatch).not.toContain("process.exit(");
    expect(dispatch).toContain("class DtStackCliError");
  });
});
