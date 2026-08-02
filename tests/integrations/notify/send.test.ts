import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, it } from "node:test";
import {
  buildNotificationCard,
  emitBusinessNotification,
  eventIdFor,
  formatMarkdownMessage,
  formatTaipeiTime,
  listNotificationLedgers,
  NOTIFICATION_EVENTS,
  type NotificationData,
  type NotificationFetch,
  renderEmailCard,
  renderFeishuCard,
  retryNotification,
  showNotificationLedger,
  validateEventData,
} from "../../../cli/integrations/notify.ts";

const repo = resolve(import.meta.dir, "../../..");
const kata = join(repo, "cli", "bin", "kata.ts");

function root(): string {
  const result = mkdtempSync(join(tmpdir(), "kata-notify-"));
  mkdirSync(join(result, "workspace", "dataAssets"), { recursive: true });
  mkdirSync(join(result, "config", "private", "integrations"), { recursive: true });
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
  mkdirSync(join(at, "config", "private", "integrations"), { recursive: true });
  writeFileSync(
    join(at, "config", "private", "integrations", "notify.yaml"),
    "is_enable: true\nenabled_events:\n  - cases-built\ndingtalk:\n  is_enable: true\n  webhook_url: https://example.invalid/robot\n",
  );
}

function enableFeishuAndWecom(at: string): void {
  mkdirSync(join(at, "config", "private", "integrations"), { recursive: true });
  writeFileSync(
    join(at, "config", "private", "integrations", "notify.yaml"),
    [
      "is_enable: true",
      "enabled_events:",
      "  - cases-built",
      "feishu:",
      "  is_enable: true",
      "  webhook_url: https://example.invalid/feishu",
      "wecom:",
      "  is_enable: true",
      "  webhook_url: https://example.invalid/wecom",
      "",
    ].join("\n"),
  );
}

