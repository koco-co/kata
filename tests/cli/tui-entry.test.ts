import { describe, expect, it } from "bun:test";
import {
  parseAutomationRunArgs,
  parseCasesBuildArgs,
  tryLaunchTui,
} from "../../cli/lib/tui/entry.ts";

describe("TUI entry", () => {
  it("parses cases build quick-launch arguments", () => {
    expect(parseCasesBuildArgs(["cases", "build", "16212", "--project", "dataAssets"])).toEqual({
      requirementId: "16212",
      project: "dataAssets",
    });
    expect(parseCasesBuildArgs(["cases", "build", "--project=dataAssets", "16212"])).toEqual({
      requirementId: "16212",
      project: "dataAssets",
    });
  });

  it("does not treat unrelated commands as cases build", () => {
    expect(parseCasesBuildArgs(["cases", "lint", "--all-projects"])).toBeUndefined();
  });

  it("parses automation run quick-launch arguments", () => {
    expect(
      parseAutomationRunArgs(["automation", "run", "16212", "--project", "dataAssets"]),
    ).toEqual({
      requirementId: "16212",
      project: "dataAssets",
    });
    expect(parseAutomationRunArgs(["automation", "run", "--project=dataAssets", "16212"])).toEqual({
      requirementId: "16212",
      project: "dataAssets",
    });
  });

  it("does not deep-link automation run with other run options", () => {
    expect(
      parseAutomationRunArgs(["automation", "run", "16212", "--env", "ltqc-dev"]),
    ).toBeUndefined();
  });

  it("never launches TUI from a non-TTY process", async () => {
    expect(await tryLaunchTui([])).toBe(false);
  });
});
