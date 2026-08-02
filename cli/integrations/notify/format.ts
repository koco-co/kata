import crypto from "node:crypto";
import { basename } from "node:path";
import {
  assertValidNotification,
  EVENT_SCHEMAS,
  type FailedCase,
  type NotificationData,
  type NotificationEventType,
  type NotificationValue,
} from "./schema.ts";

export interface FormattedMessage {
  title: string;
  text: string;
}

export interface NotificationCardRow {
  icon: string;
  label: string;
  value: string | number;
}

export interface NotificationCard {
  status: "success" | "failed" | "waiting" | "warning";
  emoji: "✅" | "❌" | "⏳" | "⚠️";
  title: string;
  subject: string;
  rows: NotificationCardRow[];
  callout?: string;
  details?: string[];
  footer: string;
}

export interface FeishuInteractiveMessage {
  msg_type: "interactive";
  card: {
    schema: "2.0";
    config: { update_multi: true };
    body: {
      direction: "vertical";
      padding: string;
      elements: Array<Record<string, unknown>>;
    };
    header: {
      title: { tag: "plain_text"; content: string };
      template: "green" | "red" | "orange" | "yellow";
      padding: string;
    };
  };
}

export interface EmailCardMessage {
  subject: string;
  text: string;
  html: string;
}

// ─── 卡片构建与渲染 ───

