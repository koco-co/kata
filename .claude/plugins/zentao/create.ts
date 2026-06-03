#!/usr/bin/env bun
/**
 * plugins/zentao/create.ts — 在禅道创建 bug
 * Contract: docs/superpowers/specs/2026-06-03-zentao-bug-create-design.md
 */
import { existsSync, readFileSync } from "node:fs";
import type { Severity } from "@shared/lib/scan-report-types.ts";
import { parse as parseYaml } from "yaml";

// ─── 配置 ─────────────────────────────────────────────────────────────────────

export interface ZentaoConfig {
  product: number;
  branch: number;
  module: number;
  assignee: { account: string; display?: string };
  opened_build: string;
  bug_type: string;
  severity_map: Record<string, number>;
  priority_map?: Record<string, number>;
}

/** Load and validate the zentao create config yaml. */
export function loadZentaoConfig(path: string): ZentaoConfig {
  if (!existsSync(path)) throw new Error(`[zentao-create] 配置文件不存在：${path}`);
  const cfg = parseYaml(readFileSync(path, "utf8")) as Partial<ZentaoConfig>;
  if (!cfg || typeof cfg.product !== "number") {
    throw new Error("[zentao-create] 配置无效：缺少 product");
  }
  if (!cfg.assignee?.account) throw new Error("[zentao-create] 配置无效：缺少 assignee.account");
  if (!cfg.opened_build) throw new Error("[zentao-create] 配置无效：缺少 opened_build");
  return {
    product: cfg.product,
    branch: cfg.branch ?? 0,
    module: cfg.module ?? 0,
    assignee: cfg.assignee,
    opened_build: cfg.opened_build,
    bug_type: cfg.bug_type ?? "codeerror",
    severity_map: cfg.severity_map ?? { critical: 1, major: 2, normal: 3, minor: 4 },
    priority_map: cfg.priority_map,
  };
}

/** Map a BugReport severity to a zentao severity number (default 3). */
export function mapSeverity(config: ZentaoConfig, severity: Severity): number {
  return config.severity_map[severity] ?? 3;
}

/** Map a BugReport priority to a zentao pri number (default 3). */
export function mapPriority(config: ZentaoConfig, priority?: number | string): number {
  if (priority == null) return 3;
  return config.priority_map?.[String(priority)] ?? 3;
}
