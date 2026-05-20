/**
 * Catalog read layer for the kata console.
 *
 * Wraps the engine facade (kata-engine) for project/feature listing and adds
 * artifact reading + cases.xmind parsing. Read-only: never mutates workspace.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import JSZip from "jszip";
import {
  type FeatureRow,
  listProjects,
  runFeaturesLs,
  runFeaturesShow,
  workspaceDir,
} from "kata-engine";

// Mirrors engine FEATURE_ID_RE (lib/paths.ts) — guards path traversal.
const FEATURE_ID_RE = /^\d{4}-?(?:\d{2}|XX)(?:-[a-z][a-z0-9-]*)+$/;

// Text artifacts safe to expose verbatim. Keep additive; never include globs.
const TEXT_ARTIFACTS = new Set([
  "archive.md",
  "archive.draft.md",
  "metadata.yaml",
  "manifest.json",
  "prd.md",
  "enhanced.md",
  "resolved.md",
  "confirmation-package.md",
  "unresolved-summary.md",
  "source-facts.json",
]);

export interface ProjectSummary {
  readonly name: string;
  readonly featureCount: number;
}

export interface XmindNode {
  readonly title: string;
  readonly markers: readonly string[];
  readonly note: string | null;
  readonly children: readonly XmindNode[];
}

export interface XmindSheet {
  readonly title: string;
  readonly root: XmindNode;
}

export interface ArtifactInfo {
  readonly name: string;
  readonly bytes: number;
}

function assertProject(project: string): void {
  if (!listProjects().includes(project)) {
    throw new Error(`Unknown project: ${project}`);
  }
}

function assertFeatureId(featureId: string): void {
  if (!FEATURE_ID_RE.test(featureId)) {
    throw new Error(`Invalid feature id: ${featureId}`);
  }
}

function featurePath(project: string, featureId: string, ...segments: string[]): string {
  return join(workspaceDir(), project, "features", featureId, ...segments);
}

export function listProjectSummaries(): ProjectSummary[] {
  return listProjects()
    .map((name) => {
      const dir = join(workspaceDir(), name, "features");
      let featureCount = 0;
      if (existsSync(dir)) {
        featureCount = readdirSync(dir).filter((n) => {
          if (n === "INDEX.md") return false;
          return statSync(join(dir, n)).isDirectory();
        }).length;
      }
      return { name, featureCount };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function listFeatures(
  project: string,
  filters: Partial<Omit<Parameters<typeof runFeaturesLs>[0], "project" | "workspaceRoot">> = {},
): Promise<FeatureRow[]> {
  assertProject(project);
  return runFeaturesLs({ project, workspaceRoot: workspaceDir(), ...filters });
}

export async function getFeature(project: string, featureId: string) {
  assertProject(project);
  assertFeatureId(featureId);
  const detail = await runFeaturesShow({ project, featureId, workspaceRoot: workspaceDir() });
  return { ...detail, artifacts: listArtifacts(project, featureId) };
}

export function listArtifacts(project: string, featureId: string): ArtifactInfo[] {
  const dir = featurePath(project, featureId);
  if (!existsSync(dir)) return [];
  const names = ["cases.xmind", ...TEXT_ARTIFACTS];
  return names
    .filter((name) => existsSync(join(dir, name)))
    .map((name) => ({ name, bytes: statSync(join(dir, name)).size }));
}

export function readTextArtifact(project: string, featureId: string, name: string): string {
  assertProject(project);
  assertFeatureId(featureId);
  if (!TEXT_ARTIFACTS.has(name)) {
    throw new Error(`Artifact not allowed: ${name}`);
  }
  const full = featurePath(project, featureId, name);
  // Defense in depth: ensure the resolved path stays inside the feature dir.
  if (!resolve(full).startsWith(resolve(featurePath(project, featureId)))) {
    throw new Error(`Path escape: ${name}`);
  }
  if (!existsSync(full)) {
    throw new Error(`Artifact not found: ${name}`);
  }
  return readFileSync(full, "utf-8");
}

function toXmindNode(topic: Record<string, unknown>): XmindNode {
  const markers = Array.isArray(topic.markers)
    ? (topic.markers as Array<{ markerId?: string }>).map((m) => m.markerId ?? "").filter(Boolean)
    : [];
  const attached = (topic.children as { attached?: unknown[] } | undefined)?.attached ?? [];
  const note =
    typeof topic.notes === "object" && topic.notes !== null
      ? ((topic.notes as { plain?: { content?: string } }).plain?.content ?? null)
      : null;
  return {
    title: typeof topic.title === "string" ? topic.title : "",
    markers,
    note,
    children: attached.map((c) => toXmindNode(c as Record<string, unknown>)),
  };
}

export async function parseXmind(project: string, featureId: string): Promise<XmindSheet[]> {
  assertProject(project);
  assertFeatureId(featureId);
  const full = featurePath(project, featureId, "cases.xmind");
  if (!existsSync(full)) {
    throw new Error("cases.xmind not found");
  }
  const zip = await JSZip.loadAsync(readFileSync(full));
  const entry = zip.file("content.json");
  if (!entry) {
    throw new Error("content.json missing in cases.xmind");
  }
  const sheets = JSON.parse(await entry.async("text")) as Array<{
    title?: string;
    rootTopic: Record<string, unknown>;
  }>;
  return sheets.map((sheet) => ({
    title: typeof sheet.title === "string" ? sheet.title : "",
    root: toXmindNode(sheet.rootTopic),
  }));
}
