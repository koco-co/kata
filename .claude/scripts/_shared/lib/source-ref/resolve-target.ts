import { existsSync, readFileSync } from "node:fs";
import { isAbsolute, join } from "node:path";

export type SourceRefKind =
  | "prd.file"
  | "command.output"
  | "knowledge.entry"
  | "repo.line"
  | "case.archive"
  | "workspace.config"
  | "lanhu.fixture";

export interface ResolveCtx {
  workspaceRoot: string;
  project: string;
  /** absolute feature dir, for prd/lanhu refs that live under inputs/. */
  featureDir?: string;
  /** repos from source-snapshot.json#confirmed_source_repos; repo.line must point at one of these. */
  confirmedRepos?: (string | ConfirmedSourceRepo)[];
}

export interface ResolvedTarget {
  found: boolean;
  content?: string;
  path?: string;
}

export interface ConfirmedSourceRepo {
  group: string;
  project: string;
  branch: string;
  role?: string;
}

export function sourceRefKind(ref: string): SourceRefKind {
  return ref.slice(0, ref.indexOf(":")) as SourceRefKind;
}

/** id between the first ":" and the "#sha256:" suffix. */
function refId(ref: string): string {
  return ref.slice(ref.indexOf(":") + 1, ref.indexOf("#sha256:"));
}

function safeRelativePath(path: string): boolean {
  return path !== "" && !isAbsolute(path) && !path.split(/[\\/]/).includes("..");
}

function confirmedProjectMatch(
  repo: string,
  confirmedRepos?: (string | ConfirmedSourceRepo)[],
): ConfirmedSourceRepo[] {
  if (!confirmedRepos) return [];
  const matches: ConfirmedSourceRepo[] = [];
  for (const r of confirmedRepos) {
    if (typeof r === "string") {
      if (r === repo) matches.push({ group: "", project: r, branch: "" });
      continue;
    }
    if (r.project === repo) matches.push(r);
  }
  return matches;
}

function confirmedTripleMatch(
  target: { group: string; project: string; branch: string },
  confirmedRepos?: (string | ConfirmedSourceRepo)[],
): boolean {
  if (!confirmedRepos) return true;
  return confirmedRepos.some((r) => {
    if (typeof r === "string") return r === target.project;
    return r.group === target.group && r.project === target.project && r.branch === target.branch;
  });
}

export function resolveSourceRefTarget(ref: string, ctx: ResolveCtx): ResolvedTarget {
  const kind = sourceRefKind(ref);
  const id = refId(ref);
  const read = (p: string): ResolvedTarget =>
    existsSync(p)
      ? { found: true, content: readFileSync(p, "utf-8"), path: p }
      : { found: false, path: p };

  switch (kind) {
    case "knowledge.entry": {
      const base = join(ctx.workspaceRoot, ctx.project, "_shared", "knowledge");
      const idNoAnchor = id.split("#")[0];
      return read(join(base, idNoAnchor.endsWith(".md") ? idNoAnchor : `${idNoAnchor}.md`));
    }
    case "repo.line": {
      const scoped = id.match(/^([^/:@]+)\/([^/:@]+)@([^:]+):(.+)$/);
      if (scoped) {
        const [, group, repoProject, branch, rawPath] = scoped;
        const filePath = rawPath.replace(/:\d+$/, "");
        if (!safeRelativePath(filePath)) return { found: false };
        if (!confirmedTripleMatch({ group, project: repoProject, branch }, ctx.confirmedRepos))
          return { found: false };
        return read(
          join(ctx.workspaceRoot, ctx.project, ".kata", "repos", group, repoProject, filePath),
        );
      }

      const filePart = id.replace(/:\d+$/, "");
      if (!safeRelativePath(filePart)) return { found: false };
      const repo = filePart.split("/")[0];
      const matches = confirmedProjectMatch(repo, ctx.confirmedRepos);
      if (ctx.confirmedRepos && matches.length === 0) return { found: false };
      const legacy = read(join(ctx.workspaceRoot, ctx.project, ".kata", "repos", filePart));
      if (legacy.found) return legacy;
      for (const match of matches) {
        if (match.group) {
          const scopedLegacy = read(
            join(ctx.workspaceRoot, ctx.project, ".kata", "repos", match.group, filePart),
          );
          if (scopedLegacy.found) return scopedLegacy;
        }
      }
      return legacy;
    }
    case "case.archive":
      return read(join(ctx.workspaceRoot, ctx.project, "_shared", "archive", id.split(":")[0]));
    case "prd.file":
      if (ctx.featureDir) return read(join(ctx.featureDir, "inputs", id.split(":")[0]));
      return { found: false };
    case "lanhu.fixture": {
      if (!ctx.featureDir) return { found: false };
      const snapPath = join(ctx.featureDir, ".process", "source-snapshot.json");
      if (!existsSync(snapPath)) return { found: false, path: snapPath };
      const snap = JSON.parse(readFileSync(snapPath, "utf-8"));
      return snap.lanhu ? { found: true, path: snapPath } : { found: false, path: snapPath };
    }
    default:
      return { found: false };
  }
}
