/**
 * Business notification delivery.
 *
 * This module deliberately has no public "send arbitrary event" API. Real
 * sends are emitted only by command handlers after their business result is
 * persisted. `kata notify preview` uses the schema/renderer below but never
 * enters the delivery path.
 */

import crypto from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, join, relative, resolve } from "node:path";
import { writeJsonAtomic } from "../lib/atomic-writer.ts";
import { assertNoSymlinkPath } from "../lib/features-layout.ts";
import { loadNotifyConfig, type NotifyPluginConfig } from "../lib/plugin-config.ts";
import { locateProject } from "../lib/workspace-locator.ts";

export const NOTIFICATION_EVENTS = [
  "cases-built",
  "cases-imported",
  "ui-test-completed",
  "ui-test-failed",
  "ui-test-needs-input",
  "bug-analysis-completed",
  "conflict-analysis-completed",
  "scan-completed",
  "hotfix-report-created",
] as const;

export type NotificationEventType = (typeof NOTIFICATION_EVENTS)[number];
export type NotificationValue = string | number | string[] | FailedCase[];
export type NotificationData = Record<string, NotificationValue>;

export interface FailedCase {
  title: string;
  message?: string;
}

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

interface FieldSpec {
  readonly name: string;
  readonly type: "string" | "number" | "string[]" | "failed[]";
  readonly required?: boolean;
}

interface EventSchema {
  readonly action: string;
  readonly fields: readonly FieldSpec[];
}

const CONTEXT: readonly FieldSpec[] = [
  { name: "project", type: "string", required: true },
  { name: "version", type: "string", required: true },
  { name: "feature", type: "string", required: true },
  { name: "completed_at", type: "string", required: true },
];

export const EVENT_SCHEMAS: Record<NotificationEventType, EventSchema> = {
  "cases-built": {
    action: "用例构建完成",
    fields: [
      ...CONTEXT,
      { name: "case_count", type: "number", required: true },
      { name: "created_count", type: "number", required: true },
      { name: "updated_count", type: "number", required: true },
      { name: "artifact_paths", type: "string[]", required: true },
      { name: "duration_ms", type: "number", required: true },
    ],
  },
  "cases-imported": {
    action: "历史用例导入完成",
    fields: [
      ...CONTEXT,
      { name: "source_format", type: "string", required: true },
      { name: "source_path", type: "string", required: true },
      { name: "feature_count", type: "number", required: true },
      { name: "case_count", type: "number", required: true },
      { name: "yaml_paths", type: "string[]", required: true },
    ],
  },
  "ui-test-completed": {
    action: "UI 自动化通过",
    fields: [
      ...CONTEXT,
      { name: "run_id", type: "string", required: true },
      { name: "passed", type: "number", required: true },
      { name: "failed", type: "number", required: true },
      { name: "broken", type: "number", required: true },
      { name: "skipped", type: "number", required: true },
      { name: "duration_ms", type: "number", required: true },
      { name: "allure_path", type: "string", required: true },
    ],
  },
  "ui-test-failed": {
    action: "UI 自动化失败",
    fields: [
      ...CONTEXT,
      { name: "run_id", type: "string", required: true },
      { name: "passed", type: "number", required: true },
      { name: "failed", type: "number", required: true },
      { name: "broken", type: "number", required: true },
      { name: "skipped", type: "number", required: true },
      { name: "duration_ms", type: "number", required: true },
      { name: "allure_path", type: "string", required: true },
      { name: "failed_cases", type: "failed[]", required: true },
    ],
  },
  "ui-test-needs-input": {
    action: "UI 自动化等待确认",
    fields: [
      ...CONTEXT,
      { name: "run_id", type: "string", required: true },
      { name: "case_title", type: "string", required: true },
      { name: "question", type: "string", required: true },
      { name: "pending_record_path", type: "string", required: true },
    ],
  },
  "bug-analysis-completed": {
    action: "缺陷分析完成",
    fields: [
      ...CONTEXT,
      { name: "report_path", type: "string", required: true },
      { name: "severity", type: "string" },
      { name: "summary", type: "string" },
    ],
  },
  "conflict-analysis-completed": {
    action: "冲突分析完成",
    fields: [
      ...CONTEXT,
      { name: "report_path", type: "string", required: true },
      { name: "summary", type: "string" },
    ],
  },
  "scan-completed": {
    action: "代码扫描完成",
    fields: [
      ...CONTEXT,
      { name: "report_path", type: "string", required: true },
      { name: "summary", type: "string" },
    ],
  },
  "hotfix-report-created": {
    action: "Hotfix 回归报告完成",
    fields: [
      ...CONTEXT,
      { name: "report_path", type: "string", required: true },
      { name: "summary", type: "string" },
    ],
  },
};

