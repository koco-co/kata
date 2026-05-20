import { lstatSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { FeatureRow, FeaturesLsContext } from "kata-engine";
import { workspaceDir } from "kata-engine";
import { parse } from "yaml";
import { ForbiddenError, InvalidInputError, NotFoundError } from "../errors.ts";
import type { FeatureDetail } from "../types.ts";
import { listArtifacts } from "./artifacts.ts";
import { assertFeatureId, featurePath } from "./guards.ts";

export type FeatureFilters = Partial<
  Pick<
    FeaturesLsContext,
    | "module"
    | "customer"
    | "version"
    | "owner"
    | "createdAfter"
    | "status"
    | "automationStatus"
    | "lastRun"
  >
>;

type DirectoryStatus = "missing" | "safe" | "unsafe";

function directoryStatus(path: string): DirectoryStatus {
  const stat = lstatSync(path, { throwIfNoEntry: false });
  if (stat === undefined) return "missing";
  if (stat.isSymbolicLink() || !stat.isDirectory()) return "unsafe";
  return "safe";
}

function fileStatus(path: string): DirectoryStatus {
  const stat = lstatSync(path, { throwIfNoEntry: false });
  if (stat === undefined) return "missing";
  if (stat.isSymbolicLink() || !stat.isFile()) return "unsafe";
  return "safe";
}

function assertProjectName(project: string): void {
  if (
    project === "" ||
    project.startsWith(".") ||
    project.includes("/") ||
    project.includes("\\")
  ) {
    throw new InvalidInputError(`Unknown project: ${project}`);
  }
}

function safeFeaturesDirForList(project: string): string | null {
  assertProjectName(project);
  const workspace = workspaceDir();
  const workspaceStatus = directoryStatus(workspace);
  if (workspaceStatus !== "safe") {
    throw new InvalidInputError(`Unknown project: ${project}`);
  }

  const projectRoot = join(workspace, project);
  const projectStatus = directoryStatus(projectRoot);
  if (projectStatus === "missing") throw new InvalidInputError(`Unknown project: ${project}`);
  if (projectStatus === "unsafe") return null;

  const featuresDir = join(projectRoot, "features");
  return directoryStatus(featuresDir) === "safe" ? featuresDir : null;
}

function safeFeatureDirForDetail(project: string, featureId: string): string {
  assertProjectName(project);
  const workspace = workspaceDir();
  const workspaceStatus = directoryStatus(workspace);
  if (workspaceStatus !== "safe") {
    throw new InvalidInputError(`Unknown project: ${project}`);
  }

  const projectRoot = join(workspace, project);
  const projectStatus = directoryStatus(projectRoot);
  if (projectStatus === "unsafe") throw new ForbiddenError("Feature path not allowed");
  if (projectStatus === "missing") throw new InvalidInputError(`Unknown project: ${project}`);

  const featuresDir = join(projectRoot, "features");
  const featuresStatus = directoryStatus(featuresDir);
  if (featuresStatus === "unsafe") throw new ForbiddenError("Feature path not allowed");
  if (featuresStatus === "missing") throw new NotFoundError(`Feature not found: ${featureId}`);

  const dir = featurePath(project, featureId);
  const status = directoryStatus(dir);
  if (status === "unsafe") throw new ForbiddenError("Feature path not allowed");
  if (status === "missing") throw new NotFoundError(`Feature not found: ${featureId}`);
  return dir;
}

function readSafeText(path: string, label: string): string {
  const status = fileStatus(path);
  if (status === "unsafe") throw new ForbiddenError(`${label} not allowed`);
  if (status === "missing") throw new NotFoundError(`${label} not found`);
  return readFileSync(path, "utf-8");
}

function readFeatureRow(dir: string): FeatureRow | null {
  const metaPath = join(dir, "metadata.yaml");
  const manifestPath = join(dir, "manifest.json");
  if (fileStatus(metaPath) !== "safe" || fileStatus(manifestPath) !== "safe") return null;

  const meta = parse(readFileSync(metaPath, "utf-8"));
  const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
  return {
    id: meta.id,
    displayName: meta.display_name,
    status: meta.status,
    modules: meta.modules ?? [],
    customers: meta.customers ?? [],
    versions: meta.versions ?? [],
    owners: meta.owners ?? [],
    createdAt: meta.created_at,
    automationStatus: manifest.automation?.status ?? "not-started",
    lastRunStatus: manifest.automation?.last_run_status ?? "not-run",
  };
}

function matchesFilters(row: FeatureRow, filters: FeatureFilters): boolean {
  if (filters.module && !row.modules.includes(filters.module)) return false;
  if (filters.customer && !row.customers.includes(filters.customer)) return false;
  if (filters.version && !row.versions.includes(filters.version)) return false;
  if (filters.owner && !row.owners.includes(filters.owner)) return false;
  if (filters.status && row.status !== filters.status) return false;
  if (filters.automationStatus && row.automationStatus !== filters.automationStatus) return false;
  if (filters.lastRun && row.lastRunStatus !== filters.lastRun) return false;
  if (filters.createdAfter && row.createdAt < filters.createdAfter) return false;
  return true;
}

function safeFilters(filters: FeatureFilters): FeatureFilters {
  return {
    module: filters.module,
    customer: filters.customer,
    version: filters.version,
    owner: filters.owner,
    createdAfter: filters.createdAfter,
    status: filters.status,
    automationStatus: filters.automationStatus,
    lastRun: filters.lastRun,
  };
}

function recentRuns(dir: string): string[] {
  const resultsDir = join(dir, "results");
  const status = directoryStatus(resultsDir);
  if (status === "missing") return [];
  if (status === "unsafe") throw new ForbiddenError("Results path not allowed");
  return readdirSync(resultsDir)
    .filter((name) => directoryStatus(join(resultsDir, name)) === "safe")
    .sort()
    .reverse()
    .slice(0, 5);
}

export async function listFeatures(
  project: string,
  filters: FeatureFilters = {},
): Promise<FeatureRow[]> {
  const featuresDir = safeFeaturesDirForList(project);
  if (featuresDir === null) return [];

  const allowedFilters = safeFilters(filters);
  const rows = readdirSync(featuresDir)
    .map((name) => {
      if (name === "INDEX.md") return null;
      const dir = join(featuresDir, name);
      if (directoryStatus(dir) !== "safe") return null;
      return readFeatureRow(dir);
    })
    .filter((row): row is FeatureRow => row !== null)
    .filter((row) => matchesFilters(row, allowedFilters));
  rows.sort((a, b) => a.id.localeCompare(b.id));
  return rows;
}

export async function getFeature(project: string, featureId: string): Promise<FeatureDetail> {
  assertFeatureId(featureId);
  const dir = safeFeatureDirForDetail(project, featureId);
  const metadata = parse(readSafeText(join(dir, "metadata.yaml"), "Feature metadata"));
  const manifest = JSON.parse(readSafeText(join(dir, "manifest.json"), "Feature manifest"));
  return {
    metadata,
    manifest,
    recentRuns: recentRuns(dir),
    artifacts: listArtifacts(project, featureId),
  };
}
