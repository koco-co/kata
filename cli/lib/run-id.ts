import { mkdirSync } from "node:fs";
import { join } from "node:path";

export const RUN_TYPES = ["preflight", "run", "selfrun", "repair", "baseline"] as const;
export type RunType = (typeof RUN_TYPES)[number];

export const RUN_ID_RE = /^(\d{8})-(\d{4})-(preflight|run|selfrun|repair|baseline)-(\d{2,})$/;

export interface GenerateRunIdOptions {
  type: RunType;
  /**
   * Absolute path to the runs/ directory. When set, the run dir is created
   * exclusively (mkdir, EEXIST retries with the next sequence) so concurrent
   * allocations never share an id. When absent, returns sequence 01 without IO.
   */
  runsDir?: string;
  now?: Date;
}

/** Generate a run ID in the format YYYYMMDD-HHmm-<type>-<seq>; timestamp uses the local timezone. */
export function generateRunId(opts: GenerateRunIdOptions): string {
  const now = opts.now ?? new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const min = String(now.getMinutes()).padStart(2, "0");
  const base = `${yyyy}${mm}${dd}-${hh}${min}-${opts.type}`;

  if (!opts.runsDir) return `${base}-01`;

  // 探测-独占创建：mkdir 成功即占用该序号，EEXIST 则递增，避免扫描目录带来的 TOCTOU 竞态
  mkdirSync(opts.runsDir, { recursive: true });
  for (let seq = 1; ; seq++) {
    const runId = `${base}-${String(seq).padStart(2, "0")}`;
    try {
      mkdirSync(join(opts.runsDir, runId));
      return runId;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "EEXIST") continue;
      throw err;
    }
  }
}

/** Parse the type segment from a run ID; returns null for legacy hex-suffix IDs. */
export function runIdType(runId: string): RunType | null {
  const m = RUN_ID_RE.exec(runId);
  return m ? (m[3] as RunType) : null;
}
