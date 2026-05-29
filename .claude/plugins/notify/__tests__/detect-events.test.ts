import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { resolve } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { type ChangedFile, matchEvents } from "../detect-events.ts";

const added = (paths: string[]): ChangedFile[] => paths.map((p) => ({ path: p, added: true }));
const modified = (paths: string[]): ChangedFile[] => paths.map((p) => ({ path: p, added: false }));

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const DETECT_TS = resolve(__dirname, "../detect-events.ts");

// ── matchEvents ─────────────────────────────────────────────────────────────

describe("matchEvents", () => {
  it("detects case-generated from xmind files", () => {
    const files = ["workspace/dataAssets/features/202604-data-quality/cases.xmind"];
    const events = matchEvents(added(files));
    assert.equal(events.length, 1);
    assert.equal(events[0].event, "case-generated");
    assert.equal(events[0].data.count, 1);
    assert.ok((events[0].data.file as string).includes("cases.xmind"));
  });

  it("detects multiple xmind files as single event with count", () => {
    const files = [
      "workspace/dataAssets/features/202604-a/cases.xmind",
      "workspace/dataAssets/features/202604-b/cases.xmind",
    ];
    const events = matchEvents(added(files));
    assert.equal(events.length, 1);
    assert.equal(events[0].data.count, 2);
  });

  it("detects bug-file from published-reports/bugs html files", () => {
    const files = ["workspace/dataAssets/_shared/published-reports/bugs/20260407/login-error.html"];
    const events = matchEvents(added(files));
    assert.equal(events.length, 1);
    assert.equal(events[0].event, "bug-file");
    assert.ok((events[0].data.reportFile as string).includes("login-error.html"));
  });

  it("detects conflict-analyzed from published-reports/conflicts html files", () => {
    const files = [
      "workspace/dataAssets/_shared/published-reports/conflicts/20260407/merge-conflict.html",
    ];
    const events = matchEvents(added(files));
    assert.equal(events.length, 1);
    assert.equal(events[0].event, "conflict-analyzed");
    assert.equal(events[0].data.conflictCount, 1);
  });

  it("detects ui-test-completed from published-reports/playwright files", () => {
    const files = ["workspace/dataAssets/_shared/published-reports/playwright/20260407/index.html"];
    const events = matchEvents(added(files));
    assert.equal(events.length, 1);
    assert.equal(events[0].event, "ui-test-completed");
  });

  it("detects archive-converted from archive md files", () => {
    const files = ["workspace/dataAssets/features/202604-data-quality/archive.md"];
    const events = matchEvents(added(files));
    assert.equal(events.length, 1);
    assert.equal(events[0].event, "archive-converted");
    assert.equal(events[0].data.fileCount, 1);
  });

  it("does NOT fire archive-converted for modified-only archive md (only newly added)", () => {
    const files = ["workspace/dataAssets/features/202604-data-quality/archive.md"];
    const events = matchEvents(modified(files));
    assert.equal(
      events.length,
      0,
      "modifying an existing archive md should not trigger notification",
    );
  });

  it("fires archive-converted only for the added subset when mixed", () => {
    const events = matchEvents([
      { path: "workspace/dataAssets/features/202604-new/archive.md", added: true },
      { path: "workspace/dataAssets/features/202604-old/archive.md", added: false },
    ]);
    assert.equal(events.length, 1);
    assert.equal(events[0].event, "archive-converted");
    assert.equal(events[0].data.fileCount, 1, "should only count the newly added file");
  });

  it("ignores non-archive md files (e.g. enhanced.md)", () => {
    const files = ["workspace/dataAssets/features/202604-data-quality/enhanced.md"];
    const events = matchEvents(added(files));
    const archiveEvents = events.filter((e) => e.event === "archive-converted");
    assert.equal(archiveEvents.length, 0);
  });

  it("merges xmind + archive into single case-generated event", () => {
    const files = [
      "workspace/dataAssets/features/202604-feature/cases.xmind",
      "workspace/dataAssets/features/202604-feature/archive.md",
    ];
    const events = matchEvents(added(files));
    assert.equal(events.length, 1);
    assert.equal(events[0].event, "case-generated");
    assert.ok("archiveFile" in events[0].data, "should merge archive info into case-generated");
  });

  it("detects multiple event types from mixed files (xmind+archive merged)", () => {
    const files = [
      "workspace/dataAssets/features/202604-feature/cases.xmind",
      "workspace/dataAssets/_shared/published-reports/bugs/20260407/crash.html",
      "workspace/dataAssets/features/202604-feature/archive.md",
      "README.md", // should be ignored
    ];
    const events = matchEvents(added(files));
    const types = events.map((e) => e.event);
    assert.ok(types.includes("case-generated"));
    assert.ok(types.includes("bug-file"));
    assert.ok(!types.includes("archive-converted"), "archive should be merged into case-generated");
    assert.equal(events.length, 2);
  });

  it("keeps archive-converted when no xmind files present", () => {
    const files = ["workspace/dataAssets/features/202604-standalone/archive.md"];
    const events = matchEvents(added(files));
    assert.equal(events.length, 1);
    assert.equal(events[0].event, "archive-converted");
  });

  it("returns empty array when no patterns match", () => {
    const files = ["README.md", "src/index.ts", ".claude/settings.json"];
    const events = matchEvents(added(files));
    assert.equal(events.length, 0);
  });

  it("returns empty array for empty input", () => {
    const events = matchEvents([]);
    assert.equal(events.length, 0);
  });

  it("ignores non-workspace files", () => {
    const files = ["plugins/notify/send.ts", ".env", "package.json"];
    const events = matchEvents(added(files));
    assert.equal(events.length, 0);
  });
});

// ── CLI Integration ─────────────────────────────────────────────────────────

describe("CLI --dry-run", () => {
  it("--dry-run exits without error", () => {
    // Should not throw even with no git changes
    const result = execSync(`bun run "${DETECT_TS}" --dry-run`, {
      encoding: "utf8",
      cwd: resolve(__dirname, "../../.."),
      stdio: ["pipe", "pipe", "pipe"],
    });
    // Output may be empty (no changes) or JSON — both are valid
    if (result.trim()) {
      const parsed = JSON.parse(result);
      assert.ok(typeof parsed.detected === "number");
    }
  });
});
