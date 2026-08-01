import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import type { FullResult, Reporter } from "playwright/types/testReporter";

export interface AllureReportReporterOptions {
  readonly resultsDir: string;
  readonly reportDir: string;
  readonly repoRoot: string;
}

/** Generate the configured HTML report after Allure results have been written. */
export default class AllureReportReporter implements Reporter {
  private readonly options: AllureReportReporterOptions;

  public constructor(options: AllureReportReporterOptions) {
    this.options = options;
  }

  public onEnd(_result: FullResult): void {
    const local = path.join(
      this.options.repoRoot,
      "node_modules",
      ".bin",
      process.platform === "win32" ? "allure.cmd" : "allure",
    );
    const command = fs.existsSync(local) ? local : "allure";
    execFileSync(
      command,
      ["generate", this.options.resultsDir, "-o", this.options.reportDir, "--clean"],
      {
        cwd: this.options.repoRoot,
        stdio: "inherit",
      },
    );
  }
}
