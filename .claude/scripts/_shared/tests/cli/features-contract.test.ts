import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  buildFeaturesCommand,
  parsePositiveInteger,
  resolveProjectScope,
} from "@shared/cli/features.ts";

const tempRoots: string[] = [];

function tempWorkspace(): string {
  const root = mkdtempSync(join(tmpdir(), "kata-features-contract-"));
  tempRoots.push(root);
  return root;
}

afterEach(() => {
  while (tempRoots.length > 0) {
    rmSync(tempRoots.pop()!, { recursive: true, force: true });
  }
});

describe("features project scope contract", () => {
  test("requires exactly one of --project and --all", () => {
    const workspace = tempWorkspace();
    expect(() =>
      resolveProjectScope(workspace, { project: undefined, all: false }),
    ).toThrow("选择且只选择一项");
    expect(() =>
      resolveProjectScope(workspace, { project: "demo", all: true }),
    ).toThrow("选择且只选择一项");
  });

  test("returns the explicit project without scanning unrelated directories", () => {
    const workspace = tempWorkspace();
    expect(resolveProjectScope(workspace, { project: "demo", all: false })).toEqual([
      "demo",
    ]);
  });

  test("--all only includes projects that contain a features directory", () => {
    const workspace = tempWorkspace();
    mkdirSync(join(workspace, "beta", "features"), { recursive: true });
    mkdirSync(join(workspace, "alpha", "features"), { recursive: true });
    mkdirSync(join(workspace, "runtime-cache"), { recursive: true });
    expect(resolveProjectScope(workspace, { all: true })).toEqual(["alpha", "beta"]);
  });
});

describe("features numeric options", () => {
  test("accepts positive safe integers", () => {
    expect(parsePositiveInteger("3", "--keep")).toBe(3);
  });

  test.each(["0", "-1", "1.5", "foo", "", "9007199254740992"])(
    "rejects invalid --keep value %s",
    (value) => {
      expect(() => parsePositiveInteger(value, "--keep")).toThrow(
        "--keep 必须是正整数",
      );
    },
  );
});

describe("features CLI parser contract", () => {
  async function parse(args: string[]): Promise<void> {
    const command = buildFeaturesCommand();
    command.exitOverride();
    await command.parseAsync(args, { from: "user" });
  }

  test("lint rejects --project together with --all through the real CLI", async () => {
    await expect(parse(["lint", "--project", "demo", "--all"])).rejects.toThrow(
      "选择且只选择一项",
    );
  });

  test("index rejects --project together with --all through the real CLI", async () => {
    await expect(
      parse(["index", "--project", "demo", "--all", "--dry-run"]),
    ).rejects.toThrow("选择且只选择一项");
  });

  test("clean rejects an invalid --keep value through the real CLI", async () => {
    await expect(
      parse(["clean", "--project", "demo", "--keep", "foo"]),
    ).rejects.toThrow("--keep 必须是正整数");
  });
});
