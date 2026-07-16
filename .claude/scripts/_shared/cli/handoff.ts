import { join } from "node:path";
import { repoRoot } from "@shared/lib/paths.ts";
import { runHandoffRender } from "@skills/playwright-automation/scripts/handoff-render.ts";
import { Command } from "commander";

export function buildHandoffCommand(): Command {
  const handoff = new Command("handoff").description("自动化交付说明管理");
  handoff
    .command("render <feature-id>")
    .description("根据 handoff.json 生成 handoff.md")
    .requiredOption("--run <id>", "运行 ID")
    .requiredOption("--project <name>", "项目名（必填）")
    .action(async (featureId: string, opts: { project: string; run: string }) => {
      const r = await runHandoffRender({
        project: opts.project,
        featureId,
        runId: opts.run,
        workspaceRoot: join(repoRoot(), "workspace"),
      });
      console.log(`[handoff render] 已生成 ${r.path}`);
    });
  return handoff;
}
