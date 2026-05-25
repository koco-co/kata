import { join } from "node:path";
import type { Command } from "commander";
import { runCaseDraftE2e } from "../e2e/case-draft-e2e.ts";

export function registerCasesE2e(cases: Command): void {
  cases
    .command("e2e")
    .description("跨模型 e2e 稳定性验证 (双 runtime 真跑)")
    .requiredOption("--project <name>", "项目名")
    .requiredOption("--feature <id>", "feature_id")
    .requiredOption("--snapshot <path>", "frozen source-snapshot.json 路径")
    .option("--out <dir>", "结果输出根目录", join(process.cwd(), ".kata/e2e-results"))
    .option("--threshold <n>", "非关键源事实 Jaccard 阈值", "0.9")
    .option(
      "--required-kinds <list>",
      "逗号分隔的必需 source_ref kinds",
      "lanhu.fixture,knowledge.entry,repo.line",
    )
    .action(
      async (opts: {
        project: string;
        feature: string;
        snapshot: string;
        out: string;
        threshold: string;
        requiredKinds: string;
      }) => {
        const r = await runCaseDraftE2e({
          project: opts.project,
          featureId: opts.feature,
          snapshotPath: opts.snapshot,
          outRoot: opts.out,
          workspaceRoot: join(opts.out, "claude"),
          threshold: Number(opts.threshold),
          requiredKinds: opts.requiredKinds.split(",").map((s) => s.trim()),
        });
        console.log(
          `verifyClaude: ${r.verifyClaude.ok ? "OK" : `${r.verifyClaude.issues.length} issues`}`,
        );
        console.log(
          `verifyCodex: ${r.verifyCodex.ok ? "OK" : `${r.verifyCodex.issues.length} issues`}`,
        );
        console.log(
          `compare: ${r.compare.fail ? "FAIL" : "OK"} jaccard=${r.compare.jaccard.toFixed(3)}`,
        );
        if (r.compare.findings.length > 0) {
          for (const f of r.compare.findings)
            console.log(`  [${f.severity}] ${f.rule}: ${f.message}`);
        }
        console.log(r.ok ? "e2e: OK" : "e2e: FAIL");
        if (!r.ok) process.exit(1);
      },
    );
}
