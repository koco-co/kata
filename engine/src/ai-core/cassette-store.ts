import { createHash } from "node:crypto";
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { repoRoot } from "./paths.ts";
import type { AiCoreIssue, AiCoreResult } from "./types.ts";

export type CassetteLock = {
  schema_version: 1;
  generated_at: string;
  files: Array<{
    id: string;
    sha256: string;
    subject_skill: string;
    input_fixture: string;
    recorded_at: string;
  }>;
};

export type CassetteEntry = {
  id: string;
  subject_skill: string;
  input_fixture: string;
  prompt_hash: string;
  output: unknown;
  recorded_at: string;
};

const DEFAULT_CASSETTE_ROOT = ".ai/core/evals/behavioral/cassettes";
const LOCK_FILE = "_lock.json";

export function cassetteHash(
  subjectSkill: string,
  promptText: string,
  fixtureContent: string,
): string {
  return sha256(`${subjectSkill}\n${promptText}\n${fixtureContent}`);
}

export function writeCassette(params: {
  id: string;
  subjectSkill: string;
  inputFixture: string;
  promptText: string;
  output: unknown;
  cassetteRoot?: string;
  root?: string;
}): string {
  const root = params.root ?? repoRoot();
  const cassetteRoot = params.cassetteRoot ?? join(root, DEFAULT_CASSETTE_ROOT);
  const hash = cassetteHash(params.subjectSkill, params.promptText, params.inputFixture);
  const filename = `${hash}.json`;
  const content: Omit<CassetteEntry, "prompt_hash"> & { prompt_hash: string } = {
    id: params.id,
    subject_skill: params.subjectSkill,
    input_fixture: params.inputFixture,
    prompt_hash: hash,
    output: params.output,
    recorded_at: new Date().toISOString(),
  };
  mkdirSync(cassetteRoot, { recursive: true });
  writeFileSync(join(cassetteRoot, filename), `${JSON.stringify(content, null, 2)}\n`, "utf8");
  return hash;
}

export function readCassette(params: {
  id: string;
  subjectSkill: string;
  inputFixture: string;
  promptText: string;
  cassetteRoot?: string;
  root?: string;
}): AiCoreResult<CassetteEntry> {
  const root = params.root ?? repoRoot();
  const cassetteRoot = params.cassetteRoot ?? join(root, DEFAULT_CASSETTE_ROOT);
  const hash = cassetteHash(params.subjectSkill, params.promptText, params.inputFixture);
  const filename = `${hash}.json`;
  let raw: string;
  try {
    raw = readFileSync(join(cassetteRoot, filename), "utf8");
  } catch {
    return {
      ok: false,
      issues: [
        {
          code: "cassette.missing",
          severity: "error",
          message: `Cassette not found for ${params.id}. Run record mode first.`,
          path: join(cassetteRoot, filename),
        },
      ],
    };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {
      ok: false,
      issues: [
        {
          code: "cassette.invalid_json",
          severity: "error",
          message: "Cassette file contains invalid JSON.",
          path: join(cassetteRoot, filename),
        },
      ],
    };
  }
  if (!isCassetteEntry(parsed)) {
    return {
      ok: false,
      issues: [
        {
          code: "cassette.invalid_schema",
          severity: "error",
          message: "Cassette file does not match expected schema.",
          path: join(cassetteRoot, filename),
        },
      ],
    };
  }
  return { ok: true, value: parsed, issues: [] };
}

export function renderCassetteLock(params: { cassetteRoot?: string; root?: string }): CassetteLock {
  const root = params.root ?? repoRoot();
  const cassetteRoot = params.cassetteRoot ?? join(root, DEFAULT_CASSETTE_ROOT);
  const files: CassetteLock["files"] = [];
  try {
    const entries = listCassetteFiles(cassetteRoot);
    for (const entry of entries) {
      const content = readFileSync(join(cassetteRoot, entry.filename));
      files.push({
        id: entry.id,
        sha256: sha256(content),
        subject_skill: entry.subject_skill,
        input_fixture: entry.input_fixture,
        recorded_at: entry.recorded_at,
      });
    }
  } catch {
    // Directory may not exist yet
  }
  return {
    schema_version: 1,
    generated_at: new Date().toISOString(),
    files: files.sort((a, b) => a.id.localeCompare(b.id)),
  };
}

