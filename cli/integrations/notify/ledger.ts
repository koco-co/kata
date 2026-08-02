import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { writeJsonAtomic } from "../../lib/atomic-writer.ts";
import { assertNoSymlinkPath } from "../../lib/features-layout.ts";
import { locateProject } from "../../lib/workspace-locator.ts";
import {
  isNotificationEvent,
  type NotificationData,
  type NotificationEventType,
} from "./schema.ts";

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

export function stateDir(root: string, project: string): string {
  const projectDir = locateProject(project, root).projectDir;
  const directory = join(projectDir, ".state", "notifications");
  assertNoSymlinkPath(projectDir, directory, "通知账本目录");
  return directory;
}

export function ledgerPath(root: string, project: string, eventId: string): string {
  return join(stateDir(root, project), `${eventId}.json`);
}

export function readLedger(path: string): NotificationLedger | undefined {
  if (!existsSync(path)) return undefined;
  const value = JSON.parse(readFileSync(path, "utf8")) as NotificationLedger;
  if (value.schema_version !== 1 || !isNotificationEvent(value.event) || !value.event_id) {
    throw new Error(`通知账本损坏: ${path}`);
  }
  return value;
}

export function writeLedger(root: string, ledger: NotificationLedger): void {
  const project = String(ledger.data.project);
  const path = ledgerPath(root, project, ledger.event_id);
  const projectDir = locateProject(project, root).projectDir;
  assertNoSymlinkPath(projectDir, path, "通知账本");
  writeJsonAtomic(path, ledger);
}

// ─── 账本查询 ───
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
