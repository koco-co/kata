import { describe, expect, it } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { parseProductSkillContract } from "../../src/ai-core/product-skill-contract.ts";

const VALID = `id: case-draft@1
name: case-draft
kind: product-skill
schema_version: 1
skill_version: 1
status: active
description:
  summary: 用户要求生成 QA 测试用例。
  must_trigger_when:
    - User asks for test cases.
  must_not_trigger_when:
    - User asks for browser automation.
outputs:
  - archive
allowed_tools:
  - read_file
context_budget:
  core_tokens: 900
evidence:
  required_source_refs:
    - prd.file@1
  stale_ref_policy: block
failure_policy:
  missing_evidence: refuse_with_questions
body:
  always_load:
    routing_summary:
      - Generate QA cases from grounded requirements.
    hard_rules:
      - Do not invent facts.
references:
  - path: references/test-case-standards.md
    type: normative
    generated_from: body.always_load.hard_rules
    load_phases:
      - write
      - review
    purpose: Apply QA case writing standards only while drafting or reviewing Archive output.
    load_when: outputs.ids contains archive
few_shots:
  - path: references/test-case-standards.md
    load_phases:
      - write
      - review
    purpose: Reuse formatting examples only after requirements evidence is established.
    load_when: outputs.ids contains archive
    max_tokens: 1200
	`;

function parseWorkflowEntrySkill(text: string): string {
  return text.match(/^entry_skill:\s*(\S+)$/m)?.[1] ?? "";
}

function parseWorkflowStepIds(text: string): string[] {
  return [...text.matchAll(/^\s+- id:\s*([A-Za-z0-9_-]+)\s*$/gm)].map((match) => match[1]);
}

function extractStepIdsFromLoadWhen(loadWhen: string): string[] {
  const ids = new Set<string>();
  for (const match of loadWhen.matchAll(/step\.id\s*==\s*([A-Za-z0-9_-]+)/g)) {
    ids.add(match[1]);
  }
  for (const match of loadWhen.matchAll(/step\.id\s+in\s+\[([^\]]+)\]/g)) {
    for (const raw of match[1].split(",")) {
      const id = raw.trim();
      if (id) ids.add(id);
    }
  }
  return [...ids].sort();
}

