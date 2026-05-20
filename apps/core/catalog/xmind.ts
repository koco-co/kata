import { lstatSync, readFileSync } from "node:fs";
import { join } from "node:path";
import JSZip from "jszip";
import { workspaceDir } from "kata-engine";
import { ForbiddenError, InvalidInputError, NotFoundError } from "../errors.ts";
import type { XmindNode, XmindSheet } from "../types.ts";
import { assertFeatureId } from "./guards.ts";

const CHILD_BUCKETS = ["attached", "detached", "floating"] as const;

interface ParsedSheet {
  readonly title?: unknown;
  readonly rootTopic: Record<string, unknown>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
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

function directoryStatus(path: string): "missing" | "safe" | "unsafe" {
  const stat = lstatSync(path, { throwIfNoEntry: false });
  if (stat === undefined) return "missing";
  if (stat.isSymbolicLink() || !stat.isDirectory()) return "unsafe";
  return "safe";
}

function fileStatus(path: string): "missing" | "safe" | "unsafe" {
  const stat = lstatSync(path, { throwIfNoEntry: false });
  if (stat === undefined) return "missing";
  if (stat.isSymbolicLink() || !stat.isFile()) return "unsafe";
  return "safe";
}

function safeFeatureDir(project: string, featureId: string): string {
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

  const featureDir = join(featuresDir, featureId);
  const featureStatus = directoryStatus(featureDir);
  if (featureStatus === "unsafe") throw new ForbiddenError("Feature path not allowed");
  if (featureStatus === "missing") throw new NotFoundError(`Feature not found: ${featureId}`);
  return featureDir;
}

function assertSafeFile(full: string): void {
  const status = fileStatus(full);
  if (status === "missing") {
    throw new NotFoundError("cases.xmind not found");
  }
  if (status === "unsafe") {
    throw new ForbiddenError("cases.xmind not allowed");
  }
}

function markerIds(topic: Record<string, unknown>): string[] {
  if (topic.markers === undefined) return [];
  if (!Array.isArray(topic.markers)) {
    throw new InvalidInputError("Invalid XMind topic markers");
  }
  return topic.markers.flatMap((marker) => {
    if (!isRecord(marker)) {
      throw new InvalidInputError("Invalid XMind marker");
    }
    const markerId = marker.markerId;
    if (markerId === undefined || markerId === "") return [];
    if (typeof markerId !== "string") {
      throw new InvalidInputError("Invalid XMind marker id");
    }
    return [markerId];
  });
}

function noteContent(topic: Record<string, unknown>): string | null {
  if (topic.notes === undefined) return null;
  if (!isRecord(topic.notes)) {
    throw new InvalidInputError("Invalid XMind topic notes");
  }
  const plain = topic.notes.plain;
  if (plain === undefined) return null;
  if (!isRecord(plain)) {
    throw new InvalidInputError("Invalid XMind plain note");
  }
  const content = plain.content;
  if (content === undefined) return null;
  if (typeof content !== "string") {
    throw new InvalidInputError("Invalid XMind note content");
  }
  return content;
}

async function loadXmindZip(full: string): Promise<JSZip> {
  try {
    return await JSZip.loadAsync(readFileSync(full));
  } catch (error) {
    throw new InvalidInputError(
      `Invalid cases.xmind: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

function childTopics(topic: Record<string, unknown>): Record<string, unknown>[] {
  const children = topic.children;
  if (children === undefined) return [];
  if (!isRecord(children)) {
    throw new InvalidInputError("Invalid XMind topic children");
  }
  return CHILD_BUCKETS.flatMap((bucket) => {
    const bucketChildren = children[bucket];
    if (bucketChildren === undefined) return [];
    if (!Array.isArray(bucketChildren)) {
      throw new InvalidInputError(`Invalid XMind ${bucket} children`);
    }
    return bucketChildren.map((child) => {
      if (!isRecord(child)) {
        throw new InvalidInputError("Invalid XMind child topic");
      }
      return child;
    });
  });
}

function toXmindNode(topic: Record<string, unknown>): XmindNode {
  return {
    title: typeof topic.title === "string" ? topic.title : "",
    markers: markerIds(topic),
    note: noteContent(topic),
    children: childTopics(topic).map((child) => toXmindNode(child)),
  };
}

export async function parseXmind(project: string, featureId: string): Promise<XmindSheet[]> {
  assertFeatureId(featureId);
  const dir = safeFeatureDir(project, featureId);
  const full = join(dir, "cases.xmind");
  assertSafeFile(full);
  const zip = await loadXmindZip(full);
  const entry = zip.file("content.json");
  if (!entry) {
    throw new InvalidInputError("content.json missing in cases.xmind");
  }
  let content: unknown;
  try {
    content = JSON.parse(await entry.async("text"));
  } catch (error) {
    throw new InvalidInputError(
      `Invalid content.json: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  if (!Array.isArray(content)) {
    throw new InvalidInputError("Invalid content.json: expected sheet array");
  }
  const sheets: ParsedSheet[] = content.map((sheet) => {
    if (!isRecord(sheet) || !isRecord(sheet.rootTopic)) {
      throw new InvalidInputError("Invalid content.json: sheet missing rootTopic");
    }
    return { title: sheet.title, rootTopic: sheet.rootTopic };
  });
  return sheets.map((sheet) => ({
    title: typeof sheet.title === "string" ? sheet.title : "",
    root: toXmindNode(sheet.rootTopic),
  }));
}
