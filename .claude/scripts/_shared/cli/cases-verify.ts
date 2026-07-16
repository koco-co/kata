import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { extractCaseRecords, readCaseEvidenceMap } from "@shared/lib/cases/case-extract.ts";
import {
  type CaseRecord,
  type CoverageRow,
  type VerifyIssue,
  verifyCaseEvidenceMap,
  verifyCoverageHoles,
  verifyL1Structure,
  verifyL2Inputs,
  verifyL3Quality,
  verifyStableCoreArtifacts,
  verifyStructuredSchemas,
} from "@shared/lib/cases/verify-layers.ts";
import { isV2, readFeatureMeta } from "@shared/lib/features/feature-meta.ts";
import { workspaceDir } from "@shared/lib/paths.ts";
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

  // 读 metadata.yaml；按 schema 字段分流（不按 meta==null 分流）
  const meta = readFeatureMeta(dir);

  if (!isV2(meta)) {
    // @1（metadata.yaml schema=FeatureMetadata@1）或 metadata.yaml 完全缺失：走 manifest.json 路径
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

  // @2（metadata.yaml schema=FeatureMetadata@2）：从 metadata.yaml 三段读，不依赖 manifest.json
  const issues: VerifyIssue[] = [];
  const status: string =
    ((meta.case_drafting as Record<string, unknown> | undefined)?.status as string) ?? "unknown";

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
  let snapshotRequiredKinds: string[] = [];
  if (existsSync(snapshotPath)) {
    try {
      const snap = JSON.parse(readFileSync(snapshotPath, "utf-8"));
      confirmedRepos = Array.isArray(snap.confirmed_source_repos)
        ? snap.confirmed_source_repos
        : [];
      snapshotRequiredKinds = Array.isArray(snap.required_source_kinds)
        ? snap.required_source_kinds
        : [];
    } catch {
      // parse/schema failure is already reported by verifyStructuredSchemas
    }
  } else if (status === "completed") {
    issues.push({
      layer: "L2",
      rule: "source-snapshot_missing",
      message: "缺少 source-snapshot.json（输入消费证明依据）",
      fix: "由 source-confirm 步骤生成 source-snapshot.json",
    });
  }

  const requiredKinds = ctx.requiredKinds.length > 0 ? ctx.requiredKinds : snapshotRequiredKinds;
  if (
    status === "completed" &&
    requiredKinds.includes("repo.line") &&
    confirmedRepos.length === 0
  ) {
    issues.push({
      layer: "L2",
      rule: "source_repos_unconfirmed",
      message: "source policy 要求 repo.line，但 source-snapshot.json 未确认源码 triple",
      fix: "在 source-intake 确认前后端 group/project/branch，或修正 required_source_kinds",
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
      requiredKinds,
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

  const coveragePath = join(dir, ".process", "coverage-matrix.json");
  const hasCoverageMatrix = existsSync(coveragePath);
  let coverageRows: CoverageRow[] = [];
  if (hasCoverageMatrix) {
    try {
      const parsed = JSON.parse(readFileSync(coveragePath, "utf-8"));
      coverageRows = Array.isArray(parsed) ? parsed : [];
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

  issues.push(
    ...verifyCaseEvidenceMap({
      cases,
      evidenceRows: readCaseEvidenceMap(dir),
      atomIds,
      coverageRows,
    }),
  );
  issues.push(...verifyL3Quality({ cases, atomIds }));
  if (hasCoverageMatrix) issues.push(...verifyCoverageHoles({ coverageRows, atomIds }));

  return { ok: issues.length === 0, issues };
}

export function registerCasesVerify(cases: Command): void {
  cases
    .command("verify")
    .description("依次校验数据结构、输入消费与内容质量")
    .requiredOption("--project <name>", "项目名")
    .requiredOption("--feature <id>", "需求功能 ID")
    .option(
      "--required-kinds <list>",
      "覆盖 source-snapshot required_source_kinds；留空时按快照动态校验",
      "",
    )
    .option("--exit-code", "发现问题时返回非零退出码", false)
    .action(
      async (opts: {
        project: string;
        feature: string;
        requiredKinds: string;
        exitCode: boolean;
      }) => {
        const workspaceRoot = workspaceDir();
        const r = await runCasesVerify({
          project: opts.project,
          featureId: opts.feature,
          workspaceRoot,
          requiredKinds: opts.requiredKinds
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
        });
        for (const i of r.issues)
          console.log(`[${i.layer}] ${i.rule}: ${i.message}${i.fix ? `\n  fix: ${i.fix}` : ""}`);
        console.log(r.ok ? "校验通过" : `校验发现 ${r.issues.length} 个问题`);
        if (opts.exitCode && !r.ok) process.exit(1);
      },
    );
}
