import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
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
import { readFeatureMeta } from "@shared/lib/features/feature-meta.ts";
import {
  type ConfirmedSourceRepo,
  resolveSourceRefTarget,
} from "@shared/lib/source-ref/resolve-target.ts";
import type { Command } from "commander";

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

  // 优先读 metadata.yaml（@2）；@1 回退读 manifest.json
  const meta = readFeatureMeta(dir);
  if (!meta) {
    // @1 legacy：尝试 manifest.json
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
    return { ok: issues.length === 0, issues };
  }

  const issues: VerifyIssue[] = [];
  const status: string =
    ((meta.case_drafting as Record<string, unknown> | undefined)?.status as string) ?? "unknown";

  // @2 不依赖 manifest.json，跳过 manifest schema 校验；只做 archive leak 检测
  const casesArchivePath = existsSync(join(dir, "cases", "archive.md"))
    ? join(dir, "cases", "archive.md")
    : join(dir, "archive.md");
  const archiveMd = existsSync(casesArchivePath) ? readFileSync(casesArchivePath, "utf-8") : "";

  // @2: 只做 sourceref_leak 检查（跳过 manifest schema 校验）
  issues.push(...verifyL1Structure({ manifest: null, archiveMd, featureDir: dir }));
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

  // 用 meta 作为类 manifest 参数传给 verifyL2Inputs
  const manifestLike = {
    case_drafting: meta.case_drafting as Record<string, unknown> & {
      requirement_atoms?: { id: string; source_ref: string }[];
    },
  };
  issues.push(
    ...verifyL2Inputs({
      manifest: manifestLike,
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
  const atomIds: string[] = (
    ((meta.case_drafting as Record<string, unknown> | undefined)?.requirement_atoms as Array<{
      id: string;
    }>) ?? []
  ).map((a) => a.id);
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