export function checkCassetteLock(params: {
  cassetteRoot?: string;
  root?: string;
  lock: CassetteLock;
}): AiCoreResult<null> {
  const root = params.root ?? repoRoot();
  const cassetteRoot = params.cassetteRoot ?? join(root, DEFAULT_CASSETTE_ROOT);
  const issues: AiCoreIssue[] = [];
  const lockByHash = new Map(params.lock.files.map((f) => [f.sha256, f]));

  const currentFiles = listCassetteFiles(cassetteRoot);
  const currentByHash = new Map<string, CassetteFileEntry>();
  for (const entry of currentFiles) {
    const content = readFileSync(join(cassetteRoot, entry.filename));
    currentByHash.set(sha256(content), entry);
  }

  for (const [hash, lockFile] of lockByHash) {
    if (!currentByHash.has(hash)) {
      issues.push({
        code: "cassette_lock.missing_entry",
        severity: "error",
        message: `Cassette lock entry is missing from disk: ${lockFile.id}`,
        path: join(cassetteRoot, `${hash}.json`),
      });
    }
  }

  for (const [hash] of currentByHash) {
    if (!lockByHash.has(hash)) {
      issues.push({
        code: "cassette_lock.extra_entry",
        severity: "error",
        message: "Cassette on disk not present in lock.",
        path: join(cassetteRoot, `${hash}.json`),
      });
    }
  }

  return { ok: issues.length === 0, value: null, issues };
}

export function writeCassetteLock(params: { cassetteRoot?: string; root?: string }): void {
  const root = params.root ?? repoRoot();
  const cassetteRoot = params.cassetteRoot ?? join(root, DEFAULT_CASSETTE_ROOT);
  mkdirSync(cassetteRoot, { recursive: true });
  writeFileSync(
    join(cassetteRoot, LOCK_FILE),
    `${JSON.stringify(renderCassetteLock(params), null, 2)}\n`,
    "utf8",
  );
}

type CassetteFileEntry = {
  id: string;
  subject_skill: string;
  input_fixture: string;
  recorded_at: string;
  filename: string;
};

function listCassetteFiles(cassetteRoot: string): CassetteFileEntry[] {
  const entries: CassetteFileEntry[] = [];
  let dirents: { name: string }[];
  try {
    dirents = readdirSync(cassetteRoot, { withFileTypes: true }) as unknown as { name: string }[];
  } catch {
    return entries;
  }
  for (const dirent of dirents) {
    if (!dirent.name.endsWith(".json") || dirent.name === LOCK_FILE) continue;
    const filepath = join(cassetteRoot, dirent.name);
    let raw: string;
    try {
      raw = readFileSync(filepath, "utf8");
    } catch {
      continue;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      continue;
    }
    if (isCassetteEntry(parsed)) {
      entries.push({
        id: parsed.id,
        subject_skill: parsed.subject_skill,
        input_fixture: parsed.input_fixture,
        recorded_at: parsed.recorded_at,
        filename: dirent.name,
      });
    }
  }
  return entries;
}

function sha256(content: string | Buffer): string {
  return createHash("sha256").update(content).digest("hex");
}

function isCassetteEntry(value: unknown): value is CassetteEntry {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as Record<string, unknown>).id === "string" &&
    typeof (value as Record<string, unknown>).subject_skill === "string" &&
    typeof (value as Record<string, unknown>).prompt_hash === "string" &&
    (value as Record<string, unknown>).output !== undefined
  );
}
