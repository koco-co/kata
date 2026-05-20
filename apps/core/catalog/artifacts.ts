import { existsSync, lstatSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { workspaceDir } from "kata-engine";
import { ForbiddenError, NotFoundError } from "../errors.ts";
import type { ArtifactInfo } from "../types.ts";
import {
  assertFeatureId,
  assertInsideFeature,
  assertProject,
  featurePath,
  TEXT_ARTIFACTS,
} from "./guards.ts";

function featureComponents(project: string, featureId: string): string[] {
  const workspace = workspaceDir();
  return [workspace, join(workspace, project), join(workspace, project, "features"), featurePath(project, featureId)];
}

function safeFeatureDir(project: string, featureId: string): string | null {
  let dir: string | null = null;
  for (const component of featureComponents(project, featureId)) {
    dir = component;
    if (!existsSync(component)) return null;
    const stat = lstatSync(component);
    if (stat.isSymbolicLink() || !stat.isDirectory()) return null;
  }
  return dir;
}

function assertSafeFeatureDir(project: string, featureId: string): string | null {
  let dir: string | null = null;
  for (const component of featureComponents(project, featureId)) {
    dir = component;
    if (!existsSync(component)) return null;
    const stat = lstatSync(component);
    if (stat.isSymbolicLink()) {
      throw new ForbiddenError("Feature path not allowed");
    }
    if (!stat.isDirectory()) {
      throw new ForbiddenError("Feature path is not a directory");
    }
  }
  return dir;
}

export function listArtifacts(project: string, featureId: string): ArtifactInfo[] {
  const dir = safeFeatureDir(project, featureId);
  if (dir === null) return [];
  const names = ["cases.xmind", ...TEXT_ARTIFACTS];
  return names
    .map((name) => {
      const full = join(dir, name);
      if (!existsSync(full)) return null;
      const stat = lstatSync(full);
      if (!stat.isFile()) return null;
      return { name, bytes: stat.size };
    })
    .filter((artifact): artifact is ArtifactInfo => artifact !== null);
}

export function readTextArtifact(project: string, featureId: string, name: string): string {
  assertProject(project);
  assertFeatureId(featureId);
  if (!TEXT_ARTIFACTS.has(name)) {
    throw new ForbiddenError(`Artifact not allowed: ${name}`);
  }
  assertSafeFeatureDir(project, featureId);
  const full = featurePath(project, featureId, name);
  assertInsideFeature(project, featureId, full);
  if (!existsSync(full)) {
    throw new NotFoundError(`Artifact not found: ${name}`);
  }
  const stat = lstatSync(full);
  if (stat.isSymbolicLink()) {
    throw new ForbiddenError(`Artifact not allowed: ${name}`);
  }
  if (!stat.isFile()) {
    throw new ForbiddenError(`Artifact is not a file: ${name}`);
  }
  return readFileSync(full, "utf-8");
}