export interface ValidationResult {
  missingRequired: string[];
  unknownFields: string[];
  typeMismatches: string[];
  invalidPaths: string[];
}

function isNotificationEvent(value: string): value is NotificationEventType {
  return (NOTIFICATION_EVENTS as readonly string[]).includes(value);
}

function isRelativeWorkspacePath(value: string): boolean {
  return (
    Boolean(value) &&
    !value.startsWith("/") &&
    !/^[A-Za-z]:[\\/]/.test(value) &&
    !value.split(/[\\/]/).includes("..")
  );
}

function matchesType(type: FieldSpec["type"], value: unknown): boolean {
  if (type === "string") return typeof value === "string" && value.trim() !== "";
  if (type === "number") return typeof value === "number" && Number.isFinite(value);
  if (type === "string[]")
    return Array.isArray(value) && value.every((item) => typeof item === "string");
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        Boolean(item) &&
        typeof item === "object" &&
        typeof (item as FailedCase).title === "string" &&
        ((item as FailedCase).message === undefined ||
          typeof (item as FailedCase).message === "string"),
    )
  );
}

/** Strictly validate a public preview payload or an internally generated business event. */
export function validateEventData(event: string, data: Record<string, unknown>): ValidationResult {
  if (!isNotificationEvent(event)) {
    return { missingRequired: ["event"], unknownFields: [], typeMismatches: [], invalidPaths: [] };
  }
  const schema = EVENT_SCHEMAS[event];
  const known = new Set(schema.fields.map((field) => field.name));
  const missingRequired = schema.fields
    .filter(
      (field) => field.required && (data[field.name] === undefined || data[field.name] === null),
    )
    .map((field) => field.name);
  const typeMismatches = schema.fields
    .filter((field) => data[field.name] !== undefined && !matchesType(field.type, data[field.name]))
    .map((field) => field.name);
  const invalidPaths: string[] = [];
  for (const [name, value] of Object.entries(data)) {
    if (name.endsWith("_path") && typeof value === "string" && !isRelativeWorkspacePath(value)) {
      invalidPaths.push(name);
    }
    if (
      name.endsWith("_paths") &&
      Array.isArray(value) &&
      value.some((item) => typeof item !== "string" || !isRelativeWorkspacePath(item))
    ) {
      invalidPaths.push(name);
    }
  }
  return {
    missingRequired,
    unknownFields: Object.keys(data).filter((name) => !known.has(name)),
    typeMismatches,
    invalidPaths,
  };
}

export function assertValidNotification(
  event: string,
  data: Record<string, unknown>,
): asserts data is NotificationData {
  const validation = validateEventData(event, data);
  const details = [
    validation.missingRequired.length ? `缺失字段: ${validation.missingRequired.join(", ")}` : "",
    validation.unknownFields.length ? `未知字段: ${validation.unknownFields.join(", ")}` : "",
    validation.typeMismatches.length ? `字段类型错误: ${validation.typeMismatches.join(", ")}` : "",
    validation.invalidPaths.length
      ? `必须是工作区相对路径: ${validation.invalidPaths.join(", ")}`
      : "",
  ].filter(Boolean);
  if (!isNotificationEvent(event) || details.length > 0) {
    throw new Error(`通知事件无效(${event}): ${details.join("；") || "未知事件"}`);
  }
}

export function listAllEvents(): string {
  return NOTIFICATION_EVENTS.map((event) => `${event}  ${EVENT_SCHEMAS[event].action}`).join("\n");
}

export function describeEvent(event: string): string {
  if (!isNotificationEvent(event)) return `未知事件: ${event}`;
  const schema = EVENT_SCHEMAS[event];
  return [
    `事件: ${event}`,
    `动作: ${schema.action}`,
    "字段:",
    ...schema.fields.map(
      (field) => `- ${field.name} (${field.type}${field.required ? ", 必填" : ""})`,
    ),
  ].join("\n");
}

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

function digest(value: unknown): string {
  return crypto.createHash("sha256").update(canonical(value)).digest("hex");
}

export function eventIdFor(event: NotificationEventType, data: NotificationData): string {
  const { completed_at: _completedAt, ...identity } = data;
  return `${event}-${digest({ event, data: identity }).slice(0, 20)}`;
}

