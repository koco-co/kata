import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import JSZip from "jszip";
import type { CaseLintReport, CaseLintViolation } from "./types.ts";

const RULE_ID = "case-md-sourceref-leak";
const PRESENTATION_FILES = ["archive.md", "archive.draft.md", "cases.xmind"];

const SOURCE_REF_WORD_RE = /\bSourceRefs?\b/g;
const SR_ID_RE = /\bSR-[A-Z0-9][A-Z0-9-]*\b/g;
const CSV_LOCATOR_RE = /\bcsv::[^\s)"'`<>]+/g;
const CSV_FILENAME_LOCATOR_RE =
  /(?<![:A-Za-z0-9._-])[A-Za-z0-9._-]+\.csv(?:(?:#|:)\s*(?:L|line|row)\s*#?\d+|(?:[ \t]+|[ \t]*[,;][ \t]*)(?:row|line)\s*#?\d+)\b/gi;
const CASE_ARCHIVE_LOCATOR_RE = /\bcase\.archive@1:L\d+(?:-L\d+)?\b/g;
const CANONICAL_SOURCE_REF_RE =
  /\b(?:prd\.file|lanhu\.fixture|knowledge\.entry|repo\.line|case\.archive|workspace\.config|command\.output):[^\s#]+#sha256:[a-fA-F0-9]{64}\b/g;
const PROVENANCE_ROW_LOCATOR_RE =
  /\b(?:evidence|source|provenance|locator|reference|refs?)\b.{0,80}\b(?:CSV\s+)?(?:row|line)\s*#?\d+\b|\b(?:from\s+)?(?:CSV\s+)?(?:row|line)\s*#?\d+\b.{0,80}\b(?:evidence|source|provenance|locator|reference|refs?)\b/gi;
const XMIND_CHILD_ARRAY_KEYS = ["attached", "detached", "floating"];

interface LeakMatch {
  matched: string;
  index: number;
}

function isDirectory(path: string): boolean {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}

function featureDirs(
  workspaceRoot: string,
  projects?: string[],
  scopedFeatureId?: string,
): string[] {
  const projectNames =
    projects ?? readdirSync(workspaceRoot).filter((name) => isDirectory(join(workspaceRoot, name)));
  const dirs: string[] = [];
  for (const project of projectNames) {
    const featuresRoot = join(workspaceRoot, project, "features");
    if (!isDirectory(featuresRoot)) continue;
    const featureIds = scopedFeatureId
      ? [scopedFeatureId]
      : readdirSync(featuresRoot).filter((name) => isDirectory(join(featuresRoot, name)));
    for (const featureId of featureIds) {
      const featureDir = join(featuresRoot, featureId);
      if (isDirectory(featureDir)) dirs.push(featureDir);
    }
  }
  return dirs;
}

function matchesInLine(line: string): LeakMatch[] {
  const matches: LeakMatch[] = [];
  const seen = new Set<string>();
  for (const regex of [
    SOURCE_REF_WORD_RE,
    SR_ID_RE,
    CSV_LOCATOR_RE,
    CSV_FILENAME_LOCATOR_RE,
    CASE_ARCHIVE_LOCATOR_RE,
    CANONICAL_SOURCE_REF_RE,
    PROVENANCE_ROW_LOCATOR_RE,
  ]) {
    regex.lastIndex = 0;
    for (const match of line.matchAll(regex)) {
      const matched = match[0];
      const index = match.index ?? 0;
      const key = `${index}:${matched}`;
      if (seen.has(key)) continue;
      seen.add(key);
      matches.push({ matched, index });
    }
  }
  return matches.sort((a, b) => a.index - b.index);
}

function scanText(file: string, text: string, violations: CaseLintViolation[]): void {
  const lines = text.split("\n");
  for (let index = 0; index < lines.length; index++) {
    for (const match of matchesInLine(lines[index]!)) {
      violations.push({
        rule: RULE_ID,
        file,
        lineNumber: index + 1,
        matched: match.matched,
        severity: "fail",
        message: "Final presentation artifacts must not expose SourceRef provenance locators.",
      });
    }
  }
}

function isReadableText(buffer: Buffer): boolean {
  if (buffer.includes(0)) return false;
  if (buffer.length === 0) return true;
  let controlBytes = 0;
  for (const byte of buffer) {
    if (byte < 0x20 && byte !== 0x09 && byte !== 0x0a && byte !== 0x0d) controlBytes += 1;
  }
  return controlBytes / buffer.length < 0.02;
}

function collectXmindText(value: unknown, out: string[]): void {
  if (Array.isArray(value)) {
    for (const item of value) collectXmindText(item, out);
    return;
  }
  if (!value || typeof value !== "object") return;

  const record = value as Record<string, unknown>;
  if (typeof record.title === "string") out.push(record.title);
  const notes = record.notes as { plain?: { content?: unknown } } | undefined;
  if (typeof notes?.plain?.content === "string") out.push(notes.plain.content);
  const children = record.children as Record<string, unknown> | undefined;
  if (children && typeof children === "object") {
    for (const key of XMIND_CHILD_ARRAY_KEYS) collectXmindText(children[key], out);
  }
  collectXmindText(record.rootTopic, out);
}

async function readPresentationText(file: string): Promise<string | null> {
  if (!file.endsWith(".xmind")) return readFileSync(file, "utf-8");

  const buffer = readFileSync(file);
  try {
    const zip = await JSZip.loadAsync(buffer);
    const contentFile = zip.file("content.json");
    if (!contentFile) return null;
    const contentJson = JSON.parse(await contentFile.async("string")) as unknown;
    const text: string[] = [];
    collectXmindText(contentJson, text);
    return text.join("\n");
  } catch {
    if (!isReadableText(buffer)) return null;
    return buffer.toString("utf-8");
  }
}

function presentationFileNames(featureDir: string): string[] {
  const names = new Set(PRESENTATION_FILES);
  const manifestFile = join(featureDir, "manifest.json");
  if (!existsSync(manifestFile)) return [...names];

  try {
    const manifest = JSON.parse(readFileSync(manifestFile, "utf-8")) as {
      case_drafting?: {
        archive_path?: unknown;
        xmind_path?: unknown;
      };
      files?: {
        archive?: unknown;
        xmind?: unknown;
      };
    };
    for (const value of [
      manifest.case_drafting?.archive_path,
      manifest.case_drafting?.xmind_path,
      manifest.files?.archive,
      manifest.files?.xmind,
    ]) {
      if (typeof value === "string" && value.trim()) names.add(value.trim());
    }
  } catch {
    return [...names];
  }

  return [...names];
}

export async function lintCaseMdSourceRefLeakFeatureDir(
  featureDir: string,
): Promise<CaseLintReport> {
  const violations: CaseLintViolation[] = [];
  let files = 0;
  for (const name of presentationFileNames(featureDir)) {
    const file = join(featureDir, name);
    if (!existsSync(file)) continue;
    files += 1;
    const text = await readPresentationText(file);
    if (text !== null) scanText(file, text, violations);
  }
  return { scanRoot: featureDir, files, violations, passed: violations.length === 0 };
}

export async function lintCaseMdSourceRefLeak(
  workspaceRoot: string,
  projects?: string[],
  scopedFeatureId?: string,
): Promise<CaseLintReport> {
  const violations: CaseLintViolation[] = [];
  let files = 0;
  if (!isDirectory(workspaceRoot)) {
    return { scanRoot: workspaceRoot, files, violations, passed: true };
  }

  for (const featureDir of featureDirs(workspaceRoot, projects, scopedFeatureId)) {
    const report = await lintCaseMdSourceRefLeakFeatureDir(featureDir);
    files += report.files;
    violations.push(...report.violations);
  }

  return { scanRoot: workspaceRoot, files, violations, passed: violations.length === 0 };
}
