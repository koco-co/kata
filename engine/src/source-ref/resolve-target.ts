import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export type SourceRefKind =
  | "prd.file" | "command.output" | "knowledge.entry"
  | "repo.line" | "case.archive" | "workspace.config" | "lanhu.fixture";

export interface ResolveCtx {
  workspaceRoot: string;
  project: string;
  /** absolute feature dir, for prd/lanhu refs that live under inputs/. */
  featureDir?: string;
  /** project names from source-snapshot.json#confirmed_source_repos; repo.line must point at one of these. */
  confirmedRepos?: string[];
}

export interface ResolvedTarget {
  found: boolean;
  content?: string;
  path?: string;
}

export function sourceRefKind(ref: string): SourceRefKind {
  return ref.slice(0, ref.indexOf(":")) as SourceRefKind;
}

/** id between the first ":" and the "#sha256:" suffix. */
function refId(ref: string): string {
  return ref.slice(ref.indexOf(":") + 1, ref.indexOf("#sha256:"));
}

export function resolveSourceRefTarget(ref: string, ctx: ResolveCtx): ResolvedTarget {
  const kind = sourceRefKind(ref);
  const id = refId(ref);
  const read = (p: string): ResolvedTarget =>
    existsSync(p) ? { found: true, content: readFileSync(p, "utf-8"), path: p } : { found: false, path: p };

  switch (kind) {
    case "knowledge.entry": {
      const base = join(ctx.workspaceRoot, ctx.project, "_shared", "knowledge");
      const idNoAnchor = id.split("#")[0];
      return read(join(base, idNoAnchor.endsWith(".md") ? idNoAnchor : `${idNoAnchor}.md`));
    }
    case "repo.line": {
      const filePart = id.replace(/:\d+$/, "");
      const repo = filePart.split("/")[0];
      if (ctx.confirmedRepos && !ctx.confirmedRepos.includes(repo)) return { found: false };
      return read(join(ctx.workspaceRoot, ctx.project, ".kata", "repos", filePart));
    }
    case "case.archive":
      return read(join(ctx.workspaceRoot, ctx.project, "_shared", "archive", id.split(":")[0]));
    case "prd.file":
      if (ctx.featureDir) return read(join(ctx.featureDir, "inputs", id.split(":")[0]));
      return { found: false };
    case "lanhu.fixture": {
      if (!ctx.featureDir) return { found: false };
      const snapPath = join(ctx.featureDir, "source-snapshot.json");
      if (!existsSync(snapPath)) return { found: false, path: snapPath };
      const snap = JSON.parse(readFileSync(snapPath, "utf-8"));
      return snap.lanhu ? { found: true, path: snapPath } : { found: false, path: snapPath };
    }
    default:
      return { found: false };
  }
}
