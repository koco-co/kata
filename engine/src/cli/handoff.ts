import { join } from "node:path";
import { Command } from "commander";
import { repoRoot } from "@shared/lib/paths.ts";
import { runHandoffRender } from "./handoff-render.ts";

export function buildHandoffCommand(): Command {
  const handoff = new Command("handoff").description("Handoff 渲染与校验");
  handoff
    .command("render <featureId>")
    .description("从 handoff.json 渲染 handoff.md")
    .requiredOption("--run <id>", "run-id")
    .option("--project <name>", "项目名", "dataAssets")
    .action(async (featureId: string, opts: { project: string; run: string }) => {
      const r = await runHandoffRender({
        project: opts.project,
        featureId,
        runId: opts.run,
        workspaceRoot: join(repoRoot(), "workspace"),
      });
      console.log(`Rendered ${r.path}`);
    });
  return handoff;
}