function durationText(value: number): string {
  const seconds = Math.max(0, Math.round(value / 1000));
  if (seconds < 60) return `${seconds} 秒`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes} 分 ${seconds % 60} 秒`;
}

function shortPath(value: string): string {
  return basename(value.replaceAll("\\", "/"));
}

function shortPaths(value: NotificationValue | undefined): string | undefined {
  if (!Array.isArray(value) || value.length === 0) return undefined;
  const names = value.filter((item): item is string => typeof item === "string").map(shortPath);
  return names.length > 0 ? names.join("、") : undefined;
}

function cleanSubject(value: NotificationValue | undefined): string {
  if (typeof value !== "string") return "";
  return value
    .replace(
      /^(?:Bug|Conflict|Scan)\s*分析报告[：:]\s*|^(?:缺陷|冲突|扫描)\s*分析报告[：:]\s*/i,
      "",
    )
    .trim();
}

function conciseSummary(value: NotificationValue | undefined, limit = 80): string | undefined {
  if (typeof value !== "string") return undefined;
  const summary = value
    .split(/\n\s*\n/)[0]
    ?.replace(/\s+/g, " ")
    .trim();
  if (!summary) return undefined;
  return summary.length > limit ? `${summary.slice(0, limit)}…` : summary;
}

function severityLabel(value: NotificationValue | undefined): string | undefined {
  if (typeof value !== "string" || value.trim() === "") return undefined;
  const normalized = value.trim().toLowerCase();
  return `${normalized.charAt(0).toUpperCase()}${normalized.slice(1)}`;
}

function shortCompletedAt(value: NotificationValue | undefined): string {
  if (typeof value !== "string") return "";
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})(?:\s+\S+)?$/);
  return match
    ? `${match[1]}/${match[2]}/${match[3]} ${match[4]}:${match[5]}:${match[6]}`
    : value.replace(/\s+Asia\/Taipei$/, "");
}

function row(
  icon: string,
  label: string,
  value: NotificationValue | string | undefined,
): NotificationCardRow | undefined {
  if (typeof value === "number") return { icon, label, value };
  if (typeof value === "string" && value.trim() !== "") return { icon, label, value: value.trim() };
  return undefined;
}

function compactRows(rows: Array<NotificationCardRow | undefined>): NotificationCardRow[] {
  return rows.filter((item): item is NotificationCardRow => item !== undefined);
}

function statusForEvent(event: NotificationEventType): Pick<NotificationCard, "status" | "emoji"> {
  if (event === "ui-test-failed") return { status: "failed", emoji: "❌" };
  if (event === "ui-test-needs-input") return { status: "waiting", emoji: "⏳" };
  return { status: "success", emoji: "✅" };
}

function isReportEvent(event: NotificationEventType): boolean {
  return [
    "bug-analysis-completed",
    "conflict-analysis-completed",
    "scan-completed",
    "hotfix-report-created",
  ].includes(event);
}

/** Build one channel-neutral notification card from the strict event payload. */
export function buildNotificationCard(
  event: NotificationEventType,
  data: NotificationData,
): NotificationCard {
  assertValidNotification(event, data);
  const status = statusForEvent(event);
  const rows: Array<NotificationCardRow | undefined> = [row("📦", "项目", data.project)];
  if (!isReportEvent(event)) rows.push(row("🏷️", "版本", data.version));
  let callout: string | undefined;
  let details: string[] | undefined;

  if (event === "cases-built") {
    rows.push(
      row("📊", "用例数", data.case_count),
      row("🆕", "新增", data.created_count),
      row("♻️", "更新", data.updated_count),
      row("📄", "产物", shortPaths(data.artifact_paths)),
      row("⏱️", "耗时", durationText(data.duration_ms as number)),
    );
  } else if (event === "cases-imported") {
    rows.push(
      row("📥", "输入格式", data.source_format),
      row(
        "📂",
        "输入文件",
        typeof data.source_path === "string" ? shortPath(data.source_path) : undefined,
      ),
      row("🧩", "需求数", data.feature_count),
      row("📊", "用例数", data.case_count),
      row("📝", "YAML", shortPaths(data.yaml_paths)),
    );
  } else if (event === "ui-test-completed" || event === "ui-test-failed") {
    rows.push(
      row("🆔", "运行", data.run_id),
      row("✅", "通过", data.passed),
      row("❌", "失败", data.failed),
      row("⚠️", "异常", data.broken),
      row("⏭️", "跳过", data.skipped),
      row("⏱️", "耗时", durationText(data.duration_ms as number)),
      row(
        "📊",
        "Allure",
        typeof data.allure_path === "string" ? shortPath(data.allure_path) : undefined,
      ),
    );
    if (event === "ui-test-failed") {
      const failed = data.failed_cases as FailedCase[];
      details = failed
        .slice(0, 3)
        .map(
          (item, index) => `${index + 1}. ${item.title}${item.message ? `：${item.message}` : ""}`,
        );
      if (failed.length > 3) details.push(`另有 ${failed.length - 3} 条，详见 Allure`);
    }
  } else if (event === "ui-test-needs-input") {
    rows.push(row("🆔", "运行", data.run_id), row("🧪", "用例", data.case_title));
    callout = typeof data.question === "string" ? data.question : undefined;
  } else {
    rows.push(
      row("💡", "结论", conciseSummary(data.summary)),
      event === "bug-analysis-completed"
        ? row("🐛", "严重程度", severityLabel(data.severity))
        : undefined,
      row(
        "📄",
        "报告",
        typeof data.report_path === "string" ? shortPath(data.report_path) : undefined,
      ),
    );
  }

  return {
    ...status,
    title: EVENT_SCHEMAS[event].action,
    subject: cleanSubject(data.feature),
    rows: compactRows(rows),
    ...(callout ? { callout } : {}),
    ...(details && details.length > 0 ? { details } : {}),
    footer: `🕐 ${shortCompletedAt(data.completed_at)} · Kata`,
  };
}

function markdownCell(value: string | number): string {
  return String(value).replaceAll("\\", "\\\\").replaceAll("|", "\\|").replace(/\r?\n/g, "<br>");
}

function markdownInline(value: string): string {
  return value.replaceAll("\\", "\\\\").replaceAll("*", "\\*").replace(/\r?\n/g, " ");
}

/** Render the DingTalk/WeCom Markdown card. */
export function renderMarkdownCard(card: NotificationCard): FormattedMessage {
  const title = `${card.emoji} ${card.title}`;
  const lines = [`## ${title}`, "", `> **${markdownInline(card.subject)}**`];
  if (card.callout) lines.push("", `> ${markdownInline(card.callout)}`);
  if (card.rows.length > 0) {
    lines.push("", "| 项目 | 详情 |", "| --- | --- |");
    for (const item of card.rows) {
      lines.push(`| ${item.icon} ${item.label} | ${markdownCell(item.value)} |`);
    }
  }
  if (card.details && card.details.length > 0) {
    lines.push("", "**失败用例**", ...card.details.map((item) => markdownInline(item)));
  }
  lines.push("", "---", "", card.footer);
  return { title, text: lines.join("\n") };
}

function renderPlainTextCard(card: NotificationCard): FormattedMessage {
  const title = `${card.emoji} ${card.title}`;
  const lines = [title, card.subject];
  if (card.callout) lines.push(card.callout);
  for (const item of card.rows) lines.push(`${item.icon} ${item.label}：${item.value}`);
  if (card.details) lines.push(...card.details);
  lines.push(card.footer);
  return { title, text: lines.join("\n") };
}

