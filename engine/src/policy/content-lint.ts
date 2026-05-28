import type { KataIssue, KataResult } from "../result-types.ts";
import { isCanonicalSourceRef } from "../source-ref/resolvers.ts";

function issue(code: string, message: string): KataIssue {
  return {
    code,
    severity: "error",
    message,
    path: "artifact",
  };
}

function isConcreteSourceRef(value: string): boolean {
  const ref = value.trim().replace(/^[["']+|[\]"',]+$/g, "");
  if (ref.length === 0 || /\s/.test(ref)) return false;
  if (/https?:\/\//i.test(ref)) return false;
  return isCanonicalSourceRef(ref);
}

type SourceRefScan = {
  hasValid: boolean;
  hasInvalid: boolean;
};

function addCandidateRefs(scan: SourceRefScan, candidates: string[]): void {
  for (const candidate of candidates) {
    const ref = candidate.trim().replace(/^[["']+|[\]"',]+$/g, "");
    if (ref.length === 0) continue;

    if (isConcreteSourceRef(ref)) {
      scan.hasValid = true;
    } else {
      scan.hasInvalid = true;
    }
  }
}

function scanSourceRefs(content: string): SourceRefScan {
  const scan: SourceRefScan = { hasValid: false, hasInvalid: false };

  for (const line of content.split("\n")) {
    const textRef = line.match(/^\s*SourceRef:\s*(.+?)\s*$/);
    if (textRef?.[1]) addCandidateRefs(scan, textRef[1].split(","));
  }

  const arrayPattern = /["']?(?:source_refs|sourceRefs)["']?\s*:\s*\[([^\]]*)\]/g;
  for (const match of content.matchAll(arrayPattern)) {
    addCandidateRefs(scan, extractCandidateRefs(match[1] ?? ""));
  }

  const yamlListPattern = /(?:source_refs|sourceRefs)\s*:\s*\n((?:\s*-\s*.+\n?)+)/g;
  for (const match of content.matchAll(yamlListPattern)) {
    const candidates = (match[1] ?? "")
      .split("\n")
      .map((line) => line.match(/^\s*-\s*(.+?)\s*$/)?.[1] ?? "")
      .filter(Boolean);
    addCandidateRefs(scan, candidates);
  }

  const objectPattern = /["']?sourceRefs["']?\s*:\s*\{([^}]*)\}/g;
  for (const match of content.matchAll(objectPattern)) {
    addCandidateRefs(scan, extractCandidateRefs(match[1] ?? ""));
  }

  return scan;
}

function extractCandidateRefs(value: string): string[] {
  return value.split(",").map((item) => item.trim());
}

export function lintArtifactContent(content: string): KataResult<null> {
  const issues: KataIssue[] = [];

  const lines = content.split("\n");
  const hasWeakAssertion = lines.some(
    (line) => /\.\s*toBeTruthy\s*\(\s*\)/.test(line) && !/\bexpect\s*\.\s*poll\b/.test(line),
  );
  const hasFilterBoolean = /\.\s*filter\s*\(\s*Boolean\s*\)/.test(content);

  if (hasWeakAssertion || hasFilterBoolean) {
    issues.push(issue("weak_playwright_assertion", "Weak Playwright assertions are blocked."));
  }

  const sourceRefs = scanSourceRefs(content);
  if (sourceRefs.hasInvalid) {
    issues.push(
      issue("invalid_source_ref", "SourceRef evidence must use canonical SourceRef forms."),
    );
  }

  if (!sourceRefs.hasValid) {
    issues.push(issue("missing_source_ref", "Generated artifacts must cite SourceRef evidence."));
  }

  return { ok: issues.length === 0, value: null, issues };
}

export const blockWeakPlaywrightAssertion = lintArtifactContent;
export const requireSourceRefs = lintArtifactContent;
export const weakAssertionScan = lintArtifactContent;
