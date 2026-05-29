import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import type { Command } from "commander";
import { repoRoot } from "@shared/lib/paths.ts";
import { loadFeatureManifestValidator } from "../schemas/loaders.ts";
import { isCanonicalSourceRef } from "../source-ref/resolvers.ts";

export interface CasesValidateIssue {
  rule: string;
  message: string;
  path?: string;
}

export interface CasesValidateContext {
  project: string;
  featureId: string;
  workspaceRoot: string;
  checkSourceRefs: string[];
}

export interface CasesValidateResult {
  ok: boolean;
  issues: CasesValidateIssue[];
}

const SOURCE_REF_PATTERN =
  /\b(?:prd\.file|command\.output|knowledge\.entry|repo\.line|case\.archive|workspace\.config|lanhu\.fixture):[A-Za-z0-9][A-Za-z0-9._:-]*#sha256:[a-f0-9]+\b/g;

const SOURCE_REF_FILES = [
  "manifest.json",
  "enhanced.md",
  "archive.md",
  "archive.draft.md",
  "confirmation-package.md",
  "unresolved-summary.md",
];

function normalizedRequiredSchemes(checkSourceRefs: string[]): string[] {
  return checkSourceRefs.map((item) => item.trim()).filter(Boolean);
}

function collectSourceRefs(featureDir: string): string[] {
  const refs = new Set<string>();
  for (const file of SOURCE_REF_FILES) {
    const path = join(featureDir, file);
    if (!existsSync(path)) continue;
    const text = readFileSync(path, "utf-8");
    for (const match of text.matchAll(SOURCE_REF_PATTERN)) {
      if (isCanonicalSourceRef(match[0])) refs.add(match[0]);
    }
  }
  return [...refs];
}

function isSafePathSegment(value: string): boolean {
  return (
    value.length > 0 &&
    !value.includes("/") &&
    !value.includes("\\") &&
    value !== "." &&
    value !== ".."
  );
}

function firstLine(path: string): string | undefined {
  if (!existsSync(path)) return undefined;
  return readFileSync(path, "utf-8").split(/\r?\n/, 1)[0];
}

function extractLanhuPageId(text: string): string | undefined {
  const match = text.match(/[?&]pageId=([A-Za-z0-9]+)/);
  return match?.[1];
}