export interface DeliveryState {
  status: "sent" | "failed" | "skipped" | "blocked";
  attempts: number;
  updated_at: string;
  error?: string;
}

export interface NotificationLedger {
  schema_version: 1;
  event_id: string;
  event: NotificationEventType;
  idempotency_key: string;
  data: NotificationData;
  created_at: string;
  updated_at: string;
  deliveries: Record<string, DeliveryState>;
}

function stateDir(root: string, project: string): string {
  const projectDir = locateProject(project, root).projectDir;
  const directory = join(projectDir, ".state", "notifications");
  assertNoSymlinkPath(projectDir, directory, "通知账本目录");
  return directory;
}

function ledgerPath(root: string, project: string, eventId: string): string {
  return join(stateDir(root, project), `${eventId}.json`);
}

function readLedger(path: string): NotificationLedger | undefined {
  if (!existsSync(path)) return undefined;
  const value = JSON.parse(readFileSync(path, "utf8")) as NotificationLedger;
  if (value.schema_version !== 1 || !isNotificationEvent(value.event) || !value.event_id) {
    throw new Error(`通知账本损坏: ${path}`);
  }
  return value;
}

function writeLedger(root: string, ledger: NotificationLedger): void {
  const project = String(ledger.data.project);
  const path = ledgerPath(root, project, ledger.event_id);
  const projectDir = locateProject(project, root).projectDir;
  assertNoSymlinkPath(projectDir, path, "通知账本");
  writeJsonAtomic(path, ledger);
}

function configAllows(
  config: NotifyPluginConfig,
  event: NotificationEventType,
): string | undefined {
  if (config.is_enable === false) return "全局通知已关闭";
  if (!config.enabled_events || config.enabled_events.length === 0)
    return "enabled_events 未配置；未发送";
  if (!config.enabled_events.includes(event)) return `事件 ${event} 未在 enabled_events 中启用`;
  return undefined;
}

export type ChannelName = "dingtalk" | "feishu" | "wecom" | "email";
export type NotificationFetch = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

class DeliveryError extends Error {
  constructor(
    message: string,
    readonly retryable: boolean,
  ) {
    super(message);
  }
}

function buildDingtalkUrl(baseUrl: string, signSecret?: string): string {
  if (!signSecret) return baseUrl;
  const timestamp = Date.now();
  const sign = crypto
    .createHmac("sha256", signSecret)
    .update(`${timestamp}\n${signSecret}`)
    .digest("base64");
  const separator = baseUrl.includes("?") ? "&" : "?";
  return `${baseUrl}${separator}timestamp=${timestamp}&sign=${encodeURIComponent(sign)}`;
}

async function postJson(
  fetchImpl: NotificationFetch,
  url: string,
  body: unknown,
): Promise<Response> {
  try {
    const response = await fetchImpl(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) throw new DeliveryError(`HTTP ${response.status}`, response.status >= 500);
    return response;
  } catch (error) {
    if (error instanceof DeliveryError) throw error;
    throw new DeliveryError("网络或超时错误", true);
  }
}

async function deliverDingtalk(
  config: NotifyPluginConfig,
  card: NotificationCard,
  fetchImpl: NotificationFetch,
): Promise<void> {
  const dingtalk = config.dingtalk;
  if (!dingtalk?.webhook_url) throw new DeliveryError("钉钉 webhook 未配置", false);
  const message = renderMarkdownCard(card);
  const response = await postJson(
    fetchImpl,
    buildDingtalkUrl(dingtalk.webhook_url, dingtalk.sign_secret),
    {
      msgtype: "markdown",
      markdown: {
        title: dingtalk.keyword ? `${dingtalk.keyword} ${message.title}` : message.title,
        text: message.text,
      },
    },
  );
  const result = (await response.json().catch(() => ({}))) as { errcode?: number };
  if (result.errcode && result.errcode !== 0)
    throw new DeliveryError(`钉钉业务错误 ${result.errcode}`, false);
}

async function deliverFeishu(
  config: NotifyPluginConfig,
  card: NotificationCard,
  fetchImpl: NotificationFetch,
): Promise<void> {
  const url = config.feishu?.webhook_url;
  if (!url) throw new DeliveryError("飞书 webhook 未配置", false);
  const response = await postJson(fetchImpl, url, renderFeishuCard(card));
  const result = (await response.json().catch(() => ({}))) as { code?: number };
  if (result.code && result.code !== 0)
    throw new DeliveryError(`飞书业务错误 ${result.code}`, false);
}

