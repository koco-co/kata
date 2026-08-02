/**
 * Business notification delivery.
 *
 * This module deliberately has no public "send arbitrary event" API. Real
 * sends are emitted only by command handlers after their business result is
 * persisted. `kata notify preview` uses the schema/renderer below but never
 * enters the delivery path.
 *
 * Public surface is re-exported from the concern modules: schema.ts
 * (events/validation), format.ts (card building/rendering), ledger.ts
 * (notification ledger), channels.ts (delivery).
 */

import { relative, resolve } from "node:path";
import { loadNotifyConfig } from "../../lib/plugin-config.ts";
import {
  configAllows,
  deliverWithRetry,
  enabledChannels,
  type NotificationFetch,
} from "./channels.ts";
import { buildNotificationCard, digest, eventIdFor, formatTaipeiTime } from "./format.ts";
import { ledgerPath, readLedger, showNotificationLedger, writeLedger } from "./ledger.ts";
import {
  assertValidNotification,
  isRelativeWorkspacePath,
  type NotificationData,
  type NotificationEventType,
} from "./schema.ts";

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

// ─── 账本操作（持久化在 ledger.ts）───
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

export {
  type ChannelName,
  configAllows,
  enabledChannels,
  type NotificationFetch,
} from "./channels.ts";
export {
  buildNotificationCard,
  type EmailCardMessage,
  eventIdFor,
  type FeishuInteractiveMessage,
  type FormattedMessage,
  formatMarkdownMessage,
  formatTaipeiTime,
  type NotificationCard,
  type NotificationCardRow,
  renderEmailCard,
  renderFeishuCard,
  renderMarkdownCard,
} from "./format.ts";
export {
  type DeliveryState,
  listNotificationLedgers,
  type NotificationLedger,
  type NotificationListItem,
  showNotificationLedger,
} from "./ledger.ts";
// ─── 公共 API（按 concern 汇总再导出）──────────────────────
export {
  assertValidNotification,
  describeEvent,
  EVENT_SCHEMAS,
  type FailedCase,
  isNotificationEvent,
  isRelativeWorkspacePath,
  listAllEvents,
  NOTIFICATION_EVENTS,
  type NotificationData,
  type NotificationEventType,
  type NotificationValue,
  type ValidationResult,
  validateEventData,
} from "./schema.ts";
