import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  addBug,
  initAudit,
  nextBugId,
  readMeta,
  readReport,
  removeBug,
  setMeta,
  updateBugField,
} from "@shared/lib/scan-report-store.ts";
import type { AuditMeta, Bug } from "@shared/lib/scan-report-types.ts";

let WS = "";

beforeEach(() => {
  WS = mkdtempSync(join(tmpdir(), "scan-report-"));
  process.env.KATA_WORKSPACE_ROOT = WS;
});

afterEach(() => {
  rmSync(WS, { recursive: true, force: true });
  delete process.env.KATA_WORKSPACE_ROOT;
});

function makeMeta(overrides: Partial<AuditMeta> = {}): AuditMeta {
  return {
    schema_version: "1.0",
    project: "p1",
    repo: "dt-insight-engine",
    base_branch: "release_6.3.x",
    head_branch: "release_6.3.0_dev",
    base_commit: "aaaa",
    head_commit: "bbbb",
    scan_time: "2026-04-29T00:00:00Z",
    reviewer: null,
    related_feature: null,
    diff_stats: { files: 1, additions: 10, deletions: 2 },
    summary: "",
    ...overrides,
  };
}

function makeBug(id = "b-001"): Bug {
  return {
    id,
    title: "T",
    severity: "major",
    type: "logic",
    module: "M",
    location: { file: "a.ts", line: 1 },
    phenomenon: "P",
    reproduction_steps: ["1", "2", "3"],
    expected: "E",
    actual: "A",
    root_cause: "R",
    evidence: { diff_hunk: "@@" },
    suggestion: "S",
    confidence: 0.9,
    confidence_reason: "C",
  };
}

describe("scan-report-store", () => {
  test("initAudit creates audit dir + meta.json + empty report.json", () => {
    initAudit("p1", "202604", "slug-a", makeMeta());
    expect(existsSync(join(WS, "p1", "_shared", "archive", "audits", "202604-slug-a", "meta.json"))).toBe(true);
    expect(existsSync(join(WS, "p1", "_shared", "archive", "audits", "202604-slug-a", "report.json"))).toBe(true);
    const r = readReport("p1", "202604", "slug-a");
    expect(r.bugs).toEqual([]);
  });

  test("addBug appends and re-reads", () => {
    initAudit("p1", "202604", "s", makeMeta());
    addBug("p1", "202604", "s", makeBug("b-001"));
    const r = readReport("p1", "202604", "s");
    expect(r.bugs.length).toBe(1);
    expect(r.bugs[0].id).toBe("b-001");
  });

  test("nextBugId returns max+1 even after deletes", () => {
    initAudit("p1", "202604", "s", makeMeta());
    addBug("p1", "202604", "s", makeBug("b-001"));
    addBug("p1", "202604", "s", makeBug("b-002"));
    addBug("p1", "202604", "s", makeBug("b-003"));
    removeBug("p1", "202604", "s", "b-002");
    expect(nextBugId("p1", "202604", "s")).toBe("b-004");
  });

  test("updateBugField supports nested dot paths", () => {
    initAudit("p1", "202604", "s", makeMeta());
    addBug("p1", "202604", "s", makeBug("b-001"));
    updateBugField("p1", "202604", "s", "b-001", "location.line", 999);
    const r = readReport("p1", "202604", "s");
    expect(r.bugs[0].location.line).toBe(999);
  });

  test("updateBugField on top-level field", () => {
    initAudit("p1", "202604", "s", makeMeta());
    addBug("p1", "202604", "s", makeBug("b-001"));
    updateBugField("p1", "202604", "s", "b-001", "title", "new title");
    expect(readReport("p1", "202604", "s").bugs[0].title).toBe("new title");
  });

  test("removeBug deletes by id and is a no-op on missing id", () => {
    initAudit("p1", "202604", "s", makeMeta());
    addBug("p1", "202604", "s", makeBug("b-001"));
    removeBug("p1", "202604", "s", "b-001");
    expect(readReport("p1", "202604", "s").bugs.length).toBe(0);
    // missing id no-throw
    removeBug("p1", "202604", "s", "b-999");
  });

  test("setMeta updates a single field", () => {
    initAudit("p1", "202604", "s", makeMeta());
    setMeta("p1", "202604", "s", "reviewer", "alice");
    expect(readMeta("p1", "202604", "s").reviewer).toBe("alice");
  });

  test("addBug rejects invalid bug (delegates to validator)", () => {
    initAudit("p1", "202604", "s", makeMeta());
    const bad = makeBug("b-001");
    bad.confidence = 0.4;
    expect(() => addBug("p1", "202604", "s", bad)).toThrow(/confidence/);
  });
});
