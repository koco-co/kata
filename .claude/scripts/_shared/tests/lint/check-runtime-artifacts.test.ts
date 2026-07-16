import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  FORBIDDEN_DIRS,
  findRootArtifacts,
  findTrackedArtifacts,
} from "../../../lint/check-runtime-artifacts.ts";

describe("F6 lint: forbid runtime artifacts at repo root", () => {
  let scratch: string;
  beforeEach(() => {
    scratch = mkdtempSync(join(tmpdir(), "f6-artifacts-"));
  });
  afterEach(() => rmSync(scratch, { recursive: true, force: true }));

  it("把 allure-results 列入禁止目录", () => {
    // allure-results 落仓库根是 self-run 误用 CLI --reporter 的回归信号，必须守住
    expect(FORBIDDEN_DIRS).toContain("allure-results");
  });

  it("把已退役的 agent 适配目录列入禁止目录", () => {
    expect(FORBIDDEN_DIRS).toContain(".hermes");
    expect(FORBIDDEN_DIRS).toContain(".reasonix");
  });

  it("仓库根存在 allure-results 目录时判为违规", () => {
    mkdirSync(join(scratch, "allure-results"), { recursive: true });
    expect(findRootArtifacts(scratch)).toContain("allure-results");
  });

  it("干净根目录无违规", () => {
    expect(findRootArtifacts(scratch)).toEqual([]);
  });

  it("同时检出多个禁止目录", () => {
    mkdirSync(join(scratch, "allure-results"), { recursive: true });
    mkdirSync(join(scratch, "test-results"), { recursive: true });
    const found = findRootArtifacts(scratch);
    expect(found).toContain("allure-results");
    expect(found).toContain("test-results");
  });

  it("同名文件(非目录)不算违规", () => {
    writeFileSync(join(scratch, "allure-results"), "");
    expect(findRootArtifacts(scratch)).not.toContain("allure-results");
  });

  it("检出 Git 跟踪的 feature 运行产物和 .DS_Store", () => {
    expect(
      findTrackedArtifacts([
        "workspace/dataAssets/features/v7.0.0/example/runs/run-01/handoff.json",
        "workspace/dataAssets/features/v7.0.0/example/.DS_Store",
        "workspace/dataAssets/features/v7.0.0/example/cases/archive.md",
      ]),
    ).toEqual([
      "workspace/dataAssets/features/v7.0.0/example/runs/run-01/handoff.json",
      "workspace/dataAssets/features/v7.0.0/example/.DS_Store",
    ]);
  });
});
