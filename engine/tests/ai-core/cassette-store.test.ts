import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  cassetteHash,
  checkCassetteLock,
  readCassette,
  renderCassetteLock,
  writeCassette,
  writeCassetteLock,
} from "../../src/ai-core/cassette-store.ts";

function tempRoot() {
  return mkdtempSync(join(tmpdir(), "kata-cassette-test-"));
}

describe("cassette-store", () => {
  let root: string;
  let cassetteRoot: string;

  beforeEach(() => {
    root = tempRoot();
    cassetteRoot = join(root, "cassettes");
    mkdirSync(cassetteRoot, { recursive: true });
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  describe("cassetteHash", () => {
    it("produces a 64-char hex string", () => {
      const hash = cassetteHash("s@1", "prompt", "fixture");
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it("is deterministic for same inputs", () => {
      const a = cassetteHash("s@1", "p", "f");
      const b = cassetteHash("s@1", "p", "f");
      expect(a).toBe(b);
    });

    it("differs when skill, prompt, or fixture changes", () => {
      const base = cassetteHash("s@1", "p", "f");
      expect(cassetteHash("s@2", "p", "f")).not.toBe(base);
      expect(cassetteHash("s@1", "p2", "f")).not.toBe(base);
      expect(cassetteHash("s@1", "p", "f2")).not.toBe(base);
    });
  });

  describe("writeCassette + readCassette", () => {
    it("round-trips cassette data", () => {
      writeCassette({
        id: "test-case@1",
        subjectSkill: "test-skill@1",
        inputFixture: "fixtures/test.json",
        promptText: "system\nuser",
        output: { score: 0.9, pass: true },
        cassetteRoot,
        root,
      });

      const result = readCassette({
        id: "test-case@1",
        subjectSkill: "test-skill@1",
        inputFixture: "fixtures/test.json",
        promptText: "system\nuser",
        cassetteRoot,
        root,
      });

      expect(result.ok).toBe(true);
      expect(result.value?.id).toBe("test-case@1");
      expect(result.value?.subject_skill).toBe("test-skill@1");
      expect((result.value?.output as Record<string, unknown>).score).toBe(0.9);
    });

    it("returns error for missing cassette", () => {
      const result = readCassette({
        id: "missing@1",
        subjectSkill: "s@1",
        inputFixture: "f.json",
        promptText: "p",
        cassetteRoot,
        root,
      });

      expect(result.ok).toBe(false);
      expect(result.issues[0].code).toBe("cassette.missing");
    });

    it("finds different cassettes for different prompts", () => {
      writeCassette({
        id: "case-a@1",
        subjectSkill: "s@1",
        inputFixture: "f.json",
        promptText: "prompt-v1",
        output: { version: 1 },
        cassetteRoot,
        root,
      });

      // Different prompt → different hash → not found under the other prompt
      const result = readCassette({
        id: "case-a@1",
        subjectSkill: "s@1",
        inputFixture: "f.json",
        promptText: "prompt-v2",
        cassetteRoot,
        root,
      });

      expect(result.ok).toBe(false);
      expect(result.issues[0].code).toBe("cassette.missing");
    });
  });

  describe("cassette lock", () => {
    it("renders lock for cassette directory", () => {
      writeCassette({
        id: "lock-test@1",
        subjectSkill: "s@1",
        inputFixture: "f.json",
        promptText: "prompt",
        output: { ok: true },
        cassetteRoot,
        root,
      });

      const lock = renderCassetteLock({ cassetteRoot, root });
      expect(lock.schema_version).toBe(1);
      expect(lock.files.length).toBe(1);
      expect(lock.files[0].id).toBe("lock-test@1");
    });

    it("checkCassetteLock passes for matching lock", () => {
      writeCassette({
        id: "lock-ok@1",
        subjectSkill: "s@1",
        inputFixture: "f.json",
        promptText: "prompt",
        output: { ok: true },
        cassetteRoot,
        root,
      });
      writeCassetteLock({ cassetteRoot, root });

      const lock = renderCassetteLock({ cassetteRoot, root });
      const check = checkCassetteLock({ cassetteRoot, root, lock });
      expect(check.ok).toBe(true);
    });

    it("checkCassetteLock fails when cassette is tampered", () => {
      writeCassette({
        id: "tamper@1",
        subjectSkill: "s@1",
        inputFixture: "f.json",
        promptText: "prompt",
        output: { ok: true },
        cassetteRoot,
        root,
      });
      writeCassetteLock({ cassetteRoot, root });

      const lock = renderCassetteLock({ cassetteRoot, root });

      // Tamper with the cassette on disk
      const hash = cassetteHash("s@1", "prompt", "f.json");
      writeFileSync(join(cassetteRoot, `${hash}.json`), "tampered content");

      const check = checkCassetteLock({ cassetteRoot, root, lock });
      expect(check.ok).toBe(false);
    });
  });

  describe("empty cassette directory", () => {
    it("renders empty lock", () => {
      const lock = renderCassetteLock({ cassetteRoot, root });
      expect(lock.files.length).toBe(0);
      expect(lock.schema_version).toBe(1);
    });
  });
});
