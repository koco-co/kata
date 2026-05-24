import { createHash } from "node:crypto";
import type { AiCoreIssue, AiCoreResult } from "../ai-core/types.ts";

const SHA256_PATTERN = /#sha256:([a-f0-9]{64})$/;
const CANONICAL_SOURCE_REF_PATTERN =
  /^(?:(?:prd\.file|command\.output):[A-Za-z0-9][A-Za-z0-9._-]*|(?:knowledge\.entry|case\.archive|workspace\.config|lanhu\.fixture):[A-Za-z0-9][A-Za-z0-9._:-]*|repo\.line:(?!.*:\/\/)[A-Za-z0-9][A-Za-z0-9._:/@-]*)#sha256:[a-f0-9]{64}$/;
const LEGACY_SOURCE_REF_ID_SUFFIX_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const GA_CORE_SOURCE_REF_ID_SUFFIX_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]*$/;
const REPO_LINE_SOURCE_REF_ID_SUFFIX_PATTERN = /^(?!.*:\/\/)[A-Za-z0-9][A-Za-z0-9._:/@-]*$/;

function issue(code: string, message: string, path: string): AiCoreIssue {
  return { code, severity: "error", message, path };
}

function sha256(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

function snapshotRef(input: { id: string; content: string }): string {
  return `${input.id}#sha256:${sha256(input.content)}`;
}

function assertId(prefix: string, id: string, label: string, suffixPattern: RegExp): void {
  const suffix = id.slice(prefix.length + 1);
  if (!id.startsWith(`${prefix}:`) || !suffixPattern.test(suffix)) {
    throw new Error(`Invalid ${label} SourceRef id: ${id}`);
  }
}

export function isCanonicalSourceRef(ref: string): boolean {
  return CANONICAL_SOURCE_REF_PATTERN.test(ref);
}

export function snapshotFileRef(input: { id: string; content: string }): string {
  assertId("prd.file", input.id, "PRD file", LEGACY_SOURCE_REF_ID_SUFFIX_PATTERN);
  return snapshotRef(input);
}

export function snapshotCommandOutputRef(input: { id: string; content: string }): string {
  assertId("command.output", input.id, "command output", LEGACY_SOURCE_REF_ID_SUFFIX_PATTERN);
  return snapshotRef(input);
}

export function snapshotKnowledgeEntryRef(input: { id: string; content: string }): string {
  assertId("knowledge.entry", input.id, "knowledge entry", GA_CORE_SOURCE_REF_ID_SUFFIX_PATTERN);
  return snapshotRef(input);
}

export function snapshotRepoLineRef(input: { id: string; content: string }): string {
  assertId("repo.line", input.id, "repo line", REPO_LINE_SOURCE_REF_ID_SUFFIX_PATTERN);
  return snapshotRef(input);
}

export function snapshotCaseArchiveRef(input: { id: string; content: string }): string {
  assertId("case.archive", input.id, "case archive", GA_CORE_SOURCE_REF_ID_SUFFIX_PATTERN);
  return snapshotRef(input);
}

export function snapshotWorkspaceConfigRef(input: { id: string; content: string }): string {
  assertId("workspace.config", input.id, "workspace config", GA_CORE_SOURCE_REF_ID_SUFFIX_PATTERN);
  return snapshotRef(input);
}

export function snapshotLanhuFixtureRef(input: { id: string; content: string }): string {
  assertId("lanhu.fixture", input.id, "lanhu fixture", GA_CORE_SOURCE_REF_ID_SUFFIX_PATTERN);
  return snapshotRef(input);
}

export function validateSourceRefFreshness(
  ref: unknown,
  currentContent: string,
): AiCoreResult<null> {
  if (typeof ref !== "string") {
    return {
      ok: false,
      issues: [issue("source_ref.invalid_type", "SourceRef must be a string.", "sourceRef")],
    };
  }

  const match = ref.match(SHA256_PATTERN);
  if (!match) {
    return {
      ok: false,
      issues: [
        issue("source_ref.hash_invalid", "SourceRef must end with a sha256 hash.", "sourceRef"),
      ],
    };
  }

  if (!isCanonicalSourceRef(ref)) {
    return {
      ok: false,
      issues: [
        issue(
          "source_ref.scheme_unsupported",
          "SourceRef must use a supported GA-core resolver scheme with a canonical id.",
          "sourceRef",
        ),
      ],
    };
  }

  const actual = sha256(currentContent);
  if (actual !== match[1]) {
    return {
      ok: false,
      issues: [
        issue(
          "source_ref.stale_hash",
          "SourceRef hash does not match current content.",
          "sourceRef",
        ),
      ],
    };
  }

  return { ok: true, value: null, issues: [] };
}
