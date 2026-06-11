import { existsSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { extractSourceFactSet, jaccard } from "@shared/lib/cases/source-fact-set.ts";
import { STABLE_CORE_ARTIFACTS } from "@shared/lib/cases/verify-layers.ts";
import { isV2 } from "@shared/lib/features/feature-meta.ts";
import type { Command } from "commander";
import { parse as parseYaml } from "yaml";

export interface CasesCompareContext {
  leftDir: string;
  rightDir: string;
  threshold: number;
  criticalFacts?: Set<string>;
}
export interface CompareFinding {
  severity: "FAIL" | "WARN";
  rule: string;
  message: string;
}
export interface CasesCompareResult {
  fail: boolean;
  jaccard: number;
  findings: CompareFinding[];
}

interface CompareAtom {
  source_ref: string;
  ambiguity_class?: string;
  confidence?: string;
}

/** Load requirement_atoms from manifest.json (@1) or metadata.yaml (@2). */
function loadCaseDraftingDoc(dir: string): {
  case_drafting?: { requirement_atoms?: CompareAtom[] };
} {
  // @2: metadata.yaml has case_drafting section
  const metaPath = join(dir, "metadata.yaml");
  if (existsSync(metaPath)) {
    const parsed = parseYaml(readFileSync(metaPath, "utf-8")) as Record<string, unknown>;
    if (isV2(parsed)) {
      return parsed as { case_drafting?: { requirement_atoms?: CompareAtom[] } };
    }
  }
  // @1: manifest.json
  const manifestPath = join(dir, "manifest.json");
  if (existsSync(manifestPath)) {
    return JSON.parse(readFileSync(manifestPath, "utf-8"));
  }
  return {};
}

function criticalFactSet(m: {
  case_drafting?: { requirement_atoms?: CompareAtom[] };
}): Set<string> {
  const set = new Set<string>();
  for (const a of m.case_drafting?.requirement_atoms ?? []) {
    if (a.ambiguity_class === "blocking_unknown" || a.confidence === "high")
      set.add(a.source_ref.split("#sha256:")[0]);
  }
  return set;
}

/** Returns true if the directory has a valid @1 manifest.json or @2 metadata.yaml. */
function hasFeatureDoc(dir: string): boolean {
  const metaPath = join(dir, "metadata.yaml");
  if (existsSync(metaPath)) {
    try {
      const parsed = parseYaml(readFileSync(metaPath, "utf-8")) as Record<string, unknown>;
      if (isV2(parsed)) return true;
    } catch {
      /* ignore */
    }
  }
  return existsSync(join(dir, "manifest.json"));
}

export function runCasesCompare(ctx: CasesCompareContext): CasesCompareResult {
  const findings: CompareFinding[] = [];
  if (!hasFeatureDoc(ctx.leftDir) || !hasFeatureDoc(ctx.rightDir)) {
    return {
      fail: true,
      jaccard: 0,
      findings: [
        { severity: "FAIL", rule: "missing_manifest", message: "one side has no manifest.json" },
      ],
    };
  }
  if (basename(ctx.leftDir) !== basename(ctx.rightDir)) {
    findings.push({
      severity: "FAIL",
      rule: "path_mismatch",
      message: `feature_id differs: ${basename(ctx.leftDir)} vs ${basename(ctx.rightDir)}`,
    });
  }
  const leftCore = STABLE_CORE_ARTIFACTS.filter((f) => existsSync(join(ctx.leftDir, f)));
  const rightCore = STABLE_CORE_ARTIFACTS.filter((f) => existsSync(join(ctx.rightDir, f)));
  if (leftCore.join(",") !== rightCore.join(",")) {
    findings.push({
      severity: "FAIL",
      rule: "file_set_mismatch",
      message: `稳定核心文件集不一致: [${leftCore.join(",")}] vs [${rightCore.join(",")}]`,
    });
  }
  const leftManifest = loadCaseDraftingDoc(ctx.leftDir);
  const rightManifest = loadCaseDraftingDoc(ctx.rightDir);
  const left = extractSourceFactSet(leftManifest);
  const right = extractSourceFactSet(rightManifest);
  const j = jaccard(left, right);

  const critical =
    ctx.criticalFacts ??
    new Set<string>([...criticalFactSet(leftManifest), ...criticalFactSet(rightManifest)]);
  for (const f of critical) {
    if (!left.has(f) || !right.has(f)) {
      findings.push({
        severity: "FAIL",
        rule: "critical_fact_missing",
        message: `critical fact not on both sides: ${f}`,
      });
    }
  }
  if (j < ctx.threshold) {
    findings.push({
      severity: "WARN",
      rule: "coverage_below_threshold",
      message: `source-fact jaccard ${j.toFixed(3)} < ${ctx.threshold}`,
    });
  }
  return { fail: findings.some((f) => f.severity === "FAIL"), jaccard: j, findings };
}

export function registerCasesCompare(cases: Command): void {
  cases
    .command("compare")
    .description("跨模型产物稳定性比对 (FAIL/WARN)")
    .requiredOption("--left <dir>", "claude 产物 feature 目录")
    .requiredOption("--right <dir>", "codex 产物 feature 目录")
    .option("--threshold <n>", "非关键源事实 Jaccard 阈值", "0.9")
    .option("--exit-code", "exit non-zero on FAIL", false)
    .action((opts: { left: string; right: string; threshold: string; exitCode: boolean }) => {
      const r = runCasesCompare({
        leftDir: opts.left,
        rightDir: opts.right,
        threshold: Number(opts.threshold),
      });
      for (const f of r.findings) console.log(`[${f.severity}] ${f.rule}: ${f.message}`);
      console.log(`jaccard=${r.jaccard.toFixed(3)} ${r.fail ? "FAIL" : "OK"}`);
      if (opts.exitCode && r.fail) process.exit(1);
    });
}
