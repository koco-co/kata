import { describe, expect, test } from "bun:test";
import { spawnKataCli } from "../cli-runner.ts";

describe("safety audit-command", () => {
  test("blocks rm -rf workspace", () => {
    const result = spawnKataCli(["safety", "audit-command", "--command", "rm -rf workspace"]);

    expect(result.status).toBe(2);
    expect(result.stderr).toContain("rm -rf workspace");
  });

  test("blocks git push from .kata/repos", () => {
    const result = spawnKataCli([
      "safety",
      "audit-command",
      "--command",
      "cd .kata/repos/x/foo && git push",
    ]);

    expect(result.status).toBe(2);
    expect(result.stderr).toContain("源码缓存只读");
  });

  test("blocks git push from workspace project .kata/repos", () => {
    const result = spawnKataCli([
      "safety",
      "audit-command",
      "--command",
      "cd workspace/dataAssets/.kata/repos/x/foo && git push",
    ]);

    expect(result.status).toBe(2);
    expect(result.stderr).toContain("源码缓存只读");
  });

  test("blocks git push from .kata/repos root", () => {
    const result = spawnKataCli([
      "safety",
      "audit-command",
      "--command",
      "cd .kata/repos/x && git push",
    ]);

    expect(result.status).toBe(2);
    expect(result.stderr).toContain("源码缓存只读");
  });

  test("blocks git -C push inside .kata/repos", () => {
    const result = spawnKataCli([
      "safety",
      "audit-command",
      "--command",
      "git -C .kata/repos/x/foo push",
    ]);

    expect(result.status).toBe(2);
    expect(result.stderr).toContain("源码缓存只读");
  });

  test("blocks git commit from .kata/repos", () => {
    const result = spawnKataCli([
      "safety",
      "audit-command",
      "--command",
      "cd .kata/repos/x/foo && git commit -m test",
    ]);

    expect(result.status).toBe(2);
    expect(result.stderr).toContain("禁止执行会修改仓库的 Git 命令");
  });

  test("blocks git add from .kata/repos", () => {
    const result = spawnKataCli([
      "safety",
      "audit-command",
      "--command",
      "git -C .kata/repos/x/foo add .",
    ]);

    expect(result.status).toBe(2);
    expect(result.stderr).toContain("禁止执行会修改仓库的 Git 命令");
  });

  test("allows read-only git status under .kata/repos", () => {
    const result = spawnKataCli([
      "safety",
      "audit-command",
      "--command",
      "cd .kata/repos/x/foo && git status",
    ]);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("允许执行");
  });

  test("allows read-only git status under workspace project .kata/repos", () => {
    const result = spawnKataCli([
      "safety",
      "audit-command",
      "--command",
      "cd workspace/dataAssets/.kata/repos/x/foo && git status",
    ]);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("允许执行");
  });

  test("allows harmless git status", () => {
    const result = spawnKataCli(["safety", "audit-command", "--command", "git status"]);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("允许执行");
  });
});