async function deliverWecom(
  config: NotifyPluginConfig,
  card: NotificationCard,
  fetchImpl: NotificationFetch,
): Promise<void> {
  const url = config.wecom?.webhook_url;
  if (!url) throw new DeliveryError("企微 webhook 未配置", false);
  const message = renderMarkdownCard(card);
  const response = await postJson(fetchImpl, url, {
    msgtype: "markdown",
    markdown: { content: message.text },
  });
  const result = (await response.json().catch(() => ({}))) as { errcode?: number };
  if (result.errcode && result.errcode !== 0)
    throw new DeliveryError(`企微业务错误 ${result.errcode}`, false);
}

async function deliverEmail(config: NotifyPluginConfig, card: NotificationCard): Promise<void> {
  const smtp = config.smtp;
  if (!smtp?.host || !smtp.user || !smtp.pass || !smtp.from || !smtp.to) {
    throw new DeliveryError("SMTP 配置不完整", false);
  }
  try {
    const nodemailer = await import("nodemailer");
    const message = renderEmailCard(card);
    const secure = smtp.secure === true || smtp.secure === "true";
    const transporter = nodemailer.default.createTransport({
      host: smtp.host,
      port: smtp.port ? Number(smtp.port) : 587,
      secure,
      auth: { user: smtp.user, pass: smtp.pass },
    });
    await transporter.sendMail({
      from: smtp.from,
      to: smtp.to,
      subject: `[Kata] ${message.subject}`,
      text: message.text,
      html: message.html,
    });
  } catch {
    throw new DeliveryError("SMTP 网络或投递错误", true);
  }
}

function enabledChannels(config: NotifyPluginConfig): ChannelName[] {
  const result: ChannelName[] = [];
  if (config.dingtalk?.is_enable !== false && config.dingtalk?.webhook_url) result.push("dingtalk");
  if (config.feishu?.is_enable !== false && config.feishu?.webhook_url) result.push("feishu");
  if (config.wecom?.is_enable !== false && config.wecom?.webhook_url) result.push("wecom");
  if (
    config.smtp?.is_enable !== false &&
    config.smtp?.host &&
    config.smtp.user &&
    config.smtp.pass &&
    config.smtp.from &&
    config.smtp.to
  )
    result.push("email");
  return result;
}

async function deliverWithRetry(
  channel: ChannelName,
  config: NotifyPluginConfig,
  card: NotificationCard,
  fetchImpl: NotificationFetch,
): Promise<{ attempts: number; error?: string }> {
  for (let attempts = 1; attempts <= 3; attempts += 1) {
    try {
      if (channel === "dingtalk") await deliverDingtalk(config, card, fetchImpl);
      else if (channel === "feishu") await deliverFeishu(config, card, fetchImpl);
      else if (channel === "wecom") await deliverWecom(config, card, fetchImpl);
      else await deliverEmail(config, card);
      return { attempts };
    } catch (error) {
      const reason =
        error instanceof DeliveryError ? error : new DeliveryError("未知投递错误", false);
      if (!reason.retryable || attempts === 3) return { attempts, error: reason.message };
    }
  }
  return { attempts: 3, error: "未知投递错误" };
}

export interface EmitNotificationOptions {
  root?: string;
  fetchImpl?: NotificationFetch;
  now?: Date;
  /** Retry a durable pending delivery; ordinary business emission is idempotent. */
  retry?: boolean;
}

export interface EmitNotificationResult {
  event_id: string;
  state: "sent" | "partial" | "failed" | "skipped" | "blocked" | "duplicate";
  sent: string[];
  failed: string[];
  reason?: string;
}