function extractLanhuOriginalUrl(text: string): string | undefined {
  const match = text.match(/## 原始 URL\s*\r?\n\s*```(?:text)?\r?\n([^\r\n]+)\r?\n```/);
  return match?.[1].trim();
}

function isLanhuAppUrl(value: string): boolean {
  return /^https:\/\/(?:[A-Za-z0-9-]+\.)?lanhuapp\.com(?:[/:?#]|$)/.test(value);
}

function validateLanhuBlockedDraft(
  featureDir: string,
  manifest: unknown,
  issues: CasesValidateIssue[],
): void {
  const featureId = featureDir.split(/[\\/]/).at(-1) ?? "";
  if (!/^\d{4}-\d{2}-unresolved-lanhu-[a-z0-9]{8}$/.test(featureId)) {
    issues.push({
      rule: "lanhu_feature_id_suffix_invalid",
      message:
        "unresolved Lanhu feature_id suffix must be exactly 8 lowercase alphanumeric characters",
      path: featureDir,
    });
  }

  const requiredFiles = [
    "confirmation-package.md",
    "archive.draft.md",
    "unresolved-summary.md",
    "manifest.json",
  ];
  for (const file of requiredFiles) {
    const path = join(featureDir, file);
    if (!existsSync(path)) {
      issues.push({
        rule: "lanhu_blocked_file_missing",
        message: `${file} is required for unresolved Lanhu blocked draft`,
        path,
      });
    }
  }

  const inputsDir = join(featureDir, "inputs");
  if (existsSync(inputsDir) && statSync(inputsDir).isDirectory()) {
    issues.push({
      rule: "lanhu_blocked_inputs_forbidden",
      message:
        "unresolved Lanhu blocked draft must not create inputs/ or empty snapshot directories",
      path: inputsDir,
    });
  }

  const confirmationPath = join(featureDir, "confirmation-package.md");
  const confirmationText = existsSync(confirmationPath)
    ? readFileSync(confirmationPath, "utf-8")
    : "";
  if (firstLine(confirmationPath) !== "## 原始 URL") {
    issues.push({
      rule: "lanhu_confirmation_header_invalid",
      message: "confirmation-package.md must start with ## 原始 URL",
      path: confirmationPath,
    });
  }
  const originalUrl = extractLanhuOriginalUrl(confirmationText);
  if (!originalUrl) {
    issues.push({
      rule: "lanhu_confirmation_original_url_invalid",
      message: "confirmation-package.md original URL must be a one-line fenced code block",
      path: confirmationPath,
    });
  } else if (!isLanhuAppUrl(originalUrl)) {
    issues.push({
      rule: "lanhu_confirmation_host_invalid",
      message: "confirmation-package.md original URL must be a lanhuapp.com URL",
      path: confirmationPath,
    });
  }
  const pageId = extractLanhuPageId(originalUrl ?? confirmationText);
  const featureSuffix = featureId.match(/^\d{4}-\d{2}-unresolved-lanhu-([a-z0-9]+)$/)?.[1];
  if (!pageId) {
    issues.push({
      rule: "lanhu_confirmation_pageid_missing",
      message:
        "confirmation-package.md original URL must include pageId for unresolved Lanhu blocked drafts",
      path: confirmationPath,
    });
  }
  if (pageId && featureSuffix && featureSuffix !== pageId.slice(0, 8).toLowerCase()) {
    issues.push({
      rule: "lanhu_feature_id_pageid_mismatch",
      message: "unresolved Lanhu feature_id suffix must equal the first 8 characters of pageId",
      path: confirmationPath,
    });
  }

  const unresolvedPath = join(featureDir, "unresolved-summary.md");
  if (firstLine(unresolvedPath) !== "## Blocking / Pending") {
    issues.push({
      rule: "lanhu_unresolved_header_invalid",
      message: "unresolved-summary.md must start with ## Blocking / Pending",
      path: unresolvedPath,
    });
  }

  const archivePath = join(featureDir, "archive.draft.md");
  if (existsSync(archivePath)) {
    const archive = readFileSync(archivePath, "utf-8");
    if (!archive.includes("## 下一步")) {
      issues.push({
        rule: "lanhu_archive_next_step_missing",
        message: "archive.draft.md must contain ## 下一步",
        path: archivePath,
      });
    }
    if (
      /^#.*(?:待确认|Pending|unresolved)/im.test(archive) ||
      /##\s*(?:待确认|Pending Confirmations)/i.test(archive)
    ) {
      issues.push({
        rule: "lanhu_archive_pending_section_forbidden",
        message: "archive.draft.md must not use pending/unresolved titles or sections",
        path: archivePath,
      });
    }
  }

  if (!confirmationText.includes("## SourceRefs")) {
    issues.push({
      rule: "lanhu_confirmation_sourcerefs_missing",
      message: "confirmation-package.md must include ## SourceRefs",
      path: confirmationPath,
    });
  }

  if (manifest && typeof manifest === "object") {
    const data = manifest as {
      case_drafting?: { status?: unknown; archive_path?: unknown; xmind_path?: unknown };
      automation?: { status?: unknown; intents?: unknown; last_run_status?: unknown };
      files?: {
        archive?: unknown;
        xmind?: unknown;
        tests_root?: unknown;
        latest_results?: unknown;
      };
    };
    if (data.case_drafting?.status !== "blocked" || data.automation?.status !== "blocked") {
      issues.push({
        rule: "lanhu_blocked_manifest_status_invalid",
        message: "manifest.json must mark case_drafting.status and automation.status as blocked",
        path: join(featureDir, "manifest.json"),
      });
    }
    if (
      data.case_drafting?.archive_path !== null ||
      data.case_drafting?.xmind_path !== null ||
      data.files?.archive !== null ||
      data.files?.xmind !== null ||
      data.files?.tests_root !== null ||
      data.files?.latest_results !== null
    ) {
      issues.push({
        rule: "lanhu_blocked_manifest_paths_invalid",
        message: "blocked Lanhu manifest must keep archive/xmind/test/result paths null",
        path: join(featureDir, "manifest.json"),
      });
    }
    if (
      !Array.isArray(data.automation?.intents) ||
      data.automation.intents.length !== 0 ||
      data.automation?.last_run_status !== "not-run"
    ) {
      issues.push({
        rule: "lanhu_blocked_manifest_automation_invalid",
        message:
          "blocked Lanhu manifest must have no automation intents and last_run_status not-run",
        path: join(featureDir, "manifest.json"),
      });
    }
  }
}

export async function runCasesValidate(ctx: CasesValidateContext): Promise<CasesValidateResult> {
  if (!isSafePathSegment(ctx.project)) {
    return {
      ok: false,
      issues: [{ rule: "project_invalid", message: `Invalid project: ${ctx.project}` }],
    };
  }
  if (!isSafePathSegment(ctx.featureId)) {
    return {
      ok: false,
      issues: [{ rule: "feature_id_invalid", message: `Invalid featureId: ${ctx.featureId}` }],
    };
  }

  const featureDir = join(ctx.workspaceRoot, ctx.project, "features", ctx.featureId);
  const issues: CasesValidateIssue[] = [];

  if (!existsSync(featureDir)) {
    return {
      ok: false,
      issues: [
        {
          rule: "feature_not_found",
          message: `Feature not found: ${ctx.project}/${ctx.featureId}`,
          path: featureDir,
        },
      ],
    };
  }

  const manifestPath = join(featureDir, "manifest.json");
  let parsedManifest: unknown;
  if (!existsSync(manifestPath)) {
    issues.push({
      rule: "manifest_missing",
      message: "manifest.json not present",
      path: manifestPath,
    });
  } else {
    try {
      parsedManifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
    } catch (error) {
      issues.push({
        rule: "manifest_json_invalid",
        message: error instanceof Error ? error.message : String(error),
        path: manifestPath,
      });
    }
    const validateManifest = loadFeatureManifestValidator();
    if (parsedManifest !== undefined && !validateManifest(parsedManifest)) {
      issues.push({
        rule: "manifest_schema_invalid",
        message: JSON.stringify(validateManifest.errors),
        path: manifestPath,
      });
    } else if (
      parsedManifest !== undefined &&
      typeof parsedManifest === "object" &&
      parsedManifest !== null &&
      (parsedManifest as { feature_id?: unknown }).feature_id !== ctx.featureId
    ) {
      issues.push({
        rule: "manifest_id_mismatch",
        message: `manifest.feature_id="${(parsedManifest as { feature_id?: unknown }).feature_id}" but featureId="${ctx.featureId}"`,
        path: manifestPath,
      });
    }
  }

  if (/^\d{4}-\d{2}-unresolved-lanhu-[a-z0-9]+$/.test(ctx.featureId)) {
    validateLanhuBlockedDraft(featureDir, parsedManifest, issues);
  }

  const refs = collectSourceRefs(featureDir);
  for (const scheme of normalizedRequiredSchemes(ctx.checkSourceRefs)) {
    if (!refs.some((ref) => ref.startsWith(`${scheme}:`))) {
      issues.push({
        rule: "source_ref_missing",
        message: `No ${scheme} SourceRef found in feature artifacts`,
        path: featureDir,
      });
    }
  }

  return { ok: issues.length === 0, issues };
}

export function registerCasesValidate(parent: Command): void {
  parent
    .command("validate <featureId>")
    .description("Validate case-drafting evidence (replaces `discuss validate`)")
    .option("--project <name>", "项目名", "dataAssets")
    .option("--check-source-refs <list>", "Source ref kinds to require", "prd.file,lanhu.fixture")
    .action(async (featureId: string, opts: { project: string; checkSourceRefs: string }) => {
      const workspace = join(repoRoot(), "workspace");
      const result = await runCasesValidate({
        project: opts.project,
        featureId,
        workspaceRoot: workspace,
        checkSourceRefs: opts.checkSourceRefs.split(","),
      });
      process.stdout.write(`${JSON.stringify(result)}\n`);
      if (!result.ok) process.exit(1);
    });
}
