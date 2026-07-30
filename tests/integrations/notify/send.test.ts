import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, it } from "node:test";
import {
  emitBusinessNotification,
  eventIdFor,
  formatMessage,
  formatTaipeiTime,
  listNotificationLedgers,
  type NotificationData,
  type NotificationFetch,
  retryNotification,
  showNotificationLedger,
  validateEventData,
} from "../../../cli/integrations/notify.ts";

const repo = resolve(import.meta.dir, "../../..");
const kata = join(repo, "cli", "bin", "kata.ts");

function root(): string {
  const result = mkdtempSync(join(tmpdir(), "kata-notify-"));
  mkdirSync(join(result, "workspace", "dataAssets"), { recursive: true });
  mkdirSync(join(result, "config", "plugin"), { recursive: true });
  return result;
}

function payload(overrides: Partial<NotificationData> = {}): NotificationData {
  return {
    project: "dataAssets",
    version: "v7.0.0",
    feature: "规则 SQL 合并",
    completed_at: "2026-07-30 12:00:00 Asia/Taipei",
    case_count: 2,
    created_count: 1,
    updated_count: 0,
    artifact_paths: ["workspace/dataAssets/features/v7.0.0/f/cases/exports/cases.xmind"],
    duration_ms: 1200,
    ...overrides,
  };
}

function enableDingtalk(at: string): void {
  mkdirSync(join(at, "config", "plugin"), { recursive: true });
  writeFileSync(
    join(at, "config", "plugin", "notify.yaml"),
    "is_enable: true\nenabled_events:\n  - cases-built\ndingtalk:\n  is_enable: true\n  webhook_url: https://example.invalid/robot\n",
  );
}

describe("business notifications", () => {
  it("renders concrete vertical content without tables, placeholders, or absolute paths", () => {
    const message = formatMessage("cases-built", payload());
    assert.equal(message.title, "[dataAssets][v7.0.0][规则 SQL 合并] 用例构建完成");
    assert.match(message.text, /用例数：2/);
    assert.ok(!message.text.includes("|"));
    assert.ok(!message.text.includes("：-"));
    assert.ok(!message.text.includes("/Users/"));
  });

  it("rejects unknown fields, missing required values, and absolute paths before delivery", () => {
    const invalid = validateEventData("cases-built", {
      ...payload({ artifact_paths: ["/Users/poco/secret.xmind"] }),
      unknown: "no",
    });
    assert.deepEqual(invalid.unknownFields, ["unknown"]);
    assert.deepEqual(invalid.invalidPaths, ["artifact_paths"]);
    assert.deepEqual(validateEventData("cases-built", {}).missingRequired.sort(), [
      "artifact_paths",
      "case_count",
      "completed_at",
      "created_count",
      "duration_ms",
      "feature",
      "project",
      "updated_count",
      "version",
    ]);
  });

  it("defaults to no delivery when enabled_events is absent, while retaining an audit ledger", async () => {
    const testRoot = root();
    const result = await emitBusinessNotification("cases-built", payload(), { root: testRoot });
    assert.equal(result.state, "blocked");
    assert.match(result.reason ?? "", /enabled_events/);
    const ledgers = listNotificationLedgers("dataAssets", testRoot);
    assert.equal(ledgers.length, 1);
    assert.equal(ledgers[0]?.state, "blocked");
  });

  it("uses one stable ledger and retries only a failed channel", async () => {
    const testRoot = root();
    enableDingtalk(testRoot);
    let calls = 0;
    const fetchImpl: NotificationFetch = async () => {
      calls += 1;
      return calls === 1
        ? new Response("boom", { status: 500 })
        : new Response('{"errcode":0}', { status: 200 });
    };
    const result = await emitBusinessNotification("cases-built", payload(), {
      root: testRoot,
      fetchImpl,
    });
    assert.equal(result.state, "sent");
    assert.equal(calls, 2, "one transient failure plus one retry");
    const eventId = eventIdFor("cases-built", payload());
    const duplicate = await emitBusinessNotification("cases-built", payload(), {
      root: testRoot,
      fetchImpl,
    });
    assert.equal(duplicate.state, "duplicate");
    assert.equal(calls, 2);
    assert.equal(
      showNotificationLedger(eventId, "dataAssets", testRoot).deliveries.dingtalk?.attempts,
      2,
    );
  });

  it("keeps a failed delivery recoverable through the immutable ledger", async () => {
    const testRoot = root();
    enableDingtalk(testRoot);
    const failingFetch: NotificationFetch = async () => new Response("bad", { status: 400 });
    const failed = await emitBusinessNotification("cases-built", payload(), {
      root: testRoot,
      fetchImpl: failingFetch,
    });
    assert.equal(failed.state, "failed");
    const retried = await retryNotification(failed.event_id, "dataAssets", {
      root: testRoot,
      fetchImpl: async () => new Response('{"errcode":0}', { status: 200 }),
    });
    assert.equal(retried.state, "sent");
    assert.equal(
      showNotificationLedger(failed.event_id, "dataAssets", testRoot).deliveries.dingtalk?.status,
      "sent",
    );
  });

  it("formats timestamp in Asia/Taipei", () => {
    assert.equal(
      formatTaipeiTime(new Date("2026-07-30T04:00:00.000Z")),
      "2026-07-30 12:00:00 Asia/Taipei",
    );
  });
});

describe("notify CLI", () => {
  it("only previews synthetic payloads and removes the legacy sender", () => {
    const data = JSON.stringify(payload());
    const preview = spawnSync(
      "bun",
      [kata, "notify", "preview", "--event", "cases-built", "--data", data],
      {
        cwd: repo,
        encoding: "utf8",
      },
    );
    assert.equal(preview.status, 0, preview.stderr);
    assert.equal(JSON.parse(preview.stdout).preview, true);
    const removed = spawnSync("bun", [kata, "notify", "send", "--event", "cases-built"], {
      cwd: repo,
      encoding: "utf8",
    });
    assert.notEqual(removed.status, 0);
    assert.match(removed.stderr, /已移除/);
    const help = execFileSync("bun", [kata, "notify", "--help"], { cwd: repo, encoding: "utf8" });
    assert.ok(!/^\s+send\b/m.test(help));
  });

  it("does not create a delivery ledger when previewing", () => {
    const before = existsSync(join(repo, "workspace", "dataAssets", ".state", "notifications"));
    const data = JSON.stringify(payload());
    const result = spawnSync(
      "bun",
      [kata, "notify", "preview", "--event", "cases-built", "--data", data],
      {
        cwd: repo,
        encoding: "utf8",
      },
    );
    assert.equal(result.status, 0, result.stderr);
    assert.equal(
      existsSync(join(repo, "workspace", "dataAssets", ".state", "notifications")),
      before,
    );
  });
});