function htmlEscape(value: string | number): string {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/** Render a multipart email payload with an HTML table and plain-text fallback. */
export function renderEmailCard(card: NotificationCard): EmailCardMessage {
  const plain = renderPlainTextCard(card);
  const rows = card.rows
    .map(
      (item) =>
        `<tr><th style="text-align:left;padding:8px;border:1px solid #ddd">${htmlEscape(`${item.icon} ${item.label}`)}</th><td style="padding:8px;border:1px solid #ddd">${htmlEscape(item.value)}</td></tr>`,
    )
    .join("");
  const details =
    card.details && card.details.length > 0
      ? `<h3>失败用例</h3>${card.details.map((item) => `<p style="margin:8px 0">${htmlEscape(item)}</p>`).join("")}`
      : "";
  return {
    subject: plain.title,
    text: plain.text,
    html: [
      `<h2>${htmlEscape(plain.title)}</h2>`,
      `<blockquote>${htmlEscape(card.subject)}</blockquote>`,
      card.callout ? `<blockquote>${htmlEscape(card.callout)}</blockquote>` : "",
      rows
        ? `<table style="border-collapse:collapse"><thead><tr><th style="text-align:left;padding:8px;border:1px solid #ddd">项目</th><th style="text-align:left;padding:8px;border:1px solid #ddd">详情</th></tr></thead><tbody>${rows}</tbody></table>`
        : "",
      details,
      `<hr><p>${htmlEscape(card.footer)}</p>`,
    ].join(""),
  };
}

/** Render a Feishu custom-bot Interactive Card 2.0 payload. */
export function renderFeishuCard(card: NotificationCard): FeishuInteractiveMessage {
  const summaryLines = card.rows.map(
    (item) => `**${item.icon} ${item.label}**  ${markdownInline(String(item.value))}`,
  );
  const elements: Array<Record<string, unknown>> = [
    {
      tag: "markdown",
      content: `**${markdownInline(card.subject)}**`,
      text_align: "left",
      text_size: "normal_v2",
    },
  ];
  if (card.callout) {
    elements.push({
      tag: "markdown",
      content: `> ${markdownInline(card.callout)}`,
      text_align: "left",
      text_size: "normal_v2",
    });
  }
  if (summaryLines.length > 0) {
    elements.push({
      tag: "markdown",
      content: summaryLines.join("\n"),
      text_align: "left",
      text_size: "normal_v2",
    });
  }
  if (card.details && card.details.length > 0) {
    elements.push({
      tag: "markdown",
      content: `**失败用例**\n${card.details.map(markdownInline).join("\n")}`,
      text_align: "left",
      text_size: "normal_v2",
    });
  }
  elements.push(
    { tag: "hr" },
    { tag: "note", elements: [{ tag: "plain_text", content: card.footer }] },
  );
  const template = {
    success: "green",
    failed: "red",
    waiting: "orange",
    warning: "yellow",
  }[card.status] as FeishuInteractiveMessage["card"]["header"]["template"];
  return {
    msg_type: "interactive",
    card: {
      schema: "2.0",
      config: { update_multi: true },
      body: {
        direction: "vertical",
        padding: "12px 12px 12px 12px",
        elements,
      },
      header: {
        title: { tag: "plain_text", content: `${card.emoji} ${card.title}` },
        template,
        padding: "12px 12px 12px 12px",
      },
    },
  };
}

/** Render the DingTalk/WeCom Markdown representation used by CLI previews. */
export function formatMarkdownMessage(
  event: NotificationEventType,
  data: NotificationData,
): FormattedMessage {
  return renderMarkdownCard(buildNotificationCard(event, data));
}

export function formatTaipeiTime(date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const pick = (type: string) => parts.find((part) => part.type === type)?.value ?? "00";
  return `${pick("year")}-${pick("month")}-${pick("day")} ${pick("hour")}:${pick("minute")}:${pick("second")} Asia/Taipei`;
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value as Record<string, unknown>)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonical((value as Record<string, unknown>)[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

export function digest(value: unknown): string {
  return crypto.createHash("sha256").update(canonical(value)).digest("hex");
}

export function eventIdFor(event: NotificationEventType, data: NotificationData): string {
  const { completed_at: _completedAt, ...identity } = data;
  return `${event}-${digest({ event, data: identity }).slice(0, 20)}`;
}
