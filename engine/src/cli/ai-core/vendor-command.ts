import { Command } from "commander";
import { writeAiCoreIssues } from "./helpers.ts";

export function registerVendorCommand(aiCore: Command): void {
  // ai-core vendor
  const vendor = new Command("vendor").description("AI Core vendor operations");
  vendor
    .command("freeze")
    .description("Freeze a vendor skill into .ai/vendor-skills")
    .argument("<id>", "vendor skill id")
    .requiredOption("--source-dir <path>", "local installed vendor skill directory")
    .action(async (id: string, opts: { sourceDir: string }) => {
      if (id !== "playwright-cli") {
        process.stderr.write("Only playwright-cli is in the P0 kernel vendor scope\n");
        process.exitCode = 1;
        return;
      }
      const { freezeVendorSkill } = await import("../../ai-core/vendor.ts");
      const result = await freezeVendorSkill({ id: "playwright-cli", sourceDir: opts.sourceDir });
      if (!result.ok) {
        writeAiCoreIssues(result.issues);
        process.exitCode = 1;
        return;
      }
      process.exitCode = 0;
      console.log("ai-core vendor freeze passed");
    });

  vendor
    .command("install")
    .description("Install a vendor skill into the isolated AI Core vendor cache")
    .argument("<id>", "vendor skill id")
    .action((id: string) => {
      if (id !== "playwright-cli") {
        process.stderr.write("Only playwright-cli is supported in the P0 kernel\n");
        process.exitCode = 1;
        return;
      }
      console.log(
        "Run upstream install into .ai/vendor-skills/playwright-cli/cache before freeze: npx skills add https://github.com/microsoft/playwright-cli --skill playwright-cli",
      );
    });
  aiCore.addCommand(vendor);
}
