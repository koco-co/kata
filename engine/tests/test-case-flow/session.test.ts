import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  buildPrdSlug,
  buildSessionPaths,
  checkResumeSession,
  createSessionId,
  saveSessionState,
} from "../../src/test-case-flow/session";

describe("TestCaseFlowSession", () => {
  it("createSessionId includes project prefix", () => {
    const id = createSessionId({ project: "demo", sourceHash: "abc123" });
    expect(id).toMatch(/^demo-/);
  });

  it("buildPrdSlug converts Chinese to kebab-case", () => {
    expect(buildPrdSlug("用户管理 原型")).toBe("user-management-prototype");
  });

  it("buildSessionPaths returns correct paths", () => {
    const paths = buildSessionPaths({
      workspaceRoot: "/tmp/ws",
      project: "demo",
      yyyymm: "202605",
      prdSlug: "sample",
    });
    expect(paths.enhancedPath).toBe("/tmp/ws/demo/features/202605-sample/enhanced.md");
  });
});

describe("resume detection", () => {
  const testDir = join(tmpdir(), `kata-session-test-${Date.now()}`);
  const sessionDir = join(testDir, ".kata", "sessions");

  beforeEach(() => {
    mkdirSync(sessionDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it("detects existing session", () => {
    const session = {
      sessionId: "demo-test123",
      project: "demo",
      currentStep: "discuss",
      sourceHash: "test123",
      lastUpdated: new Date().toISOString(),
    };
    saveSessionState(session, sessionDir);
    const result = checkResumeSession({ sessionId: "demo-test123" }, sessionDir);
    expect(result.exists).toBe(true);
    expect(result.lastStep).toBe("discuss");
  });

  it("reports nonexistent session", () => {
    const result = checkResumeSession({ sessionId: "nonexistent" }, sessionDir);
    expect(result.exists).toBe(false);
  });
});
