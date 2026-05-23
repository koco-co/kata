import { describe, expect, it } from "bun:test";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnKataCli } from "../cli-runner.ts";

const BASELINE_KNOWN_FAILURES_PATH = resolve(
  import.meta.dirname,
  "../../../.ai/core/evals/baseline-known-failures.json",
);
const ENVIRONMENT_DEPENDENT_CHECKS_PATH = resolve(
  import.meta.dirname,
  "../../../.ai/core/evals/environment-dependent-checks.json",
);
const INVALID_PARSER_BOUNDARY_PATH = resolve(
  import.meta.dirname,
  "../../src/ai-core/_parser-boundary-audit-cli-fixture.ts",
);

describe("kata ai-core", () => {
  it("buildAiCoreCommand registers the expected top-level subcommands", async () => {
    const { buildAiCoreCommand } = await import("../../src/cli/ai-core.ts");

    const commandNames = buildAiCoreCommand()
      .commands.map((command) => command.name())
      .sort();

    expect(commandNames).toEqual([
      "baseline",
      "case-draft",
      "context",
      "docs",
      "evals",
      "gate",
      "import-records",
      "lint",
      "parser",
      "preflight",
      "projection",
      "schemas-compat-check",
      "vendor",
      "workflow-maturity",
    ]);
  });

  it("synthesizes a gate issue when a check fails without issues", async () => {
    const { gateResultIssues } = await import("../../src/cli/ai-core.ts");

    const issues = gateResultIssues({
      name: "schema compatibility",
      path: ".ai/core/schemas",
      result: { ok: false, issues: [] },
    });

    expect(issues).toEqual([
      {
        code: "gate.check_failed",
        severity: "error",
        path: ".ai/core/schemas",
        message: "schema compatibility failed without reporting issues.",
      },
    ]);
  });

  it("prints ai-core help", () => {
    const result = spawnKataCli(["ai-core", "--help"]);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("AI Core contract operations");
  });

  it("runs strict lint", () => {
    const result = spawnKataCli(["ai-core", "lint", "--strict"]);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("ai-core lint passed");
  });

  it("runs local context audit", () => {
    const result = spawnKataCli(["ai-core", "context", "audit"]);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("ai-core context audit passed");
  });

  it("runs parser boundary audit", () => {
    const result = spawnKataCli(["ai-core", "parser", "audit"]);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("ai-core parser boundary audit passed");
  });

  it("blocks normative local context overrides", () => {
    const localContextPath = resolve(import.meta.dirname, "../../../AGENTS.local.md");
    const before = existsSync(localContextPath)
      ? readFileSync(localContextPath, "utf8")
      : undefined;
    try {
      writeFileSync(localContextPath, "must route to diff-scan\n", "utf8");
      const result = spawnKataCli(["ai-core", "context", "audit"]);
      expect(result.status).toBe(1);
      expect(result.stderr).toContain("local_context.normative_runtime_override");
      expect(result.stderr).toContain("AGENTS.local.md");
      expect(result.stdout).not.toContain("ai-core context audit passed");
    } finally {
      if (before !== undefined) writeFileSync(localContextPath, before, "utf8");
      else if (existsSync(localContextPath)) unlinkSync(localContextPath);
    }
  });

  it("blocks invalid KATA_TARGET_ENV before strict lint succeeds", () => {
    const result = spawnKataCli(["ai-core", "lint", "--strict"], {
      env: { KATA_TARGET_ENV: "../prod" },
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("config.target_env_invalid");
    expect(result.stderr).toContain("env.KATA_TARGET_ENV");
    expect(result.stdout).not.toContain("ai-core lint passed");
  });

  it("blocks invalid secret ref env before strict lint succeeds", () => {
    const result = spawnKataCli(["ai-core", "lint", "--strict"], {
      env: { KATA_SECRET_REF_ZENTAO_TOKEN: "raw-token" },
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("secret_ref.invalid");
    expect(result.stderr).toContain("env.KATA_SECRET_REF_ZENTAO_TOKEN");
    expect(result.stdout).not.toContain("ai-core lint passed");
  });

  it("blocks raw KATA service secrets before strict lint succeeds", () => {
    const result = spawnKataCli(["ai-core", "lint", "--strict"], {
      env: { KATA_ZENTAO_PASSWORD: "raw-password" },
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("secret_env.blocked");
    expect(result.stderr).toContain("env.KATA_ZENTAO_PASSWORD");
    expect(result.stdout).not.toContain("ai-core lint passed");
  });

  it("runs preflight", () => {
    const result = spawnKataCli(["ai-core", "preflight", "--runtime", "all"]);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("ai-core preflight passed");
  });

  it("rejects unsupported preflight runtime without printing success", () => {
    const result = spawnKataCli(["ai-core", "preflight", "--runtime", "desktop"]);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('ai-core preflight: unknown runtime "desktop"');
    expect(result.stdout).not.toContain("ai-core preflight passed");
  });

  it("blocks invalid KATA_TARGET_ENV before preflight succeeds", () => {
    const result = spawnKataCli(["ai-core", "preflight", "--runtime", "all"], {
      env: { KATA_TARGET_ENV: "../prod" },
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("config.target_env_invalid");
    expect(result.stderr).toContain("env.KATA_TARGET_ENV");
    expect(result.stdout).not.toContain("ai-core preflight passed");
  });

  it("blocks invalid secret ref env before preflight succeeds", () => {
    const result = spawnKataCli(["ai-core", "preflight", "--runtime", "all"], {
      env: { KATA_SECRET_REF_ZENTAO_TOKEN: "raw-token" },
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("secret_ref.invalid");
    expect(result.stderr).toContain("env.KATA_SECRET_REF_ZENTAO_TOKEN");
    expect(result.stdout).not.toContain("ai-core preflight passed");
  });

  it("blocks raw KATA service secrets before preflight succeeds", () => {
    const result = spawnKataCli(["ai-core", "preflight", "--runtime", "all"], {
      env: { KATA_DINGTALK_WEBHOOK_URL: "https://hooks.example.test/token" },
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("secret_env.blocked");
    expect(result.stderr).toContain("env.KATA_DINGTALK_WEBHOOK_URL");
    expect(result.stdout).not.toContain("ai-core preflight passed");
  });

  it("runs the P0 gate command", () => {
    const result = spawnKataCli(["ai-core", "gate", "--scope", "p0"]);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("ai-core p0 gate passed");
  });

  it("runs the GA-core import gate", () => {
    const result = spawnKataCli(["ai-core", "gate", "--scope", "ga-core-import"]);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("p0 golden evals: 8/8 passed");
    expect(result.stdout).toContain("ga-core golden evals: 9/9 passed");
    expect(result.stdout).toContain("ai-core ga-core-import gate passed");
  });

  it("runs the GA-core runtime gate", () => {
    const result = spawnKataCli(["ai-core", "gate", "--scope", "ga-core-runtime"]);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("p0 golden evals: 8/8 passed");
    expect(result.stdout).toContain("ga-core golden evals: 9/9 passed");
    expect(result.stdout).toContain("ga-runtime golden evals: 4/4 passed");
    expect(result.stdout).toContain("ai-core ga-core-runtime gate passed");
  });

  it("runs the GA completion gate with baseline reporting", () => {
    const result = spawnKataCli(["ai-core", "gate", "--scope", "ga-completion"]);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("p0 golden evals: 8/8 passed");
    expect(result.stdout).toContain("ga-core golden evals: 9/9 passed");
    expect(result.stdout).toContain("ga-runtime golden evals: 4/4 passed");
    expect(result.stdout).toContain("deterministic baseline failures: 0");
    expect(result.stdout).toContain("environment-dependent checks: 2");
    expect(result.stdout).toContain("baseline decision: no deterministic failures documented");
    expect(result.stdout).toContain("ai-core ga-completion gate passed");
  });

  it("blocks the GA completion gate when deterministic baseline failures remain documented", () => {
    const before = readFileSync(BASELINE_KNOWN_FAILURES_PATH, "utf8");
    try {
      writeFileSync(
        BASELINE_KNOWN_FAILURES_PATH,
        `${JSON.stringify(
          {
            schema_version: 1,
            known_failures: [
              {
                area: "fixture-deterministic-failure",
                reason: "fixture deterministic failure must block GA completion",
              },
            ],
          },
          null,
          2,
        )}\n`,
        "utf8",
      );

      const result = spawnKataCli(["ai-core", "gate", "--scope", "ga-completion"]);

      expect(result.status).toBe(1);
      expect(result.stderr).toContain("baseline.deterministic_failure");
      expect(result.stderr).toContain(
        ".ai/core/evals/baseline-known-failures.json#fixture-deterministic-failure",
      );
      expect(result.stderr).toContain("fixture deterministic failure must block GA completion");
      expect(result.stdout).not.toContain("ai-core ga-completion gate passed");
    } finally {
      writeFileSync(BASELINE_KNOWN_FAILURES_PATH, before, "utf8");
    }
  });

  it("blocks the GA completion gate when parser boundaries fail", () => {
    const before = existsSync(INVALID_PARSER_BOUNDARY_PATH)
      ? readFileSync(INVALID_PARSER_BOUNDARY_PATH, "utf8")
      : undefined;
    try {
      writeFileSync(
        INVALID_PARSER_BOUNDARY_PATH,
        `
function parseFixtureYaml(text: string): { id?: string } {
  return { id: text.match(/^id:\\s*([^\\s#]+)/m)?.[1] };
}
`,
        "utf8",
      );

      const result = spawnKataCli(["ai-core", "gate", "--scope", "ga-completion"]);

      expect(result.status).toBe(1);
      expect(result.stderr).toContain("parser_boundary.ad_hoc_yaml_reader");
      expect(result.stderr).toContain("engine/src/ai-core/_parser-boundary-audit-cli-fixture.ts");
      expect(result.stdout).not.toContain("ai-core ga-completion gate passed");
    } finally {
      if (before !== undefined) writeFileSync(INVALID_PARSER_BOUNDARY_PATH, before, "utf8");
      else if (existsSync(INVALID_PARSER_BOUNDARY_PATH)) unlinkSync(INVALID_PARSER_BOUNDARY_PATH);
    }
  });

  it("reports deterministic failures when the environment-dependent contract is invalid", () => {
    const baselineBefore = readFileSync(BASELINE_KNOWN_FAILURES_PATH, "utf8");
    const environmentBefore = existsSync(ENVIRONMENT_DEPENDENT_CHECKS_PATH)
      ? readFileSync(ENVIRONMENT_DEPENDENT_CHECKS_PATH, "utf8")
      : undefined;
    try {
      writeFileSync(
        BASELINE_KNOWN_FAILURES_PATH,
        `${JSON.stringify(
          {
            schema_version: 1,
            known_failures: [
              {
                area: "fixture-deterministic-failure",
                reason: "fixture deterministic failure must still be reported",
              },
            ],
          },
          null,
          2,
        )}\n`,
        "utf8",
      );
      writeFileSync(ENVIRONMENT_DEPENDENT_CHECKS_PATH, "{bad json", "utf8");

      const result = spawnKataCli(["ai-core", "gate", "--scope", "ga-completion"]);

      expect(result.status).toBe(1);
      expect(result.stderr).toContain("baseline.deterministic_failure");
      expect(result.stderr).toContain(
        ".ai/core/evals/baseline-known-failures.json#fixture-deterministic-failure",
      );
      expect(result.stderr).toContain("fixture deterministic failure must still be reported");
      expect(result.stderr).toContain("baseline.contract_invalid");
      expect(result.stderr).toContain(".ai/core/evals/environment-dependent-checks.json");
      expect(result.stderr).toContain("Invalid environment-dependent checks contract.");
      expect(result.stdout).not.toContain("ai-core ga-completion gate passed");
    } finally {
      writeFileSync(BASELINE_KNOWN_FAILURES_PATH, baselineBefore, "utf8");
      if (environmentBefore !== undefined)
        writeFileSync(ENVIRONMENT_DEPENDENT_CHECKS_PATH, environmentBefore, "utf8");
      else if (existsSync(ENVIRONMENT_DEPENDENT_CHECKS_PATH))
        unlinkSync(ENVIRONMENT_DEPENDENT_CHECKS_PATH);
    }
  });

  it("reports baseline readiness with concise and json output", () => {
    const concise = spawnKataCli(["ai-core", "baseline"]);
    expect(concise.status).toBe(0);
    expect(concise.stdout).toContain("ai-core deterministic baseline failures: 0");
    expect(concise.stdout).toContain("ai-core environment-dependent checks: 2");

    const json = spawnKataCli(["ai-core", "baseline", "--json"]);
    expect(json.status).toBe(0);
    const report = JSON.parse(json.stdout);
    expect(report.deterministic_failures).toEqual([]);
    expect(report.environment_dependent_checks).toEqual([
      {
        area: "report-to-pdf",
        command: "KATA_RUN_BROWSER_PDF_TESTS=1 bun test --cwd engine tests/report-to-pdf.test.ts",
        dependency: "Chromium host permissions for Playwright PDF rendering",
        failure_signature: "bootstrap_check_in org.chromium.Chromium.MachPortRendezvousServer",
        default_suite_policy: "not_run_by_default",
      },
      {
        area: "behavioral-evals-record",
        command: "bun run engine/src/ai-core/behavioral-evals-cli.ts --mode record",
        dependency: "DEEPSEEK_API_KEY environment variable for LLM-as-judge cassette recording",
        failure_signature: "DEEPSEEK_API_KEY is required",
        default_suite_policy: "not_run_by_default",
      },
    ]);
  });

  it("baseline reports deterministic failures when the environment-dependent contract is invalid", () => {
    const baselineBefore = readFileSync(BASELINE_KNOWN_FAILURES_PATH, "utf8");
    const environmentBefore = existsSync(ENVIRONMENT_DEPENDENT_CHECKS_PATH)
      ? readFileSync(ENVIRONMENT_DEPENDENT_CHECKS_PATH, "utf8")
      : undefined;
    try {
      writeFileSync(
        BASELINE_KNOWN_FAILURES_PATH,
        `${JSON.stringify(
          {
            schema_version: 1,
            known_failures: [
              {
                area: "fixture-deterministic-failure",
                reason: "fixture deterministic failure must not be masked",
              },
            ],
          },
          null,
          2,
        )}\n`,
        "utf8",
      );
      writeFileSync(ENVIRONMENT_DEPENDENT_CHECKS_PATH, "{bad json", "utf8");

      const concise = spawnKataCli(["ai-core", "baseline"]);
      expect(concise.status).toBe(1);
      expect(concise.stdout).toContain("ai-core deterministic baseline failures: 1");
      expect(concise.stdout).toContain("ai-core environment-dependent checks: unavailable");
      expect(concise.stderr).toContain("baseline.deterministic_failure");
      expect(concise.stderr).toContain(
        ".ai/core/evals/baseline-known-failures.json#fixture-deterministic-failure",
      );
      expect(concise.stderr).toContain("fixture deterministic failure must not be masked");
      expect(concise.stderr).toContain("baseline.contract_invalid");
      expect(concise.stderr).toContain(".ai/core/evals/environment-dependent-checks.json");
      expect(concise.stderr).toContain("Invalid environment-dependent checks contract.");

      const json = spawnKataCli(["ai-core", "baseline", "--json"]);
      expect(json.status).toBe(1);
      const report = JSON.parse(json.stdout);
      expect(report.deterministic_failures).toEqual([
        {
          area: "fixture-deterministic-failure",
          reason: "fixture deterministic failure must not be masked",
        },
      ]);
      expect(report.environment_dependent_checks).toEqual([]);
      expect(report.issues.map((issue: { code: string }) => issue.code)).toEqual([
        "baseline.contract_invalid",
        "baseline.deterministic_failure",
      ]);
      expect(json.stderr).toContain("baseline.deterministic_failure");
      expect(json.stderr).toContain("baseline.contract_invalid");
    } finally {
      writeFileSync(BASELINE_KNOWN_FAILURES_PATH, baselineBefore, "utf8");
      if (environmentBefore !== undefined)
        writeFileSync(ENVIRONMENT_DEPENDENT_CHECKS_PATH, environmentBefore, "utf8");
      else if (existsSync(ENVIRONMENT_DEPENDENT_CHECKS_PATH))
        unlinkSync(ENVIRONMENT_DEPENDENT_CHECKS_PATH);
    }
  });

  it("blocks invalid config before the GA-core import gate succeeds", () => {
    const result = spawnKataCli(["ai-core", "gate", "--scope", "ga-core-import"], {
      env: { KATA_TARGET_ENV: "../prod" },
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("config.target_env_invalid");
    expect(result.stderr).toContain("env.KATA_TARGET_ENV");
    expect(result.stdout).not.toContain("ai-core ga-core-import gate passed");
  });

  it("rejects unsupported gate scopes without printing success", () => {
    const result = spawnKataCli(["ai-core", "gate", "--scope", "ga"]);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      "Supported --scope values: p0, ga-core-import, ga-core-runtime, ga-completion",
    );
    expect(result.stdout).not.toContain("ai-core p0 gate passed");
    expect(result.stdout).not.toContain("ai-core ga-core-import gate passed");
    expect(result.stdout).not.toContain("ai-core ga-core-runtime gate passed");
    expect(result.stdout).not.toContain("ai-core ga-completion gate passed");
  });

  it("runs projection check", () => {
    const out = mkdtempSync(join(tmpdir(), "kata-projection-cli-"));
    const render = spawnKataCli([
      "ai-core",
      "projection",
      "render",
      "--runtime",
      "all",
      "--output-root",
      out,
    ]);
    expect(render.status).toBe(0);
    expect(render.stdout).toContain("ai-core projection render passed");

    const check = spawnKataCli([
      "ai-core",
      "projection",
      "check",
      "--runtime",
      "all",
      "--output-root",
      out,
    ]);
    expect(check.status).toBe(0);
    expect(check.stdout).toContain("ai-core projection check passed");
  });

  it("does not rely on historical deleted runtime inventory during projection check", () => {
    const out = mkdtempSync(join(tmpdir(), "kata-projection-cli-"));
    const render = spawnKataCli([
      "ai-core",
      "projection",
      "render",
      "--runtime",
      "all",
      "--output-root",
      out,
    ]);
    expect(render.status).toBe(0);
    mkdirSync(join(out, ".agents/skills/obsolete-skill"), { recursive: true });
    writeFileSync(join(out, ".agents/skills/obsolete-skill/SKILL.md"), "legacy");

    const check = spawnKataCli([
      "ai-core",
      "projection",
      "check",
      "--runtime",
      "all",
      "--output-root",
      out,
    ]);

    expect(check.status).toBe(0);
    expect(check.stdout).toContain("ai-core projection check passed");
    expect(check.stderr).not.toContain("projection.deleted_file_present");
  });

  it("runs projection inventory audit", () => {
    const result = spawnKataCli(["ai-core", "projection", "inventory"]);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("ai-core projection inventory passed");
  });

  it("renders and checks generated docs blocks", () => {
    const out = mkdtempSync(join(tmpdir(), "kata-docs-cli-"));
    const render = spawnKataCli(["ai-core", "docs", "render", "--output-root", out]);
    expect(render.status).toBe(0);
    expect(render.stdout).toContain("ai-core docs render passed");

    const check = spawnKataCli(["ai-core", "docs", "check", "--output-root", out]);
    expect(check.status).toBe(0);
    expect(check.stdout).toContain("ai-core docs check passed");
  });

  it("rewrites projection inventory from ledgers", () => {
    const inventoryPath = resolve(
      import.meta.dirname,
      "../../../.ai/core/runtimes/projection-inventory.yaml",
    );
    const before = readFileSync(inventoryPath, "utf8");
    try {
      const result = spawnKataCli(["ai-core", "projection", "inventory-rewrite"]);
      expect(result.status).toBe(0);
      expect(result.stdout).toContain("ai-core projection inventory rewrite passed");
      expect(readFileSync(inventoryPath, "utf8")).toBe(before);
    } finally {
      if (readFileSync(inventoryPath, "utf8") !== before) {
        writeFileSync(inventoryPath, before);
      }
    }
  });

  it("rejects unsupported projection lock actions", () => {
    const result = spawnKataCli(["ai-core", "projection", "lock", "bad"]);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('ai-core projection lock: unknown action "bad"');
    expect(result.stdout).not.toContain("ai-core projection lock check passed");
    expect(result.stdout).not.toContain("ai-core projection lock render passed");
  });

  it("reports missing projection lock on check", () => {
    const lockPath = resolve(
      import.meta.dirname,
      "../../../.ai/core/runtimes/projection-lock.json",
    );
    const before = existsSync(lockPath) ? readFileSync(lockPath, "utf8") : undefined;
    try {
      if (existsSync(lockPath)) unlinkSync(lockPath);
      const result = spawnKataCli(["ai-core", "projection", "lock", "check"]);
      expect(result.status).toBe(1);
      expect(result.stderr).toContain("projection_lock.missing_lock");
      expect(result.stderr).toContain(".ai/core/runtimes/projection-lock.json");
      expect(result.stdout).not.toContain("ai-core projection lock check passed");
    } finally {
      if (before !== undefined) writeFileSync(lockPath, before);
    }
  });

  it("reports malformed projection lock JSON on check", () => {
    const lockPath = resolve(
      import.meta.dirname,
      "../../../.ai/core/runtimes/projection-lock.json",
    );
    const before = existsSync(lockPath) ? readFileSync(lockPath, "utf8") : undefined;
    try {
      writeFileSync(lockPath, "{bad json", "utf8");
      const result = spawnKataCli(["ai-core", "projection", "lock", "check"]);
      expect(result.status).toBe(1);
      expect(result.stderr).toContain("projection_lock.invalid");
      expect(result.stderr).toContain(".ai/core/runtimes/projection-lock.json");
      expect(result.stdout).not.toContain("ai-core projection lock check passed");
    } finally {
      if (before !== undefined) writeFileSync(lockPath, before);
      else if (existsSync(lockPath)) unlinkSync(lockPath);
    }
  });

  it("reports no historical import records after the no-compat cleanup", () => {
    const concise = spawnKataCli(["ai-core", "import-records"]);
    expect(concise.status).toBe(0);
    expect(concise.stdout).toContain("ai-core import records: 0");

    const json = spawnKataCli(["ai-core", "import-records", "--json"]);
    expect(json.status).toBe(0);
    const records = JSON.parse(json.stdout);
    expect(records).toEqual([]);
  });

  it("summarizes projection diff with concise and json output", () => {
    const concise = spawnKataCli(["ai-core", "projection", "diff", "--runtime", "all"]);
    expect(concise.status).toBe(0);
    expect(concise.stdout).toContain("ai-core projection diff:");

    const json = spawnKataCli(["ai-core", "projection", "diff", "--runtime", "all", "--json"]);
    expect(json.status).toBe(0);
    const report = JSON.parse(json.stdout);
    expect(report).toEqual({
      generated: 102,
      copied_vendor: 22,
      local_exception: 0,
      deleted: 0,
    });
  });

  it("runs the p0 golden eval suite with concise and json output", () => {
    const full = spawnKataCli(["ai-core", "evals", "golden", "--suite", "p0"]);
    expect(full.status).toBe(0);
    expect(full.stdout).toContain("p0 golden evals passed");
    expect(full.stdout).toContain("8/8 passed");

    const subset = spawnKataCli([
      "ai-core",
      "evals",
      "golden",
      "--suite",
      "p0",
      "--subset",
      "fast-deterministic",
    ]);
    expect(subset.status).toBe(0);
    expect(subset.stdout).toContain("p0 golden evals passed");
    expect(subset.stdout).toContain("fast-deterministic");

    const json = spawnKataCli(["ai-core", "evals", "golden", "--suite", "p0", "--json"]);
    expect(json.status).toBe(0);
    const summary = JSON.parse(json.stdout);
    expect(summary).toMatchObject({
      suite: "p0",
      pass: true,
      passed: 8,
      failed: 0,
    });
    expect(summary.results.map((testCase: { id: string }) => testCase.id)).toEqual(
      expect.arrayContaining([
        "trigger-routing",
        "missing-evidence",
        "weak-assertion",
        "projection-drift",
        "plugin-permission",
        "source-ref-stale",
        "telemetry-privacy",
        "budget-refusal",
      ]),
    );
  });

  it("runs the GA-runtime golden eval suite", () => {
    const result = spawnKataCli([
      "ai-core",
      "evals",
      "golden",
      "--suite",
      "ga-runtime",
      "--subset",
      "fast-deterministic",
    ]);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("ga-runtime golden evals passed: 4/4 passed");
  });

  it("runs schema compatibility checks", () => {
    const result = spawnKataCli(["ai-core", "schemas-compat-check"]);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("schemas compat check passed");
  });

  it("runs the ga-core golden eval suite with concise and json output", () => {
    const result = spawnKataCli([
      "ai-core",
      "evals",
      "golden",
      "--suite",
      "ga-core",
      "--subset",
      "fast-deterministic",
    ]);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("ga-core golden evals passed");

    const defaultSubset = spawnKataCli(["ai-core", "evals", "golden", "--suite", "ga-core"]);
    expect(defaultSubset.status).toBe(0);
    expect(defaultSubset.stdout).toContain("ga-core golden evals passed");
    expect(defaultSubset.stdout).toContain("subset: fast-deterministic");
    expect(defaultSubset.stdout).not.toContain("subset: all");

    const json = spawnKataCli([
      "ai-core",
      "evals",
      "golden",
      "--suite",
      "ga-core",
      "--subset",
      "fast-deterministic",
      "--json",
    ]);
    expect(json.status).toBe(0);
    const summary = JSON.parse(json.stdout);
    expect(summary).toMatchObject({
      suite: "ga-core",
      subset: "fast-deterministic",
      pass: true,
      passed: 9,
      failed: 0,
    });
  });

  it("rejects unknown golden eval suite and subset without printing success", () => {
    const badSuite = spawnKataCli(["ai-core", "evals", "golden", "--suite", "p1"]);
    expect(badSuite.status).toBe(1);
    expect(badSuite.stderr).toContain('evals golden: unknown suite "p1"');
    expect(badSuite.stdout).not.toContain("golden evals passed");

    const badSubset = spawnKataCli([
      "ai-core",
      "evals",
      "golden",
      "--suite",
      "p0",
      "--subset",
      "slow",
    ]);
    expect(badSubset.status).toBe(1);
    expect(badSubset.stderr).toContain('evals golden: unknown subset "slow"');
    expect(badSubset.stdout).not.toContain("golden evals passed");

    const emptySubset = spawnKataCli([
      "ai-core",
      "evals",
      "golden",
      "--suite",
      "p0",
      "--subset",
      "",
    ]);
    expect(emptySubset.status).toBe(1);
    expect(emptySubset.stderr).toContain("evals golden: subset must be non-empty");
    expect(emptySubset.stdout).not.toContain("golden evals passed");
  });

  it("reports vendor freeze issues without printing success", () => {
    const missingSource = join(
      mkdtempSync(join(tmpdir(), "kata-missing-vendor-")),
      "absent-source",
    );
    const result = spawnKataCli([
      "ai-core",
      "vendor",
      "freeze",
      "playwright-cli",
      "--source-dir",
      missingSource,
    ]);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("vendor.source_missing");
    expect(result.stderr).toContain("Vendor source directory does not exist.");
    expect(result.stdout).not.toContain("ai-core vendor freeze passed");
  });
});