/** Persist and synchronously deliver a business-derived event. Never throws for delivery failures. */
export async function emitBusinessNotification(
  event: NotificationEventType,
  data: NotificationData,
  options: EmitNotificationOptions = {},
): Promise<EmitNotificationResult> {
  assertValidNotification(event, data);
  const root = resolve(options.root ?? process.cwd());
  const eventId = eventIdFor(event, data);
  const path = ledgerPath(root, String(data.project), eventId);
  let ledger = readLedger(path);
  if (!ledger) {
    const now = formatTaipeiTime(options.now);
    const { completed_at: _completedAt, ...identity } = data;
    ledger = {
      schema_version: 1,
      event_id: eventId,
      event,
      idempotency_key: digest({ event, data: identity }),
      data,
      created_at: now,
      updated_at: now,
      deliveries: {},
    };
    writeLedger(root, ledger);
  } else if (
    !options.retry &&
    Object.values(ledger.deliveries).some((delivery) => delivery.status === "sent")
  ) {
    return { event_id: eventId, state: "duplicate", sent: [], failed: [] };
  }

  const config = loadNotifyConfig(root);
  const blocked = configAllows(config, event);
  const timestamp = formatTaipeiTime(options.now);
  if (blocked) {
    ledger.deliveries.configuration = {
      status: "blocked",
      attempts: 0,
      error: blocked,
      updated_at: timestamp,
    };
    ledger.updated_at = timestamp;
    writeLedger(root, ledger);
    return { event_id: eventId, state: "blocked", sent: [], failed: [], reason: blocked };
  }

  const channels = enabledChannels(config);
  if (channels.length === 0) {
    const reason = "没有启用且配置完整的通知渠道";
    ledger.deliveries.configuration = {
      status: "skipped",
      attempts: 0,
      error: reason,
      updated_at: timestamp,
    };
    ledger.updated_at = timestamp;
    writeLedger(root, ledger);
    return { event_id: eventId, state: "skipped", sent: [], failed: [], reason };
  }

  const card = buildNotificationCard(event, data);
  const sent: string[] = [];
  const failed: string[] = [];
  for (const channel of channels) {
    const previous = ledger.deliveries[channel];
    if (previous?.status === "sent") continue;
    const outcome = await deliverWithRetry(channel, config, card, options.fetchImpl ?? fetch);
    ledger.deliveries[channel] = {
      status: outcome.error ? "failed" : "sent",
      attempts: (previous?.attempts ?? 0) + outcome.attempts,
      ...(outcome.error ? { error: outcome.error } : {}),
      updated_at: formatTaipeiTime(options.now),
    };
    if (outcome.error) failed.push(channel);
    else sent.push(channel);
    ledger.updated_at = formatTaipeiTime(options.now);
    writeLedger(root, ledger);
  }
  const state = failed.length > 0 ? (sent.length > 0 ? "partial" : "failed") : "sent";
  return { event_id: eventId, state, sent, failed };
}

/**
 * Command handlers use this boundary so a webhook/config/ledger failure never
 * rewrites the outcome of an already completed business operation.
 */
export async function emitBusinessNotificationSafely(
  event: NotificationEventType,
  data: NotificationData,
  options: EmitNotificationOptions = {},
): Promise<EmitNotificationResult> {
  try {
    return await emitBusinessNotification(event, data, options);
  } catch (error) {
    return {
      event_id: eventIdFor(event, data),
      state: "failed",
      sent: [],
      failed: [],
      reason: `通知已阻断: ${error instanceof Error ? error.message : "未知错误"}`,
    };
  }
}

export interface NotificationListItem {
  event_id: string;
  event: NotificationEventType;
  feature: string;
  created_at: string;
  state: string;
}

export function listNotificationLedgers(project: string, root?: string): NotificationListItem[] {
  const dir = stateDir(resolve(root ?? process.cwd()), project);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => name.endsWith(".json"))
    .map((name) => readLedger(join(dir, name)))
    .filter((ledger): ledger is NotificationLedger => Boolean(ledger))
    .map((ledger) => ({
      event_id: ledger.event_id,
      event: ledger.event,
      feature: String(ledger.data.feature),
      created_at: ledger.created_at,
      state: Object.values(ledger.deliveries).some((delivery) => delivery.status === "failed")
        ? "failed"
        : Object.values(ledger.deliveries).some((delivery) => delivery.status === "sent")
          ? "sent"
          : (Object.values(ledger.deliveries)[0]?.status ?? "recorded"),
    }))
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export function showNotificationLedger(
  eventId: string,
  project: string,
  root?: string,
): NotificationLedger {
  const ledger = readLedger(ledgerPath(resolve(root ?? process.cwd()), project, eventId));
  if (!ledger) throw new Error(`通知事件不存在: ${eventId}`);
  return ledger;
}

export async function retryNotification(
  eventId: string,
  project: string,
  options: EmitNotificationOptions = {},
): Promise<EmitNotificationResult> {
  const root = resolve(options.root ?? process.cwd());
  const ledger = showNotificationLedger(eventId, project, root);
  return emitBusinessNotification(ledger.event, ledger.data, { ...options, root, retry: true });
}

/** Safely convert an absolute artifact path to the repository-relative form allowed in messages. */
export function workspaceRelativePath(root: string, path: string): string {
  const result = relative(resolve(root), resolve(path)).split("\\").join("/");
  if (!isRelativeWorkspacePath(result)) throw new Error(`通知路径不在工作区内: ${path}`);
  return result;
}
