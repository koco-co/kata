import { describe, expect, it } from "bun:test";
import { cpSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  loadP0GoldenSuite,
  type P0GoldenCase,
  parseGoldenSuiteText,
  runP0GoldenCase,
  runP0GoldenEvals,
} from "../../src/ai-core/evals.ts";

const root = join(import.meta.dirname, "../../..");
const requiredIds = [
  "trigger-routing",
  "missing-evidence",
  "weak-assertion",
  "projection-drift",
  "plugin-permission",
  "source-ref-stale",
  "telemetry-privacy",
  "budget-refusal",
];

function writeGolden(rootDir: string, content: string): void {
  const evalRoot = join(rootDir, ".ai/core/evals/p0");
  mkdirSync(evalRoot, { recursive: true });
  writeFileSync(join(evalRoot, "golden.yaml"), content);
}

function writeGaCoreGolden(rootDir: string, content: string): void {
  const evalRoot = join(rootDir, ".ai/core/evals/ga-core");
  mkdirSync(evalRoot, { recursive: true });
  writeFileSync(join(evalRoot, "golden.yaml"), content);
}

describe("p0 golden evals", () => {
  it("fails closed on malformed golden YAML", () => {
    const result = parseGoldenSuiteText(
      "suite: p0\ncases: |\n  bad\n",
      ".ai/core/evals/p0/golden.yaml",
    );

    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain("yaml.unsupported_block_scalar");
  });

  it("returns structured issues for missing golden suite fields", () => {
    const result = parseGoldenSuiteText(
      [
        "cases:",
        "  - id: missing-suite",
        "    subset: fast-deterministic",
        "    kind: trigger-routing",
        "    input:",
        "      fixture: fixtures/trigger-routing.json",
        "    expected:",
        "      status: passed",
        "",
      ].join("\n"),
      ".ai/core/evals/p0/golden.yaml",
    );

    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain("evals.golden_missing_suite");
  });

  it("returns structured issues for missing case id and expected status", () => {
    const result = parseGoldenSuiteText(
      [
        "suite: p0",
        "cases:",
        "  - subset: fast-deterministic",
        "    kind: trigger-routing",
        "    input:",
        "      fixture: fixtures/trigger-routing.json",
        "    expected:",
        "      rule_ids:",
        "        - trigger.route_alias",
        "",
      ].join("\n"),
      ".ai/core/evals/p0/golden.yaml",
    );

    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining([
        "evals.golden_missing_case_id",
        "evals.golden_missing_expected_status",
      ]),
    );
  });

  it("returns structured issues for duplicate golden case ids", () => {
    const result = parseGoldenSuiteText(
      [
        "suite: p0",
        "cases:",
        "  - id: duplicate-case",
        "    subset: fast-deterministic",
        "    kind: trigger-routing",
        "    input:",
        "      fixture: fixtures/trigger-routing.json",
        "    expected:",
        "      status: passed",
        "  - id: duplicate-case",
        "    subset: fast-deterministic",
        "    kind: trigger-routing",
        "    input:",
        "      fixture: fixtures/trigger-routing.json",
        "    expected:",
        "      status: passed",
        "",
      ].join("\n"),
      ".ai/core/evals/p0/golden.yaml",
    );

    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain("evals.golden_duplicate_case_id");
  });

  it("returns structured issues for malformed golden indentation", () => {
    const result = parseGoldenSuiteText(
      [
        "suite: p0",
        "cases:",
        "   - id: bad-indent",
        "    subset: fast-deterministic",
        "    kind: trigger-routing",
        "    expected:",
        "      status: passed",
        "",
      ].join("\n"),
      ".ai/core/evals/p0/golden.yaml",
    );

    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain("yaml.unsupported_indentation");
  });

  it("returns structured issues for duplicate input sections in a golden case", () => {
    const result = parseGoldenSuiteText(
      [
        "suite: p0",
        "cases:",
        "  - id: duplicate-input",
        "    subset: fast-deterministic",
        "    kind: trigger-routing",
        "    input:",
        "      fixture: fixtures/trigger-routing.json",
        "    input:",
        "      fixture: fixtures/trigger-routing.json",
        "    expected:",
        "      status: passed",
        "",
      ].join("\n"),
      ".ai/core/evals/p0/golden.yaml",
    );

    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain("yaml.duplicate_key");
  });

  it("returns structured issues for duplicate expected sections in a golden case", () => {
    const result = parseGoldenSuiteText(
      [
        "suite: p0",
        "cases:",
        "  - id: duplicate-expected",
        "    subset: fast-deterministic",
        "    kind: trigger-routing",
        "    input:",
        "      fixture: fixtures/trigger-routing.json",
        "    expected:",
        "      status: passed",
        "    expected:",
        "      status: passed",
        "",
      ].join("\n"),
      ".ai/core/evals/p0/golden.yaml",
    );

    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain("yaml.duplicate_key");
  });

  it("returns structured issues for empty golden rule_ids lists", () => {
    const result = parseGoldenSuiteText(
      [
        "suite: p0",
        "cases:",
        "  - id: empty-rule-ids",
        "    subset: fast-deterministic",
        "    kind: trigger-routing",
        "    input:",
        "      fixture: fixtures/trigger-routing.json",
        "    expected:",
        "      status: passed",
        "      rule_ids:",
        "",
      ].join("\n"),
      ".ai/core/evals/p0/golden.yaml",
    );

    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain("evals.golden_empty_expected_list");
  });

  it("returns structured issues for inline golden rule_ids values", () => {
    const result = parseGoldenSuiteText(
      [
        "suite: p0",
        "cases:",
        "  - id: inline-rule-ids",
        "    subset: fast-deterministic",
        "    kind: trigger-routing",
        "    input:",
        "      fixture: fixtures/trigger-routing.json",
        "    expected:",
        "      status: passed",
        "      rule_ids: trigger.route_alias",
        "",
      ].join("\n"),
      ".ai/core/evals/p0/golden.yaml",
    );

    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain(
      "yaml.unsupported_inline_list_value",
    );
  });

  it("returns structured issues for empty golden required_messages lists", () => {
    const result = parseGoldenSuiteText(
      [
        "suite: p0",
        "cases:",
        "  - id: empty-required-messages",
        "    subset: fast-deterministic",
        "    kind: trigger-routing",
        "    input:",
        "      fixture: fixtures/trigger-routing.json",
        "    expected:",
        "      status: passed",
        "      required_messages:",
        "",
      ].join("\n"),
      ".ai/core/evals/p0/golden.yaml",
    );

    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain("evals.golden_empty_expected_list");
  });

  it("returns structured issues for inline golden required_messages values", () => {
    const result = parseGoldenSuiteText(
      [
        "suite: p0",
        "cases:",
        "  - id: inline-required-messages",
        "    subset: fast-deterministic",
        "    kind: trigger-routing",
        "    input:",
        "      fixture: fixtures/trigger-routing.json",
        "    expected:",
        "      status: passed",
        "      required_messages: must block",
        "",
      ].join("\n"),
      ".ai/core/evals/p0/golden.yaml",
    );

    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain(
      "yaml.unsupported_inline_list_value",
    );
  });

  it("returns direct structured issues for inline input section values", () => {
    const result = parseGoldenSuiteText(
      [
        "suite: p0",
        "cases:",
        "  - id: inline-input",
        "    subset: fast-deterministic",
        "    kind: trigger-routing",
        "    input: something",
        "    expected:",
        "      status: passed",
        "",
      ].join("\n"),
      ".ai/core/evals/p0/golden.yaml",
    );

    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        code: "yaml.unsupported_section_value",
        path: ".ai/core/evals/p0/golden.yaml",
      }),
    );
  });

  it("returns direct structured issues for inline expected section values", () => {
    const result = parseGoldenSuiteText(
      [
        "suite: p0",
        "cases:",
        "  - id: inline-expected",
        "    subset: fast-deterministic",
        "    kind: trigger-routing",
        "    input:",
        "      fixture: fixtures/trigger-routing.json",
        "    expected: something",
        "",
      ].join("\n"),
      ".ai/core/evals/p0/golden.yaml",
    );

    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        code: "yaml.unsupported_section_value",
        path: ".ai/core/evals/p0/golden.yaml",
      }),
    );
  });

  it("loads committed p0 golden cases with the required deterministic ids", () => {
    const suite = loadP0GoldenSuite({ root });

    expect(suite.suite).toBe("p0");
    expect(suite.cases.map((testCase) => testCase.id)).toEqual(expect.arrayContaining(requiredIds));
  });

  it("passes every committed p0 golden fixture with per-case results", async () => {
    const result = await runP0GoldenEvals({ suite: "p0", root });

    expect(result.pass).toBe(true);
    expect(result.suite).toBe("p0");
    expect(result.results).toHaveLength(loadP0GoldenSuite({ root }).cases.length);
    expect(result.results.map((testCase) => testCase.id)).toEqual(
      expect.arrayContaining(requiredIds),
    );
    expect(result.results.every((testCase) => testCase.pass)).toBe(true);
    for (const testCase of result.results) {
      expect(testCase.actualRuleIds).toEqual(expect.arrayContaining(testCase.expectedRuleIds));
    }
  });

  it("surfaces deterministic fixture failures instead of reporting a false pass", async () => {
    const unsafeTelemetryCase: P0GoldenCase = {
      id: "negative-telemetry-secret",
      suite: "p0",
      subset: "fast-deterministic",
      kind: "telemetry-privacy",
      input: {
        event: {
          event_id: "evt-negative",
          event_kind: "policy",
          run_id: "run-negative",
          skill_id: "sk-test-secret",
          status: "blocked",
        },
      },
      expected: {
        status: "passed",
        rule_ids: [],
        required_messages: [],
      },
    };

    const result = await runP0GoldenCase(unsafeTelemetryCase, { root });

    expect(result.pass).toBe(false);
    expect(result.status).toBe("failed");
    expect(result.actualRuleIds).toContain("telemetry.secret_like_value_blocked");
  });

  it("rejects fixture paths outside the p0 fixtures directory", async () => {
    const escapedCase: P0GoldenCase = {
      id: "escaped-fixture",
      suite: "p0",
      subset: "fast-deterministic",
      kind: "missing-evidence",
      input: {
        fixture: "fixtures/../golden.yaml",
      },
      expected: {
        status: "blocked",
        rule_ids: ["missing_source_ref"],
      },
    };

    await expect(runP0GoldenCase(escapedCase, { root })).rejects.toThrow(/fixtures/);
  });

  it("rejects p0 golden yaml with unknown top-level fields", () => {
    const fixtureRoot = mkdtempSync(join(tmpdir(), "kata-p0-unknown-top-"));
    writeGolden(fixtureRoot, ["suite: p0", "unexpected: true", "cases:", ""].join("\n"));

    expect(() => loadP0GoldenSuite({ root: fixtureRoot })).toThrow(/Unknown p0 golden field/);
  });

  it("throws loader errors with the golden path and issue code", () => {
    const fixtureRoot = mkdtempSync(join(tmpdir(), "kata-p0-loader-issue-"));
    writeGolden(fixtureRoot, "suite: p0\ncases: |\n  bad\n");

    expect(() => loadP0GoldenSuite({ root: fixtureRoot })).toThrow(
      /golden\.yaml: yaml\.unsupported_block_scalar/,
    );
  });

  it("rejects p0 golden yaml with missing cases", () => {
    const fixtureRoot = mkdtempSync(join(tmpdir(), "kata-p0-missing-cases-"));
    writeGolden(fixtureRoot, "suite: p0\n");

    expect(() => loadP0GoldenSuite({ root: fixtureRoot })).toThrow(/cases/);
  });

  it("rejects p0 golden yaml with empty cases", () => {
    const fixtureRoot = mkdtempSync(join(tmpdir(), "kata-p0-empty-cases-"));
    writeGolden(fixtureRoot, "suite: p0\ncases:\n");

    expect(() => loadP0GoldenSuite({ root: fixtureRoot })).toThrow(/cases/);
  });

  it("rejects p0 golden yaml with unknown case fields", () => {
    const fixtureRoot = mkdtempSync(join(tmpdir(), "kata-p0-unknown-case-"));
    writeGolden(
      fixtureRoot,
      [
        "suite: p0",
        "cases:",
        "  - id: bad-case",
        "    subset: fast-deterministic",
        "    kind: trigger-routing",
        "    owner: qa",
        "    input:",
        "      fixture: fixtures/trigger-routing.json",
        "    expected:",
        "      status: passed",
        "      skill_id: case-draft@1",
        "      command_alias: obsolete-skill",
        "      rule_ids:",
        "        - trigger.route_alias",
        "",
      ].join("\n"),
    );

    expect(() => loadP0GoldenSuite({ root: fixtureRoot })).toThrow(/Unknown p0 golden/);
  });

  it("rejects p0 golden yaml with unknown input fields", () => {
    const fixtureRoot = mkdtempSync(join(tmpdir(), "kata-p0-unknown-input-"));
    writeGolden(
      fixtureRoot,
      [
        "suite: p0",
        "cases:",
        "  - id: bad-input",
        "    subset: fast-deterministic",
        "    kind: trigger-routing",
        "    input:",
        "      fixture: fixtures/trigger-routing.json",
        "      raw: ignored",
        "    expected:",
        "      status: passed",
        "      skill_id: case-draft@1",
        "      command_alias: obsolete-skill",
        "      rule_ids:",
        "        - trigger.route_alias",
        "",
      ].join("\n"),
    );

    expect(() => loadP0GoldenSuite({ root: fixtureRoot })).toThrow(/Unknown p0 golden input field/);
  });

  it("rejects p0 golden yaml with unknown expected fields", () => {
    const fixtureRoot = mkdtempSync(join(tmpdir(), "kata-p0-unknown-expected-"));
    writeGolden(
      fixtureRoot,
      [
        "suite: p0",
        "cases:",
        "  - id: bad-expected",
        "    subset: fast-deterministic",
        "    kind: trigger-routing",
        "    input:",
        "      fixture: fixtures/trigger-routing.json",
        "    expected:",
        "      status: passed",
        "      skill_id: case-draft@1",
        "      command_alias: obsolete-skill",
        "      surprise: ignored",
        "      rule_ids:",
        "        - trigger.route_alias",
        "",
      ].join("\n"),
    );

    expect(() => loadP0GoldenSuite({ root: fixtureRoot })).toThrow(
      /Unknown p0 golden expected field/,
    );
  });

  it("requires exact rule-id equality for case results", async () => {
    const weakAssertionCase = loadP0GoldenSuite({ root }).cases.find(
      (testCase) => testCase.id === "weak-assertion",
    );
    expect(weakAssertionCase).not.toBeUndefined();
    const incompleteExpectedRules: P0GoldenCase = {
      ...weakAssertionCase!,
      expected: {
        ...weakAssertionCase?.expected,
        rule_ids: [],
      },
    };

    const result = await runP0GoldenCase(incompleteExpectedRules, { root });

    expect(result.pass).toBe(false);
    expect(result.actualRuleIds).toEqual(["weak_playwright_assertion"]);
  });

  it("does not pass an unknown subset as an empty selection", async () => {
    const result = await runP0GoldenEvals({ suite: "p0", subset: "unknown-subset", root });

    expect(result.pass).toBe(false);
    expect(result.total).toBe(0);
    expect(result.failed).toBe(1);
    expect(result.telemetry.failure_modes).toContain("evals.subset_unknown");
  });

  it("does not treat an explicit empty subset as all cases", async () => {
    const result = await runP0GoldenEvals({ suite: "p0", subset: "", root });

    expect(result.pass).toBe(false);
    expect(result.total).toBe(0);
    expect(result.failed).toBe(1);
    expect(result.telemetry.failure_modes).toContain("evals.subset_empty");
  });

  it("requires plugin-permission to prove package-root containment fired", async () => {
    const fixtureRoot = mkdtempSync(join(tmpdir(), "kata-p0-plugin-mask-"));
    cpSync(join(root, ".ai/core"), join(fixtureRoot, ".ai/core"), { recursive: true });
    const fixturePath = join(fixtureRoot, ".ai/core/evals/p0/fixtures/safe-package-bad-kind.yaml");
    writeFileSync(
      fixturePath,
      [
        "id: p0-bad-plugin.fetch@1",
        "schema_ref: PluginManifest@1",
        "package_root: .ai/core/plugins/p0-bad-plugin",
        "capability:",
        "  kind: raw_reader",
        "  network: false",
        "  secrets: false",
        "argv_schema:",
        "  required:",
        "    - fixtureName",
        "output_schema: SourceSnapshot@1",
        "timeout_ms: 1000",
        "artifact_staging:",
        "  enabled: true",
        "  root: .ai/runs/staging",
        "capability_required:",
        "  fs_read: []",
        "  fs_write: []",
        "  net: []",
        "  secret_refs: []",
        "",
      ].join("\n"),
    );

    const result = await runP0GoldenCase(
      {
        id: "plugin-permission-mask",
        suite: "p0",
        subset: "fast-deterministic",
        kind: "plugin-permission",
        input: {
          fixture: "fixtures/safe-package-bad-kind.yaml",
        },
        expected: {
          status: "blocked",
          rule_ids: ["contract.schema_invalid"],
          required_messages: [
            "PluginManifest package_root must stay under .ai/core/plugins without dot segments.",
          ],
        },
      },
      { root: fixtureRoot },
    );

    expect(result.pass).toBe(false);
    expect(result.actualRuleIds).toEqual(["contract.schema_invalid"]);
    expect(result.issues.map((issue) => issue.message)).not.toContain(
      "PluginManifest package_root must stay under .ai/core/plugins without dot segments.",
    );
  });

  it("runs GA-core deterministic trigger confusion fixtures", async () => {
    const { runGaCoreGoldenEvals } = await import("../../src/ai-core/evals.ts");
    const result = await runGaCoreGoldenEvals({ subset: "fast-deterministic" });
    expect(result.pass).toBe(true);
    expect(result.passed).toBe(result.total);
    expect(result.telemetry.trigger_route_attempts).toBe(19);
    expect(result.telemetry.trigger_hit_rate).toBe(1);
  });

  it("runs GA-runtime deterministic blocking fixtures", async () => {
    const { runGaRuntimeGoldenEvals } = await import("../../src/ai-core/evals.ts");
    const result = await runGaRuntimeGoldenEvals({ subset: "fast-deterministic" });
    expect(result.pass).toBe(true);
    expect(result.passed).toBe(4);
  });

  it("rejects GA-core golden yaml with a non-GA suite id", async () => {
    const fixtureRoot = mkdtempSync(join(tmpdir(), "kata-ga-core-wrong-suite-"));
    writeGaCoreGolden(
      fixtureRoot,
      [
        "suite: p0",
        "cases:",
        "  - id: cross-skill-routing",
        "    subset: fast-deterministic",
        "    kind: trigger-routing",
        "    input:",
        "      fixture: fixtures/cross-skill-routing.json",
        "    expected:",
        "      status: passed",
        "",
      ].join("\n"),
    );

    const { loadGaCoreGoldenSuite } = await import("../../src/ai-core/evals.ts");
    expect(() => loadGaCoreGoldenSuite({ root: fixtureRoot })).toThrow(/ga-core/);
  });

  it("fails GA-core deterministic evals when a required golden case is missing", async () => {
    const fixtureRoot = mkdtempSync(join(tmpdir(), "kata-ga-core-missing-case-"));
    cpSync(join(root, ".ai/core"), join(fixtureRoot, ".ai/core"), { recursive: true });
    writeGaCoreGolden(
      fixtureRoot,
      [
        "suite: ga-core",
        "cases:",
        "  - id: cross-skill-routing",
        "    subset: fast-deterministic",
        "    kind: trigger-routing",
        "    input:",
        "      fixture: fixtures/cross-skill-routing.json",
        "    expected:",
        "      status: passed",
        "  - id: maintaining-case-artifacts-not-prd",
        "    subset: fast-deterministic",
        "    kind: trigger-routing",
        "    input:",
        "      fixture: fixtures/maintaining-case-artifacts-not-prd.json",
        "    expected:",
        "      status: passed",
        "      skill_id: case-edit@1",
        "  - id: knowledge-not-code-search",
        "    subset: fast-deterministic",
        "    kind: trigger-routing",
        "    input:",
        "      fixture: fixtures/knowledge-not-code-search.json",
        "    expected:",
        "      status: passed",
        "      skill_id: knowledge-curate@1",
        "",
      ].join("\n"),
    );

    const { runGaCoreGoldenEvals } = await import("../../src/ai-core/evals.ts");
    const result = await runGaCoreGoldenEvals({ subset: "fast-deterministic", root: fixtureRoot });

    expect(result.pass).toBe(false);
    expect(result.failed).toBe(1);
    expect(result.telemetry.failure_modes).toContain("evals.ga_core_contract_invalid");
    expect(result.results[0]?.issues[0]?.message).toContain("workspace-not-specific-workflow");
  });

  it("counts GA-core telemetry by route attempts when one cross-skill input misses", async () => {
    const fixtureRoot = mkdtempSync(join(tmpdir(), "kata-ga-core-route-attempts-"));
    cpSync(join(root, ".ai/core"), join(fixtureRoot, ".ai/core"), { recursive: true });
    writeFileSync(
      join(fixtureRoot, ".ai/core/evals/ga-core/fixtures/cross-skill-routing.json"),
      [
        "{",
        '  "inputs": [',
        '    { "text": "根据 PRD 生成测试用例", "expected_skill_id": "case-draft@1" },',
        '    { "text": "同步 XMind 和 Archive MD", "expected_skill_id": "case-edit@1" },',
        '    { "text": "查一下这个模块的业务术语", "expected_skill_id": "knowledge-curate@1" },',
        '    { "text": "打开完全未知入口", "expected_skill_id": "workspace-manage@1" }',
        "  ]",
        "}",
      ].join("\n"),
    );

    const { runGaCoreGoldenEvals } = await import("../../src/ai-core/evals.ts");
    const result = await runGaCoreGoldenEvals({ subset: "fast-deterministic", root: fixtureRoot });

    expect(result.pass).toBe(false);
    expect(result.telemetry.trigger_route_attempts).toBe(12);
    expect(result.telemetry.trigger_hit_rate).toBe(11 / 12);
    expect(result.telemetry.trigger_miss_rate).toBe(1 / 12);
  });

  it("fails GA-core evals when a fixture expected_skill_id conflicts with golden expected skill", async () => {
    const fixtureRoot = mkdtempSync(join(tmpdir(), "kata-ga-core-fixture-mismatch-"));
    cpSync(join(root, ".ai/core"), join(fixtureRoot, ".ai/core"), { recursive: true });
    writeFileSync(
      join(fixtureRoot, ".ai/core/evals/ga-core/fixtures/maintaining-case-artifacts-not-prd.json"),
      [
        "{",
        '  "input": "帮我把这个 XMind 和 Archive MD 反向同步一下",',
        '  "expected_skill_id": "knowledge-curate@1"',
        "}",
      ].join("\n"),
    );

    const { runGaCoreGoldenEvals } = await import("../../src/ai-core/evals.ts");
    const result = await runGaCoreGoldenEvals({ subset: "fast-deterministic", root: fixtureRoot });

    expect(result.pass).toBe(false);
    expect(result.telemetry.failure_modes).toContain("trigger.fixture_expected_mismatch");
  });
});
