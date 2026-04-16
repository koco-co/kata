import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadBehavioralGolden, runBehavioralEvals } from "../../src/ai-core/behavioral-evals.ts";
import { writeCassette, writeCassetteLock } from "../../src/ai-core/cassette-store.ts";

function tempRoot() {
  return mkdtempSync(join(tmpdir(), "kata-behaveval-test-"));
}

function setupMinimalProject(root: string) {
  // Create .ai/core directory structure
  const aiCore = join(root, ".ai/core");
  mkdirSync(join(aiCore, "evals", "behavioral", "fixtures"), { recursive: true });
  mkdirSync(join(aiCore, "evals", "behavioral", "cassettes"), { recursive: true });
  mkdirSync(join(aiCore, "prompts"), { recursive: true });
  mkdirSync(join(aiCore, "skills", "test-skill"), { recursive: true });
  mkdirSync(join(aiCore, "workflows"), { recursive: true });

  // Create prompt
  writeFileSync(
    join(aiCore, "prompts", "test-prompt.prompt.yaml"),
    [
      "id: test-prompt@1",
      "schema_ref: PromptContract@1",
      "locale: zh-CN",
      "model_lock:",
      "  required_capabilities:",
      "    - structured_output",
      "  minimum_context_tokens: 8000",
      "input_schema:",
      "  name: TestInput@1",
      "  required:",
      "    - text",
      "output_schema:",
      "  name: TestOutput@1",
      "  required:",
      "    - result",
      "rendering:",
      "  role_sections:",
      "    system: 根据需求生成测试用例。",
      "    user: 返回结构化结果。",
      "  boundaries:",
      "    untrusted_context_tag: context",
      "    source_ref_tag: source_ref",
      "prefill:",
      "  enabled: false",
      "  text: ''",
      "fallback:",
      "  deterministic_parse: true",
      "  on_schema_error: refuse",
      "hallucination_policy:",
      "  unknown_fact: put_in_pending_items",
      "  missing_source_ref: refuse",
    ].join("\n"),
  );

  // Create skill
  writeFileSync(
    join(aiCore, "skills", "test-skill", "skill.yaml"),
    [
      "id: test-skill@1",
      "name: test-skill",
      "kind: product-skill",
      "schema_version: 1",
      "skill_version: 1",
      "status: active",
      "description:",
      "  summary: Test skill",
      "body:",
      "  always_load:",
      "    hard_rules:",
      "      - 不得编造需求事实。",
      "      - 不确定内容放入 pending_items。",
    ].join("\n"),
  );

  // Create workflow
  writeFileSync(
    join(aiCore, "workflows", "test-skill.workflow.yaml"),
    [
      "id: test-workflow@1",
      "schema_ref: WorkflowContract@1",
      "entry_skill: test-skill@1",
      "failure_mode: staged_until_final_success",
      "inputs:",
      "  text:",
      "    kind: file_or_fixture",
      "    required: true",
      "steps:",
      "  - id: draft",
      "    uses: agent:worker@1",
      "    prompt: test-prompt@1",
    ].join("\n"),
  );

  // Create fixture
  writeFileSync(
    join(aiCore, "evals", "behavioral", "fixtures", "test-prd.json"),
    JSON.stringify({
      title: "Test Feature",
      description: "A simple test feature",
    }),
  );

  // Create golden
  writeFileSync(
    join(aiCore, "evals", "behavioral", "golden.json"),
    JSON.stringify({
      suite: "behavioral",
      cases: [
        {
          id: "test-case-quality@1",
          subset: "fast-deterministic",
          kind: "llm-as-judge",
          subject_skill: "test-skill@1",
          input_fixture: "fixtures/test-prd.json",
          rubric: {
            criteria: ["输出必须包含 source_ref", "不得编造需求中不存在的功能"],
            threshold: 0.85,
          },
          judge_model: {
            provider: "deepseek",
            model_id: "deepseek-chat",
            base_url: "https://api.deepseek.com/v1",
            api_key_env: "DEEPSEEK_API_KEY",
          },
          samples: 1,
          aggregation: "majority",
        },
      ],
    }),
  );
}

describe("loadBehavioralGolden", () => {
  let root: string;

  beforeEach(() => {
    root = tempRoot();
    setupMinimalProject(root);
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it("parses golden.json into case array", () => {
    const cases = loadBehavioralGolden({ root });
    expect(cases.length).toBe(1);
    expect(cases[0].id).toBe("test-case-quality@1");
    expect(cases[0].subject_skill).toBe("test-skill@1");
    expect(cases[0].rubric.criteria.length).toBe(2);
    expect(cases[0].rubric.threshold).toBe(0.85);
    expect(cases[0].judge_model.provider).toBe("deepseek");
    expect(cases[0].samples).toBe(1);
    expect(cases[0].aggregation).toBe("majority");
  });

  it("throws for missing golden file", () => {
    rmSync(join(root, ".ai/core/evals/behavioral/golden.json"));
    expect(() => loadBehavioralGolden({ root })).toThrow();
  });
});

describe("runBehavioralEvals replay mode", () => {
  let root: string;

  beforeEach(() => {
    root = tempRoot();
    setupMinimalProject(root);

    // Pre-create cassette for replay
    const cassetteRoot = join(root, ".ai/core/evals/behavioral/cassettes");
    writeCassette({
      id: "test-case-quality@1",
      subjectSkill: "test-skill@1",
      inputFixture: "fixtures/test-prd.json",
      promptText:
        "不得编造需求事实。\n\n不确定内容放入 pending_items。\n\n根据需求生成测试用例。\n返回结构化结果。",
      output: {
        subject_output:
          '{"cases": [{"module": "test", "scenario": "basic", "source_refs": ["prd.file:test#sha256:abc"]}], "pending_items": []}',
        judge_result: {
          score: 0.92,
          pass: true,
          rationale: "所有用例有 source_ref，无编造。",
        },
      },
      cassetteRoot,
      root,
    });
    writeCassetteLock({ cassetteRoot, root });
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it("replay mode passes with valid cassette", async () => {
    const result = await runBehavioralEvals({ mode: "replay", root });
    expect(result.suite).toBe("behavioral");
    expect(result.pass).toBe(true);
    expect(result.results[0].pass).toBe(true);
    expect(result.results[0].mode).toBe("replay");
  });

  it("replay mode fails when cassette is missing", async () => {
    // Remove cassette files
    const cassetteDir = join(root, ".ai/core/evals/behavioral/cassettes");
    const entries = readdirSync(cassetteDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.endsWith(".json") && entry.name !== "_lock.json") {
        rmSync(join(cassetteDir, entry.name));
      }
    }
    rmSync(join(cassetteDir, "_lock.json"), { force: true });

    const result = await runBehavioralEvals({ mode: "replay", root });
    expect(result.pass).toBe(false);
    expect(result.results[0].pass).toBe(false);
    expect(result.results[0].rationale).toContain("Cassette not found");
  });
});