describe("product skill contract parser", () => {
  it("parses the projection fields used by skill-renderer", () => {
    const result = parseProductSkillContract(VALID, ".ai/core/skills/case-draft/skill.yaml");

    expect(result.ok).toBe(true);
    expect(result.value).toMatchObject({
      name: "case-draft",
      summary: "用户要求生成 QA 测试用例。",
      mustTriggerWhen: ["User asks for test cases."],
      mustNotTriggerWhen: ["User asks for browser automation."],
      outputs: ["archive"],
      allowedTools: ["read_file"],
      contextBudgetLines: ["core_tokens: 900"],
      alwaysLoad: [],
      routingSummary: ["Generate QA cases from grounded requirements."],
      loadWhen: [],
      hardRules: ["Do not invent facts."],
      references: [
        {
          path: "references/test-case-standards.md",
          type: "normative",
          generatedFrom: "body.always_load.hard_rules",
          loadPhases: ["write", "review"],
          purpose:
            "Apply QA case writing standards only while drafting or reviewing Archive output.",
          loadWhen: "outputs.ids contains archive",
        },
      ],
      fewShots: [
        {
          path: "references/test-case-standards.md",
          loadPhases: ["write", "review"],
          purpose: "Reuse formatting examples only after requirements evidence is established.",
          loadWhen: "outputs.ids contains archive",
          maxTokens: 1200,
        },
      ],
      evidencePolicy: { required_source_refs: ["prd.file@1"], stale_ref_policy: "block" },
      failurePolicy: { missing_evidence: "refuse_with_questions" },
    });
  });

  it("parses optional body.codex_override into codexOverrides", () => {
    const text = VALID.replace(
      "    hard_rules:\n      - Do not invent facts.",
      [
        "    hard_rules:",
        "      - Do not invent facts.",
        "  codex_override:",
        "    routing_summary:",
        "      - Codex routing line.",
        "    hard_rules:",
        "      - Codex-only rule one.",
        "      - Codex-only rule two.",
      ].join("\n"),
    );
    const result = parseProductSkillContract(text, ".ai/core/skills/case-draft/skill.yaml");

    expect(result.ok).toBe(true);
    expect(result.value?.codexOverrides).toEqual({
      routingSummary: ["Codex routing line."],
      hardRules: ["Codex-only rule one.", "Codex-only rule two."],
    });
    expect(result.value?.hardRules).toEqual(["Do not invent facts."]);
    expect(result.value?.routingSummary).toEqual(["Generate QA cases from grounded requirements."]);
  });

  it("defaults codexOverrides to empty arrays when body.codex_override absent", () => {
    const result = parseProductSkillContract(VALID, ".ai/core/skills/case-draft/skill.yaml");
    expect(result.ok).toBe(true);
    expect(result.value?.codexOverrides).toEqual({ routingSummary: [], hardRules: [] });
  });

  it("fails closed on duplicate nested keys", () => {
    const text = VALID.replace(
      "  summary: 用户要求生成 QA 测试用例。",
      "  summary: 用户要求生成 QA 测试用例。\n  summary: Duplicate.",
    );
    const result = parseProductSkillContract(text, "bad.yaml");

    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain("product_skill.duplicate_key");
  });

  it("fails closed on inline comments in parsed scalar fields", () => {
    const text = VALID.replace("name: case-draft", "name: case-draft # bad");
    const result = parseProductSkillContract(text, "bad.yaml");

    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain("yaml.unsupported_inline_comment");
  });

  it("fails closed when legacy body.load_when entries are used", () => {
    const text = VALID.replace(
      "references:",
      [
        "  load_when:",
        "    - path: references/source-refs.md",
        "      condition: evidence_policy.required_source_refs contains prd.file@1",
        "references:",
      ].join("\n"),
    );
    const result = parseProductSkillContract(text, "bad.yaml");

    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain(
      "product_skill.legacy_load_when_blocked",
    );
  });

  it("fails closed when references omit progressive disclosure fields", () => {
    const text = VALID.replace(
      [
        "    load_phases:",
        "      - write",
        "      - review",
        "    purpose: Apply QA case writing standards only while drafting or reviewing Archive output.",
      ].join("\n"),
      "",
    );
    const result = parseProductSkillContract(text, "bad.yaml");

    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain("product_skill.invalid_reference");
  });

  it("fails closed when few-shots omit progressive disclosure fields", () => {
    const text = VALID.replace(
      [
        "    load_phases:",
        "      - write",
        "      - review",
        "    purpose: Reuse formatting examples only after requirements evidence is established.",
      ].join("\n"),
      "",
    );
    const result = parseProductSkillContract(text, "bad.yaml");

    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain("product_skill.invalid_few_shot");
  });

  it("fails closed when description summary contains workflow instructions", () => {
    const text = VALID.replace(
      "  summary: 用户要求生成 QA 测试用例。",
      "  summary: 先读取 PRD 然后输出测试用例。",
    );
    const result = parseProductSkillContract(text, "bad.yaml");

    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain(
      "product_skill.description_not_trigger_only",
    );
  });

  it("fails closed when description summary is not trigger framed", () => {
    const text = VALID.replace(
      "  summary: 用户要求生成 QA 测试用例。",
      "  summary: Generate QA test cases.",
    );
    const result = parseProductSkillContract(text, "bad.yaml");

    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain(
      "product_skill.description_not_trigger_only",
    );
  });

  it("fails closed on empty scalar list items", () => {
    const text = VALID.replace("allowed_tools:\n  - read_file", "allowed_tools:\n  - ");
    const result = parseProductSkillContract(text, "bad.yaml");

    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain("product_skill.missing_field");
  });

  it("fails closed on mapping-shaped scalar list items", () => {
    const text = VALID.replace(
      "allowed_tools:\n  - read_file",
      "allowed_tools:\n  - path: read_file",
    );
    const result = parseProductSkillContract(text, "bad.yaml");

    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain("product_skill.missing_field");
  });

  it("fails closed on missing required projection fields", () => {
    const result = parseProductSkillContract(VALID.replace("name: case-draft\n", ""), "bad.yaml");

    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain("product_skill.missing_field");
  });

  it("fails closed on unsupported yaml syntax", () => {
    const cases: Array<[string, string]> = [
      [
        "yaml.unsupported_indentation",
        VALID.replace(
          "  summary: 用户要求生成 QA 测试用例。",
          "\tsummary: 用户要求生成 QA 测试用例。",
        ),
      ],
      [
        "yaml.unsupported_block_scalar",
        VALID.replace("  summary: 用户要求生成 QA 测试用例。", "  summary: |"),
      ],
      [
        "yaml.unsupported_flow_collection",
        VALID.replace("outputs:\n  - archive", "outputs: [archive]"),
      ],
      [
        "yaml.unsupported_node_modifier",
        VALID.replace("name: case-draft", "name: &skill case-draft"),
      ],
    ];

    for (const [code, text] of cases) {
      const result = parseProductSkillContract(text, "bad.yaml");
      expect(result.ok).toBe(false);
      expect(result.issues.map((issue) => issue.code)).toContain(code);
    }
  });

  it("case-draft references include progressive workflow files and rules", async () => {
    const skillYamlPath = resolve(
      import.meta.dirname,
      "../../../.ai/core/skills/case-draft/skill.yaml",
    );
    const workflowPath = resolve(
      import.meta.dirname,
      "../../../.ai/core/workflows/case-draft-from-prd.workflow.yaml",
    );
    const yamlText = await Bun.file(skillYamlPath).text();
    const workflowStepIds = new Set(parseWorkflowStepIds(await Bun.file(workflowPath).text()));
    const removedPhases = new Set(["probe", "discuss", "analyze", "write", "format-check"]);
    const result = parseProductSkillContract(yamlText, ".ai/core/skills/case-draft/skill.yaml");
    expect(result.ok).toBe(true);
    const referencePaths = result.value.references.map((r) => r.path);
    expect(referencePaths).toEqual(
      expect.arrayContaining([
        "references/source-intake-protocol.md",
        "references/module-identify.md",
        "references/historical-context.md",
        "references/atomization-guide.md",
        "references/ambiguity-decision-tree.md",
        "references/confirmation-package-template.md",
        "references/coverage-matrix-guide.md",
        "references/case-review-evidence-gates.md",
        "references/automation-handoff-spec.md",
        "references/error-fallback-paths.md",
      ]),
    );

    for (const item of [...result.value.references, ...result.value.fewShots]) {
      expect(item.loadPhases.length).toBeGreaterThan(0);
      expect(item.purpose.length).toBeGreaterThan(0);
      for (const phase of item.loadPhases) {
        expect(workflowStepIds.has(phase)).toBe(true);
        expect(removedPhases.has(phase)).toBe(false);
      }
    }

    const hardRules = result.value.hardRules.join("\n");
    for (const required of [
      "Lanhu/Axure URL 的 source-intake、token 搜索顺序、抓取降级",
      "项目未指定时先自行推断",
      "历史上下文：history_inferred 作为参考证据使用",
      "每个 requirement atom 携带 evidence_kind、ambiguity_class、confidence",
      "archive.md 与 cases.xmind 在 blocking pending 清零后生成",
      "blocking pending 非零时只输出草稿与确认类产物",
      "automation_status=ready 的 AutomationIntent@1 移交 playwright-automation@1",
    ]) {
      expect(hardRules).toContain(required);
    }
  });

  it("case-hotfix loads executable Hotfix archive format rules", async () => {
    const skillYamlPath = resolve(
      import.meta.dirname,
      "../../../.ai/core/skills/case-hotfix/skill.yaml",
    );
    const yamlText = await Bun.file(skillYamlPath).text();
    const result = parseProductSkillContract(yamlText, ".ai/core/skills/case-hotfix/skill.yaml");

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.references.map((ref) => ref.path)).toContain(
      "references/hotfix-archive-format.md",
    );
    expect(result.value.references).toContainEqual(
      expect.objectContaining({
        path: "references/hotfix-archive-format.md",
        type: "normative",
        loadPhases: expect.arrayContaining(["draft_cases", "review_cases", "output"]),
        loadWhen: "outputs.ids contains archive",
      }),
    );

    const hardRules = result.value.hardRules.join("\n");
    expect(hardRules).toContain("Hotfix 输出必须是可直接执行的 archive.md");
    expect(hardRules).toContain("Hotfix archive 必须只包含 1 条用例");
    expect(hardRules).toContain("前置条件必须优先给出可复制执行的 SQL");
    expect(hardRules).toContain("Hotfix md 不得包含 SourceRefs");
    expect(hardRules).toContain("Hotfix 必须输出为独立目录");
    expect(hardRules).toContain("SourceRefs 只能写入 hotfix 目录内的 source_refs.json");
    expect(hardRules).toContain("frontmatter 必须包含 zentao_url");
    expect(hardRules).toContain("前置条件必须使用单个无语言标记的代码块");
    expect(hardRules).toContain("SQL 不得写固定库名/schema 前缀");
    expect(hardRules).toContain("原始抓取证据必须写入 hotfix 目录内的 .temp");
    expect(hardRules).toContain("Spark SQL 不得生成所有字段均为分区字段的 CREATE TABLE");
    expect(hardRules).toContain("主缺陷复现表必须保持证据要求的特殊数据形态");

    const formatReference = readFileSync(
      join(
        import.meta.dirname,
        "../../../.ai/core/skills/case-hotfix/references/hotfix-archive-format.md",
      ),
      "utf8",
    );
    expect(formatReference).toContain(
      "workspace/{project}/_shared/archive/issues/{YYYYMM}/hotfix_{fix_branch_or_bug_id}-{short-title}/",
    );
    expect(formatReference).toContain("archive.md");
    expect(formatReference).toContain("source_refs.json");
    expect(formatReference).toContain(".temp/");
    expect(formatReference).toContain("zentao_url");
    expect(formatReference).toContain("不得使用 ```sql");
    expect(formatReference).toContain("直接使用裸表名");
    expect(formatReference).toContain("ALL_PARTITION_COLUMNS_NOT_ALLOWED");
    expect(formatReference).toContain("Hive CLI / HMS");
    expect(formatReference).toContain("主缺陷复现表仍必须是所有字段均为分区字段");
    expect(formatReference).toContain("不得用普通字段 + 分区字段的相邻回归表替代");
    expect(formatReference).toContain("不得写入仓库根级 `workspace/.temp`");
    expect(formatReference).toContain(
      "6.3 | 数据质量 | SparkThrift | | 6.3 | 增量sql中完整性校验json格式校验sql模板未考虑到分区",
    );
    expect(formatReference).toContain("第 5 段必须归一化为最低修复大版本");
    expect(formatReference).toContain("不得写 `v6.3.41_ltqc`");
    expect(formatReference).toContain("不得写成「代码缺陷」「需求变更」「配置错误」等分类词");
    expect(formatReference).not.toContain("Archive 正文必须包含 `## SourceRefs`");
  });

  it("accepts playwright-automation with phase-scoped references and compact description", () => {
    const source = readFileSync(
      join(import.meta.dirname, "../../../.ai/core/skills/playwright-automation/skill.yaml"),
      "utf8",
    );
    const result = parseProductSkillContract(
      source,
      ".ai/core/skills/playwright-automation/skill.yaml",
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.name).toBe("playwright-automation");
    expect(result.value.references.map((ref) => ref.path)).toEqual([
      "references/case-normalize.md",
      "references/env-preflight.md",
      "references/ui-plan.md",
      "references/ui-probe.md",
      "references/plan-reconcile.md",
      "references/playwright-generate.md",
      "references/self-run.md",
      "references/run-triage.md",
      "references/repair-loop.md",
      "references/quality-gate.md",
      "references/handoff.md",
      "references/execution-protocol.md",
      "references/worker-prompt.md",
      "references/spec-reviewer-prompt.md",
      "references/quality-reviewer-prompt.md",
      "references/case-feedback.md",
    ]);
    expect(result.value.hardRules.length).toBeGreaterThan(0);
  });

  it("real product skill reference load phases target existing workflow steps", () => {
    const repoRoot = resolve(import.meta.dirname, "../../..");
    const workflowsRoot = resolve(repoRoot, ".ai/core/workflows");
    const skillsRoot = resolve(repoRoot, ".ai/core/skills");
    const stepIdsByEntrySkill = new Map<string, Set<string>>();

    for (const entry of readdirSync(workflowsRoot, { withFileTypes: true })) {
      if (!entry.isFile() || !entry.name.endsWith(".workflow.yaml")) continue;
      const text = readFileSync(resolve(workflowsRoot, entry.name), "utf8");
      const entrySkill = parseWorkflowEntrySkill(text);
      if (entrySkill) stepIdsByEntrySkill.set(entrySkill, new Set(parseWorkflowStepIds(text)));
    }

    for (const entry of readdirSync(skillsRoot, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const skillPath = resolve(skillsRoot, entry.name, "skill.yaml");
      const text = readFileSync(skillPath, "utf8");
      const result = parseProductSkillContract(text, `.ai/core/skills/${entry.name}/skill.yaml`);
      expect(result.ok).toBe(true);

      const stepIds = stepIdsByEntrySkill.get(`${result.value.name}@1`);
      expect(stepIds).toBeDefined();
      if (!stepIds) continue;

      for (const item of [...result.value.references, ...result.value.fewShots]) {
        for (const phase of item.loadPhases) {
          expect(stepIds.has(phase)).toBe(true);
        }
        const explicitStepIds = extractStepIdsFromLoadWhen(item.loadWhen);
        for (const id of explicitStepIds) {
          expect(stepIds.has(id)).toBe(true);
        }
      }
    }
  });
});
