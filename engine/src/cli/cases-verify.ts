import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  type ConfirmedSourceRepo,
  resolveSourceRefTarget,
} from "@shared/lib/source-ref/resolve-target.ts";
import type { Command } from "commander";
import { extractCaseRecords } from "@shared/lib/cases/case-extract.ts";
import {
  type CaseRecord,
  type CoverageRow,
  type VerifyIssue,
  verifyCoverageHoles,
  verifyL1Structure,
  verifyL2Inputs,
  verifyL3Quality,
  verifyStableCoreArtifacts,
  verifyStructuredSchemas,
} from "@shared/lib/cases/verify-layers.ts";

export interface CasesVerifyContext {
  project: string;
  featureId: string;
  workspaceRoot: string;
  requiredKinds: string[];
}
export interface CasesVerifyResult {
  ok: boolean;
  issues: VerifyIssue[];
}

export async function runCasesVerify(ctx: CasesVerifyContext): Promise<CasesVerifyResult> {
  const dir = join(ctx.workspaceRoot, ctx.project, "features", ctx.featureId);
  const manifestPath = join(dir, "manifest.json");
  if (!existsSync(manifestPath)) {
    return {
      ok: false,
      issues: [{ layer: "L1", rule: "feature_not_found", message: `missing ${manifestPath}` }],
    };
  }
  const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
  const archiveMd = existsSync(join(dir, "archive.md"))
    ? readFileSync(join(dir, "archive.md"), "utf-8")
    : "";

  const issues: VerifyIssue[] = [];
  const status: string = manifest.case_drafting?.status ?? "unknown";
  issues.push(...verifyL1Structure({ manifest, archiveMd, featureDir: dir }));
  issues.push(...verifyStableCoreArtifacts({ featureDir: dir, status }));
  issues.push(...verifyStructuredSchemas({ featureDir: dir, status }));

  const snapshotPath = join(dir, ".process", "source-snapshot.json");
  let confirmedRepos: ConfirmedSourceRepo[] = [];
  if (existsSync(snapshotPath)) {
    const snap = JSON.parse(readFileSync(snapshotPath, "utf-8"));
    confirmedRepos = Array.isArray(snap.confirmed_source_repos) ? snap.confirmed_source_repos : [];
    if (status === "completed" && confirmedRepos.length === 0) {
      issues.push({
        layer: "L2",
        rule: "source_repos_unconfirmed",
        message: "source-snapshot.json 未确认任何源码 triple",
        fix: "在 source-confirm 一轮确认前后端 group/project/branch",
      });
    }
  } else if (status === "completed") {
    issues.push({
      layer: "L2",
      rule: "source-snapshot_missing",
      message: "缺少 source-snapshot.json（输入消费证明依据）",
      fix: "由 source-confirm 步骤生成 source-snapshot.json",
    });
  }

  issues.push(
    ...verifyL2Inputs({
      manifest,
      requiredKinds: ctx.requiredKinds,
      resolve: (ref) =>
        resolveSourceRefTarget(ref, {
          workspaceRoot: ctx.workspaceRoot,
          project: ctx.project,
          featureDir: dir,
          confirmedRepos,
        }),
    }),
  );
  const atomIds: string[] = (manifest.case_drafting?.requirement_atoms ?? []).map(
    (a: { id: string }) => a.id,
  );
  const cases: CaseRecord[] = extractCaseRecords(dir);
  issues.push(...verifyL3Quality({ cases, atomIds }));

  const coveragePath = join(dir, ".process", "coverage-matrix.json");
  if (existsSync(coveragePath)) {
    try {
      const parsed = JSON.parse(readFileSync(coveragePath, "utf-8"));
      const coverageRows: CoverageRow[] = Array.isArray(parsed) ? parsed : [];
      issues.push(...verifyCoverageHoles({ coverageRows, atomIds }));
    } catch {
      // malformed coverage-matrix.json already reported by verifyStructuredSchemas (L1)
    }
  } else if (status === "completed") {
    issues.push({
      layer: "L3",
      rule: "coverage_matrix_missing",
      message: "缺少 coverage-matrix.json（无法判覆盖空洞）",
      fix: "在 coverage-matrix 步骤生成 coverage-matrix.json",
    });
  }

  return { ok: issues.length === 0, issues };
}

export function registerCasesVerify(cases: Command): void {
  cases
    .command("verify")
    .description("三层硬校验门 (schema / 输入消费 / 内容质量)")
    .requiredOption("--project <name>", "项目名")
    .requiredOption("--feature <id>", "feature_id")
    .option(
      "--required-kinds <list>",
      "逗号分隔的必需 source_ref kinds",
      "lanhu.fixture,knowledge.entry,repo.line",
    )
    .option("--exit-code", "exit non-zero on any issue", false)
    .action(
      async (opts: {
        project: string;
        feature: string;
        requiredKinds: string;
        exitCode: boolean;
      }) => {
        // Use process.cwd()-relative path for workspaceRoot since this is a CLI command
        const workspaceRoot = join(process.cwd(), "workspace");
        const r = await runCasesVerify({
          project: opts.project,
          featureId: opts.feature,
          workspaceRoot,
          requiredKinds: opts.requiredKinds.split(",").map((s) => s.trim()),
        });
        for (const i of r.issues)
          console.log(`[${i.layer}] ${i.rule}: ${i.message}${i.fix ? `\n  fix: ${i.fix}` : ""}`);
        console.log(r.ok ? "verify: OK" : `verify: ${r.issues.length} issue(s)`);
        if (opts.exitCode && !r.ok) process.exit(1);
      },
    );
}
