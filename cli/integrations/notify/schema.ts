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

export function isNotificationEvent(value: string): value is NotificationEventType {
  return (NOTIFICATION_EVENTS as readonly string[]).includes(value);
}

export function isRelativeWorkspacePath(value: string): boolean {
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
