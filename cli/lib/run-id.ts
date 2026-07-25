import { existsSync, readdirSync } from "node:fs";

export const RUN_TYPES = ["preflight", "run", "selfrun", "repair", "baseline"] as const;
export type RunType = (typeof RUN_TYPES)[number];

export const RUN_ID_RE = /^(\d{8})-(\d{4})-(preflight|run|selfrun|repair|baseline)-(\d{2})$/;

export interface GenerateRunIdOptions {
  type: RunType;
  /** Absolute path to the runs/ directory; used to derive the per-day per-type sequence number. Defaults to 01 when absent. */
  runsDir?: string;
  now?: Date;
}

/** Generate a run ID in the format YYYYMMDD-HHmm-<type>-<seq>; sequence counts same-day same-type entries in runsDir. */
export function generateRunId(opts: GenerateRunIdOptions): string {
  const now = opts.now ?? new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(now.getUTCDate()).padStart(2, "0");
  const hh = String(now.getUTCHours()).padStart(2, "0");
  const min = String(now.getUTCMinutes()).padStart(2, "0");
  const day = `${yyyy}${mm}${dd}`;

  // 扫描 runsDir，统计当日同 type 的已有条目数，序号从 01 起
  let seq = 1;
  if (opts.runsDir && existsSync(opts.runsDir)) {
    seq += readdirSync(opts.runsDir).filter((n) => {
      const m = RUN_ID_RE.exec(n);
      return m !== null && m[1] === day && m[3] === opts.type;
    }).length;
  }
  return `${day}-${hh}${min}-${opts.type}-${String(seq).padStart(2, "0")}`;
}

/** Parse the type segment from a run ID; returns null for legacy hex-suffix IDs. */
export function runIdType(runId: string): RunType | null {
  const m = RUN_ID_RE.exec(runId);
  return m ? (m[3] as RunType) : null;
}