describe("business notifications", () => {
  it("builds the shared result-card contract for all nine business events", () => {
    const context = {
      project: "dataAssets",
      version: "v7.0.0",
      feature: "规则 SQL 合并",
      completed_at: "2026-07-30 12:00:00 Asia/Taipei",
    };
    const events: Record<(typeof NOTIFICATION_EVENTS)[number], NotificationData> = {
      "cases-built": payload(),
      "cases-imported": {
        ...context,
        source_format: "xmind",
        source_path: "workspace/dataAssets/imports/source.xmind",
        feature_count: 1,
        case_count: 2,
        yaml_paths: ["workspace/dataAssets/features/v7.0.0/f/cases/cases.yaml"],
      },
      "ui-test-completed": {
        ...context,
        run_id: "run-01",
        passed: 2,
        failed: 0,
        broken: 0,
        skipped: 0,
        duration_ms: 1200,
        allure_path: "workspace/dataAssets/runs/run-01/allure-report/index.html",
      },
      "ui-test-failed": {
        ...context,
        run_id: "run-02",
        passed: 1,
        failed: 1,
        broken: 0,
        skipped: 0,
        duration_ms: 1200,
        allure_path: "workspace/dataAssets/runs/run-02/allure-report/index.html",
        failed_cases: [{ title: "断言失败" }],
      },
      "ui-test-needs-input": {
        ...context,
        run_id: "run-03",
        case_title: "创建规则",
        question: "是否切换数据源？",
        pending_record_path: "workspace/dataAssets/runs/run-03/pending.json",
      },
      "bug-analysis-completed": {
        ...context,
        report_path: "workspace/dataAssets/analyses/bug-report/202607/bug.md",
        severity: "major",
        summary: "缺陷结论",
      },
      "conflict-analysis-completed": {
        ...context,
        report_path: "workspace/dataAssets/analyses/conflict-report/202607/conflict.md",
        summary: "冲突结论",
      },
      "scan-completed": {
        ...context,
        report_path: "workspace/dataAssets/analyses/scan-report/202607/scan.md",
        summary: "扫描结论",
      },
      "hotfix-report-created": {
        ...context,
        report_path: "workspace/dataAssets/analyses/hotfix-case/202607/hotfix.md",
        summary: "回归范围已整理",
      },
    };
    assert.equal(Object.keys(events).length, NOTIFICATION_EVENTS.length);
    for (const event of NOTIFICATION_EVENTS) {
      const card = buildNotificationCard(event, events[event]);
      assert.ok(["✅", "❌", "⏳", "⚠️"].includes(card.emoji));
      assert.match(renderFeishuCard(card).card.header.title.content, /^(✅|❌|⏳|⚠️) /);
      assert.match(renderEmailCard(card).html, /<h2>/);
    }
  });

  it("renders a concise success card with an emoji, Markdown table and short artifact names", () => {
    const message = formatMarkdownMessage("cases-built", payload());
    assert.equal(message.title, "✅ 用例构建完成");
    assert.match(message.text, /^## ✅ 用例构建完成/m);
    assert.match(message.text, /> \*\*规则 SQL 合并\*\*/);
    assert.match(message.text, /\| 项目 \| 详情 \|/);
    assert.match(message.text, /\| 📦 项目 \| dataAssets \|/);
    assert.match(message.text, /\| 🏷️ 版本 \| v7\.0\.0 \|/);
    assert.match(message.text, /\| 📊 用例数 \| 2 \|/);
    assert.match(message.text, /\| 🆕 新增 \| 1 \|/);
    assert.match(message.text, /\| ♻️ 更新 \| 0 \|/);
    assert.match(message.text, /\| 📄 产物 \| cases\.xmind \|/);
    assert.match(message.text, /🕐 2026\/07\/30 12:00:00 · Kata/);
    assert.ok(!message.text.includes("workspace/dataAssets/features"));
    assert.ok(!message.text.includes("Asia/Taipei"));
    assert.ok(!message.text.includes("[dataAssets]"));
  });

  it("omits unavailable rows while preserving meaningful zero values", () => {
    const message = formatMarkdownMessage(
      "cases-built",
      payload({ artifact_paths: [], duration_ms: 0, created_count: 0, updated_count: 0 }),
    );
    assert.ok(!message.text.includes("📄 产物"));
    assert.match(message.text, /\| 🆕 新增 \| 0 \|/);
    assert.match(message.text, /\| ♻️ 更新 \| 0 \|/);
    assert.match(message.text, /\| ⏱️ 耗时 \| 0 秒 \|/);
    assert.ok(!message.text.includes("| - |"));
  });

  it("renders report cards with a short title, severity, conclusion and filename", () => {
    const message = formatMarkdownMessage("bug-analysis-completed", {
      project: "dataAssets",
      version: "202607",
      feature: "Bug 分析报告：非法远端跟踪引用阻断源码仓库更新",
      completed_at: "2026-07-30 21:37:02 Asia/Taipei",
      report_path:
        "workspace/dataAssets/analyses/bug-report/202607/repos-prepare-invalid-remote-refs.md",
      severity: "major",
      summary: "非法远端引用导致 fetch 失败，隔离后源码更新恢复。",
    });
    assert.equal(message.title, "✅ 缺陷分析完成");
    assert.match(message.text, /> \*\*非法远端跟踪引用阻断源码仓库更新\*\*/);
    assert.match(message.text, /\| 🐛 严重程度 \| Major \|/);
    assert.match(
      message.text,
      /\| 💡 结论 \| 非法远端引用导致 fetch 失败，隔离后源码更新恢复。 \|/,
    );
    assert.match(message.text, /\| 📄 报告 \| repos-prepare-invalid-remote-refs\.md \|/);
    assert.ok(!message.text.includes("202607 |"));
    assert.ok(!message.text.includes("workspace/dataAssets/analyses"));
  });

  it("limits report conclusions to 80 characters in cards while retaining full ledger data", () => {
    const summary = "结论".repeat(50);
    const data: NotificationData = {
      project: "dataAssets",
      version: "202607",
      feature: "长结论报告",
      completed_at: "2026-07-30 21:37:02 Asia/Taipei",
      report_path: "workspace/dataAssets/analyses/scan-report/202607/long.md",
      summary,
    };
    const card = buildNotificationCard("scan-completed", data);
    const conclusion = card.rows.find((item) => item.label === "结论")?.value;
    assert.equal(String(conclusion).length, 81);
    assert.equal(data.summary, summary);
  });

  it("shows only the first three failed cases and summarizes the remainder", () => {
    const data: NotificationData = {
      project: "dataAssets",
      version: "v7.0.0",
      feature: "规则 SQL 合并",
      completed_at: "2026-07-30 12:00:00 Asia/Taipei",
      run_id: "run-01",
      passed: 8,
      failed: 4,
      broken: 0,
      skipped: 1,
      duration_ms: 1200,
      allure_path: "workspace/dataAssets/runs/run-01/allure-report/index.html",
      failed_cases: [
        { title: "失败一", message: "断言不一致" },
        { title: "失败二", message: "接口返回 500" },
        { title: "失败三", message: "状态错误" },
        { title: "失败四", message: "超时" },
      ],
    };
    const message = formatMarkdownMessage("ui-test-failed", data);
    const email = renderEmailCard(buildNotificationCard("ui-test-failed", data));
    assert.equal(message.title, "❌ UI 自动化失败");
    assert.match(message.text, /1\. 失败一：断言不一致/);
    assert.match(message.text, /3\. 失败三：状态错误/);
    assert.ok(!message.text.includes("失败四：超时"));
    assert.match(message.text, /另有 1 条，详见 Allure/);
    assert.ok(!email.html.includes("<ol>"));
    assert.match(email.html, />1\. 失败一：断言不一致</);
  });

  it("highlights the full pending question without exposing the internal record path", () => {
    const question = "目标环境缺少可写 Schema，是否切换到备用数据源？";
    const message = formatMarkdownMessage("ui-test-needs-input", {
      project: "dataAssets",
      version: "v7.0.0",
      feature: "规则 SQL 合并",
      completed_at: "2026-07-30 12:00:00 Asia/Taipei",
      run_id: "run-01",
      case_title: "创建质量规则",
      question,
      pending_record_path: "workspace/dataAssets/runs/run-01/pending.json",
    });
    assert.equal(message.title, "⏳ UI 自动化等待确认");
    assert.match(message.text, new RegExp(`> ${question}`));
    assert.ok(!message.text.includes("pending.json"));
  });

  it("renders Feishu interactive cards and HTML email tables from the same card model", () => {
    const card = buildNotificationCard("cases-built", payload());
    const feishu = renderFeishuCard(card);
    const email = renderEmailCard(card);
    assert.equal(feishu.msg_type, "interactive");
    assert.equal(feishu.card.header.title.content, "✅ 用例构建完成");
    assert.ok(Array.isArray(feishu.card.body.elements));
    assert.match(email.html, /<table/);
    assert.match(email.html, /规则 SQL 合并/);
    assert.match(email.text, /用例数：2/);
  });

  it("delivers Feishu as an interactive card and WeCom as Markdown table content", async () => {
    const testRoot = root();
    enableFeishuAndWecom(testRoot);
    const requests: Array<{ url: string; body: Record<string, unknown> }> = [];
    const fetchImpl: NotificationFetch = async (input, init) => {
      requests.push({
        url: String(input),
        body: JSON.parse(String(init?.body)) as Record<string, unknown>,
      });
      return new Response('{"code":0,"errcode":0}', { status: 200 });
    };
    const result = await emitBusinessNotification("cases-built", payload(), {
      root: testRoot,
      fetchImpl,
    });
    assert.equal(result.state, "sent");
    const feishu = requests.find((request) => request.url.endsWith("/feishu"));
    const wecom = requests.find((request) => request.url.endsWith("/wecom"));
    assert.equal(feishu?.body.msg_type, "interactive");
    assert.equal(wecom?.body.msgtype, "markdown");
    assert.match(
      String((wecom?.body.markdown as { content?: string } | undefined)?.content),
      /\| 项目 \| 详情 \|/,
    );
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

  it("keeps the idempotency key stable when only the completion timestamp changes", () => {
    const first = eventIdFor("cases-built", payload());
    const later = eventIdFor(
      "cases-built",
      payload({ completed_at: "2026-07-30 12:05:00 Asia/Taipei" }),
    );
    assert.equal(later, first);
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
  it("only previews synthetic payloads and does not register a sender", () => {
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
    assert.match(removed.stderr, /unknown command.*send/i);
    assert.doesNotMatch(removed.stderr, /已移除/);
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
