import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { writeJsonAtomic } from "../atomic-writer.ts";
import type { FeatureRef } from "./types.ts";

export interface HistoryEntry {
  feature_key: string;
  project: string;
  relative_path: string;
  title: string;
  version: string;
  updated_at: string;
}

const HISTORY_LIMIT = 5;

export function historyFilePath(): string {
  return process.env.KATA_HISTORY_FILE ?? join(homedir(), ".config", "kata", "history.json");
}

function isHistoryEntry(value: unknown): value is HistoryEntry {
  if (typeof value !== "object" || value === null) return false;
  const entry = value as Record<string, unknown>;
  return (
    typeof entry.feature_key === "string" &&
    typeof entry.project === "string" &&
    typeof entry.relative_path === "string" &&
    typeof entry.title === "string" &&
    typeof entry.version === "string" &&
    typeof entry.updated_at === "string"
  );
}

export function readHistory(file = historyFilePath()): HistoryEntry[] {
  try {
    const parsed = JSON.parse(readFileSync(file, "utf8")) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isHistoryEntry).slice(0, HISTORY_LIMIT);
  } catch {
    return [];
  }
}

export function recordFeature(feature: FeatureRef, file = historyFilePath()): HistoryEntry[] {
  const next = readHistory(file).filter((entry) => entry.feature_key !== feature.featureKey);
  next.unshift({
    feature_key: feature.featureKey,
    project: feature.project,
    relative_path: feature.relativePath,
    title: feature.title,
    version: feature.version,
    updated_at: new Date().toISOString(),
  });
  const limited = next.slice(0, HISTORY_LIMIT);
  try {
    writeJsonAtomic(file, limited);
  } catch {
    // History 是本机增强记录，写入失败不应阻断 TUI 操作。
  }
  return limited;
}

export function recentHistory(file = historyFilePath()): HistoryEntry[] {
  return readHistory(file);
}
