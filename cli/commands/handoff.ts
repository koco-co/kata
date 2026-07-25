import { join } from "node:path";
import type { Command } from "commander";
import { runHandoffRender } from "../lib/handoff-render.ts";
import { repoRoot } from "../lib/workspace-locator.ts";

/** Build the `handoff` command: render handoff.md from handoff.json. */
export function registerHandoff(program: Command): void {
  program
    .command("handoff")
    .description("自动化交付说明管理")
    .command("render <feature-id>")
    .description("根据 handoff.json 生成 handoff.md")
    .requiredOption("--run <id>", "运行 ID")
    .requiredOption("--project <name>", "项目名")
    .action((featureId: string, opts: { project: string; run: string }) => {
      const r = runHandoffRender({
        project: opts.project,
        featureId,
        runId: opts.run,
        workspaceRoot: join(repoRoot(), "workspace"),
      });
      console.log(`[handoff render] 已生成 ${r.path}`);
    });
}
