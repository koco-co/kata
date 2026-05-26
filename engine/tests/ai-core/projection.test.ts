import { describe, expect, it } from "bun:test";
import { createHash } from "node:crypto";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { checkProjection, renderProjection } from "../../src/ai-core/projection.ts";
import { freezeVendorSkill } from "../../src/ai-core/vendor.ts";

const root = join(import.meta.dirname, "../../..");
const generatedProjectionPaths = [
  "CLAUDE.md",
  ".claude/INDEX.md",
  ".agents/INDEX.md",
  ".claude/skills/conflict-analyze/SKILL.md",
  ".claude/skills/case-hotfix/SKILL.md",
  ".claude/skills/case-hotfix/references/hotfix-archive-format.md",
  ".claude/skills/playwright-automation/SKILL.md",
  ".claude/skills/playwright-automation/references/case-feedback.md",
  ".claude/skills/playwright-automation/references/case-normalize.md",
  ".claude/skills/playwright-automation/references/env-preflight.md",
  ".claude/skills/playwright-automation/references/execution-protocol.md",
  ".claude/skills/playwright-automation/references/ui-plan.md",
  ".claude/skills/playwright-automation/references/ui-probe.md",
  ".claude/skills/playwright-automation/references/plan-reconcile.md",
  ".claude/skills/playwright-automation/references/playwright-generate.md",
  ".claude/skills/playwright-automation/references/quality-gate.md",
  ".claude/skills/playwright-automation/references/quality-reviewer-prompt.md",
  ".claude/skills/playwright-automation/references/self-run.md",
  ".claude/skills/playwright-automation/references/run-triage.md",
  ".claude/skills/playwright-automation/references/repair-loop.md",
  ".claude/skills/playwright-automation/references/spec-reviewer-prompt.md",
  ".claude/skills/playwright-automation/references/handoff.md",
  ".claude/skills/playwright-automation/references/worker-prompt.md",
  ".claude/skills/case-edit/SKILL.md",
  ".claude/skills/case-edit/references/apply-corrections.md",
  ".claude/skills/case-edit/references/archive-xmind-sync.md",
  ".claude/skills/case-edit/references/fewshots/case-format-sample.md",
  ".claude/skills/case-edit/references/fewshots/case-format-sample.xmind.md",
  ".claude/skills/case-draft/SKILL.md",
  ".claude/skills/case-draft/references/source-intake-protocol.md",
  ".claude/skills/case-draft/references/module-identify.md",
  ".claude/skills/case-draft/references/output-standard.md",
  ".claude/skills/case-draft/references/historical-context.md",
  ".claude/skills/case-draft/references/atomization-guide.md",
  ".claude/skills/case-draft/references/ambiguity-decision-tree.md",
  ".claude/skills/case-draft/references/confirmation-package-template.md",
  ".claude/skills/case-draft/references/coverage-matrix-guide.md",
  ".claude/skills/case-draft/references/case-review-evidence-gates.md",
  ".claude/skills/case-draft/references/automation-handoff-spec.md",
  ".claude/skills/case-draft/references/error-fallback-paths.md",
  ".claude/skills/case-draft/references/execution-protocol.md",
  ".claude/skills/case-draft/references/fewshots/case-format-sample.md",
  ".claude/skills/case-draft/references/fewshots/case-format-sample.xmind.md",
  ".claude/skills/case-draft/references/quality-reviewer-prompt.md",
  ".claude/skills/case-draft/references/spec-reviewer-prompt.md",
  ".claude/skills/case-draft/references/source-confirm.md",
  ".claude/skills/case-draft/references/worker-prompt.md",
  ".claude/skills/knowledge-curate/SKILL.md",
  ".claude/skills/knowledge-curate/references/knowledge-rules.md",
  ".claude/skills/workspace-manage/SKILL.md",
  ".claude/skills/workspace-manage/references/project-layout.md",
  ".claude/skills/bug-file/SKILL.md",
  ".claude/skills/diff-scan/SKILL.md",
  ".claude/skills/infra-diagnose/SKILL.md",
  ".claude/skills/infra-diagnose/references/diagnostic-playbook.md",
  ".claude/skills/infra-diagnose/references/ssh-protocol.md",
  ".claude/skills/infra-diagnose/references/knowledge-format.md",
  "AGENTS.md",
  ".agents/skills/conflict-analyze/SKILL.md",
  ".agents/skills/case-hotfix/SKILL.md",
  ".agents/skills/case-hotfix/references/hotfix-archive-format.md",
  ".agents/skills/playwright-automation/SKILL.md",
  ".agents/skills/playwright-automation/references/case-feedback.md",
  ".agents/skills/playwright-automation/references/case-normalize.md",
  ".agents/skills/playwright-automation/references/env-preflight.md",
  ".agents/skills/playwright-automation/references/execution-protocol.md",
  ".agents/skills/playwright-automation/references/ui-plan.md",
  ".agents/skills/playwright-automation/references/ui-probe.md",
  ".agents/skills/playwright-automation/references/plan-reconcile.md",
  ".agents/skills/playwright-automation/references/playwright-generate.md",
  ".agents/skills/playwright-automation/references/quality-gate.md",
  ".agents/skills/playwright-automation/references/quality-reviewer-prompt.md",
  ".agents/skills/playwright-automation/references/self-run.md",
  ".agents/skills/playwright-automation/references/run-triage.md",
  ".agents/skills/playwright-automation/references/repair-loop.md",
  ".agents/skills/playwright-automation/references/spec-reviewer-prompt.md",
  ".agents/skills/playwright-automation/references/handoff.md",
  ".agents/skills/playwright-automation/references/worker-prompt.md",
  ".agents/skills/case-edit/SKILL.md",
  ".agents/skills/case-edit/references/apply-corrections.md",
  ".agents/skills/case-edit/references/archive-xmind-sync.md",
  ".agents/skills/case-edit/references/fewshots/case-format-sample.md",
  ".agents/skills/case-edit/references/fewshots/case-format-sample.xmind.md",
  ".agents/skills/case-draft/SKILL.md",
  ".agents/skills/case-draft/references/source-intake-protocol.md",
  ".agents/skills/case-draft/references/module-identify.md",
  ".agents/skills/case-draft/references/output-standard.md",
  ".agents/skills/case-draft/references/historical-context.md",
  ".agents/skills/case-draft/references/atomization-guide.md",
  ".agents/skills/case-draft/references/ambiguity-decision-tree.md",
  ".agents/skills/case-draft/references/confirmation-package-template.md",
  ".agents/skills/case-draft/references/coverage-matrix-guide.md",
  ".agents/skills/case-draft/references/case-review-evidence-gates.md",
  ".agents/skills/case-draft/references/automation-handoff-spec.md",
  ".agents/skills/case-draft/references/error-fallback-paths.md",
  ".agents/skills/case-draft/references/execution-protocol.md",
  ".agents/skills/case-draft/references/fewshots/case-format-sample.md",
  ".agents/skills/case-draft/references/fewshots/case-format-sample.xmind.md",
  ".agents/skills/case-draft/references/quality-reviewer-prompt.md",
  ".agents/skills/case-draft/references/spec-reviewer-prompt.md",
  ".agents/skills/case-draft/references/source-confirm.md",
  ".agents/skills/case-draft/references/worker-prompt.md",
  ".agents/skills/knowledge-curate/SKILL.md",
  ".agents/skills/knowledge-curate/references/knowledge-rules.md",
  ".agents/skills/workspace-manage/SKILL.md",
  ".agents/skills/workspace-manage/references/project-layout.md",
  ".agents/skills/bug-file/SKILL.md",
  ".agents/skills/diff-scan/SKILL.md",
  ".agents/skills/infra-diagnose/SKILL.md",
  ".agents/skills/infra-diagnose/references/diagnostic-playbook.md",
  ".agents/skills/infra-diagnose/references/ssh-protocol.md",
  ".agents/skills/infra-diagnose/references/knowledge-format.md",
];
const vendorProjectionPaths = [
  ".claude/skills/playwright-cli/SKILL.md",
  ".agents/skills/playwright-cli/SKILL.md",
];
const productSkills = [
  "conflict-analyze",
  "case-hotfix",
  "playwright-automation",
  "case-edit",
  "case-draft",
  "knowledge-curate",
  "workspace-manage",
  "bug-file",
  "diff-scan",
  "infra-diagnose",
];

function inventoryRows(): Array<{ path: string; disposition: string }> {
  const text = readFileSync(join(root, ".ai/core/runtimes/projection-inventory.yaml"), "utf8");
  const rows: Array<{ path: string; disposition: string }> = [];
  let current: Partial<{ path: string; disposition: string }> | undefined;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (line.startsWith("- path:")) {
      if (current?.path && current.disposition)
        rows.push(current as { path: string; disposition: string });
      current = { path: line.slice("- path:".length).trim() };
    } else if (current && line.startsWith("disposition:")) {
      current.disposition = line.slice("disposition:".length).trim();
    }
  }
  if (current?.path && current.disposition)
    rows.push(current as { path: string; disposition: string });
  return rows;
}

function copyCoreFixture(): string {
  const tempRoot = mkdtempSync(join(tmpdir(), "kata-core-fixture-"));
  const coreRoot = join(tempRoot, ".ai/core");
  mkdirSync(dirname(coreRoot), { recursive: true });
  cpSync(join(root, ".ai/core"), coreRoot, { recursive: true });
  return coreRoot;
}

function pinCoreFixtureManifestHash(coreRoot: string, manifestPath: string): void {
  const contractPath = join(coreRoot, "external-skills/playwright-cli.yaml");
  const hash = createHash("sha256").update(readFileSync(manifestPath)).digest("hex");
  writeFileSync(
    contractPath,
    readFileSync(contractPath, "utf8").replace(
      /manifest_hash: sha256:[a-f0-9]{64}/,
      `manifest_hash: sha256:${hash}`,
    ),
  );
}

function declaredSkillReferences(skillName: string): string[] {
  const source = readFileSync(join(root, ".ai/core/skills", skillName, "skill.yaml"), "utf8");
  const refs: string[] = [];
  const lines = source.split(/\r?\n/);
  let currentPath: string | undefined;
  for (const raw of lines) {
    const always = raw.match(/^\s+-\s+(references\/.+)$/);
    if (always) refs.push(always[1].trim());
    const path = raw.match(/^\s+- path:\s*(references\/.+)$/);
    if (path) {
      currentPath = path[1].trim();
      continue;
    }
    if (currentPath && raw.match(/^\s+condition:\s+.+$/)) {
      refs.push(currentPath);
      currentPath = undefined;
    }
  }
  return [...new Set(refs)].sort();
}

describe("ai-core projection", () => {
  it("renders root runtime docs with generated command index blocks", async () => {
    const out = mkdtempSync(join(tmpdir(), "kata-root-projection-"));
    const result = await renderProjection({ runtime: "all", outputRoot: out });
    expect(result.ok).toBe(true);
    const agents = readFileSync(join(out, "AGENTS.md"), "utf8");
    const claude = readFileSync(join(out, "CLAUDE.md"), "utf8");
    expect(agents).toContain("<!-- ai-core:start command-index -->");
    expect(agents).toContain("/workspace-manage");
    expect(agents).toContain("/case-draft");
    expect(agents).toContain("/case-edit");
    expect(agents).toContain("/knowledge-curate");
    expect(claude).toContain("<!-- ai-core:start command-index -->");
    expect(claude).toContain("/workspace-manage");
    expect(claude).toContain("/case-draft");
    expect(claude).toContain("/case-edit");
    expect(claude).toContain("/knowledge-curate");
  });

  it("generates root runtime docs as full-file output with command index", async () => {
    const out = mkdtempSync(join(tmpdir(), "kata-root-projection-"));
    const result = await renderProjection({ runtime: "all", outputRoot: out });

    expect(result.ok).toBe(true);
    for (const runtimeDoc of ["AGENTS.md", "CLAUDE.md"]) {
      const doc = readFileSync(join(out, runtimeDoc), "utf8");
      expect(doc).toContain("## 命令索引");
      expect(doc).toContain("<!-- ai-core:start command-index -->");
      expect(doc).toContain("<!-- ai-core:end command-index -->");
      expect(doc).toContain("| /workspace-manage | workspace-manage@1 |");
      expect(doc).toContain("## 构建与测试");
      expect(doc).toContain("## 关键约束");
      expect(doc).toContain("**Commit 规范**");
      expect(doc).toContain("`type: emoji description`");
    }
  });

  it("generates full root runtime docs with command index and boundary sections", async () => {
    const out = mkdtempSync(join(tmpdir(), "kata-root-projection-"));
    const result = await renderProjection({ runtime: "codex", outputRoot: out });

    expect(result.ok).toBe(true);
    const agents = readFileSync(join(out, "AGENTS.md"), "utf8");
    expect(agents).toContain("## 命令索引");
    expect(agents).toContain("<!-- ai-core:start command-index -->");
    expect(agents).toContain("<!-- ai-core:end command-index -->");
    expect(agents).toContain("## 构建与测试");
    expect(agents).toContain("## 关键约束");
  });

  it("projects a compact root routing guard without workflow banlists", async () => {
    const out = mkdtempSync(join(tmpdir(), "kata-root-projection-"));
    const result = await renderProjection({ runtime: "all", outputRoot: out });

    expect(result.ok).toBe(true);
    for (const runtimeDoc of ["AGENTS.md", "CLAUDE.md"]) {
      const doc = readFileSync(join(out, runtimeDoc), "utf8");
      expect(doc).toContain("## 路由规则");
      expect(doc).toContain("仅输入 Lanhu/Axure URL");
      expect(doc).toContain("静默转发到 `case-draft`");
      expect(doc).toContain("仅输入 ZenTao bug URL");
      expect(doc).toContain("转发到 `case-hotfix`");
      expect(doc).toContain("/playwright-automation` 缺少环境参数");
      expect(doc).toContain("按 skill 内置环境确认协议处理");
      expect(doc).toContain("详细输出契约、回退模板和回归约束见 `.ai/core/skills/**` 与对应测试");

      expect(doc).not.toContain("## Routing Guard");
      expect(doc).not.toContain("`Using playwright-automation`");
      expect(doc).not.toContain("`目标目录已定位`");
      expect(doc).not.toContain("`Based on the search results`");
      expect(doc).not.toContain(
        "environment fallback option facts must not append tenant or project ids",
      );
      expect(doc).not.toContain("Probe scripts that read repo-root relative storageState");
      expect(doc).not.toContain("`探测结果显示`");
    }
  });

  it("renders case-draft downstream agents, prompt, and plugin into runtime index", async () => {
    const out = mkdtempSync(join(tmpdir(), "kata-index-projection-"));
    const result = await renderProjection({ runtime: "claude", outputRoot: out });

    expect(result.ok).toBe(true);
    const index = readFileSync(join(out, ".claude/INDEX.md"), "utf8");
    const row = index.split(/\r?\n/).find((line) => line.startsWith("| /case-draft |"));
    expect(row).toContain("case-draft-worker@1");
    expect(row).toContain("case-reviewer@1");
    expect(row).toContain("case-draft-prompt@1");
    expect(row).toContain("lanhu.design-source@1");
  });

  it("detects generated root runtime doc drift", async () => {
    const out = mkdtempSync(join(tmpdir(), "kata-root-projection-"));
    await renderProjection({ runtime: "all", outputRoot: out });
    writeFileSync(
      join(out, "AGENTS.md"),
      readFileSync(join(out, "AGENTS.md"), "utf8").replace(
        "| /workspace-manage |",
        "| /workspace-manage-drift |",
      ),
    );
    writeFileSync(
      join(out, "CLAUDE.md"),
      readFileSync(join(out, "CLAUDE.md"), "utf8").replace(
        "| /workspace-manage |",
        "| /workspace-manage-drift |",
      ),
    );

    const drift = await checkProjection({ runtime: "all", outputRoot: out });

    expect(drift.ok).toBe(false);
    const agentIssue = drift.issues.find((i) => i.path === "AGENTS.md");
    const claudeIssue = drift.issues.find((i) => i.path === "CLAUDE.md");
    expect(agentIssue).toBeTruthy();
    expect(claudeIssue).toBeTruthy();
  });

  it("rejects duplicate root runtime doc content", async () => {
    const out = mkdtempSync(join(tmpdir(), "kata-root-projection-"));
    await renderProjection({ runtime: "codex", outputRoot: out });
    const agents = readFileSync(join(out, "AGENTS.md"), "utf8");
    writeFileSync(join(out, "AGENTS.md"), `${agents}\n${agents}`);

    const drift = await checkProjection({ runtime: "codex", outputRoot: out });

    expect(drift.ok).toBe(false);
  });

  it("rejects unbalanced generated command index markers", async () => {
    const out = mkdtempSync(join(tmpdir(), "kata-root-projection-"));
    writeFileSync(
      join(out, "AGENTS.md"),
      "Before\n<!-- ai-core:start command-index -->\nmissing end\n",
    );

    const drift = await checkProjection({ runtime: "codex", outputRoot: out });

    expect(drift.ok).toBe(false);
  });

  it("rejects malformed command contract booleans", async () => {
    const out = mkdtempSync(join(tmpdir(), "kata-root-projection-"));
    const coreRoot = copyCoreFixture();
    const commandPath = join(coreRoot, "commands/workspace-manage.command.yaml");
    writeFileSync(
      commandPath,
      readFileSync(commandPath, "utf8").replace("user_invocable: true", "user_invocable: yes"),
    );

    const result = await renderProjection({ runtime: "codex", outputRoot: out, coreRoot });

    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual({
      code: "projection.contract_invalid",
      severity: "error",
      message: "Command contract user_invocable must be exactly true or false.",
      path: ".ai/core/commands/workspace-manage.command.yaml",
    });
  });

  it("fails closed when runtime generated_files yaml has a block scalar", async () => {
    const out = mkdtempSync(join(tmpdir(), "kata-root-projection-"));
    const coreRoot = copyCoreFixture();
    writeFileSync(
      join(coreRoot, "runtimes/codex.yaml"),
      readFileSync(join(coreRoot, "runtimes/codex.yaml"), "utf8").replace(
        /^generated_files:\n(?: {2}- .+\n)+/m,
        "generated_files: |\n  AGENTS.md\n",
      ),
    );

    const result = await checkProjection({ runtime: "codex", outputRoot: out, coreRoot });

    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain("yaml.unsupported_block_scalar");
  });

  it("rejects command contracts missing required fields", async () => {
    const out = mkdtempSync(join(tmpdir(), "kata-root-projection-"));
    const coreRoot = copyCoreFixture();
    const commandPath = join(coreRoot, "commands/case-edit.command.yaml");
    writeFileSync(commandPath, readFileSync(commandPath, "utf8").replace(/^summary: .+\n/m, ""));

    const result = await renderProjection({ runtime: "codex", outputRoot: out, coreRoot });

    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual({
      code: "projection.contract_invalid",
      severity: "error",
      message: "Command contract requires id, skill, user_invocable, and summary.",
      path: ".ai/core/commands/case-edit.command.yaml",
    });
  });

  it("rejects duplicate command ids", async () => {
    const out = mkdtempSync(join(tmpdir(), "kata-root-projection-"));
    const coreRoot = copyCoreFixture();
    writeFileSync(
      join(coreRoot, "commands/z-duplicate.command.yaml"),
      [
        "id: workspace-manage",
        "skill: workspace-manage@1",
        "user_invocable: true",
        "summary: Duplicate command.",
        "",
      ].join("\n"),
    );

    const result = await renderProjection({ runtime: "codex", outputRoot: out, coreRoot });

    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual({
      code: "projection.contract_invalid",
      severity: "error",
      message: "Command contract id must match file basename.",
      path: ".ai/core/commands/z-duplicate.command.yaml",
    });
    expect(result.issues).toContainEqual({
      code: "projection.contract_invalid",
      severity: "error",
      message: "Command contract id must be unique.",
      path: ".ai/core/commands/z-duplicate.command.yaml",
    });
  });

  it("rejects missing required command contracts", async () => {
    const out = mkdtempSync(join(tmpdir(), "kata-root-projection-"));
    const coreRoot = copyCoreFixture();
    rmSync(join(coreRoot, "commands/case-draft.command.yaml"));

    const render = await renderProjection({ runtime: "codex", outputRoot: out, coreRoot });
    const drift = await checkProjection({ runtime: "codex", outputRoot: out, coreRoot });

    for (const result of [render, drift]) {
      expect(result.ok).toBe(false);
      expect(result.issues).toContainEqual({
        code: "projection.contract_invalid",
        severity: "error",
        message: "Required command contract is missing.",
        path: ".ai/core/commands/case-draft.command.yaml",
      });
    }
  });

  it("escapes markdown table pipes in generated command index fields", async () => {
    const out = mkdtempSync(join(tmpdir(), "kata-root-projection-"));
    const coreRoot = copyCoreFixture();
    const commandPath = join(coreRoot, "commands/knowledge-curate.command.yaml");
    writeFileSync(
      commandPath,
      readFileSync(commandPath, "utf8")
        .replace("skill: knowledge-curate@1", "skill: knowledge|management@1")
        .replace(
          "summary: 查询或更新项目业务知识和规则。",
          "summary: 查询 | 更新项目业务知识和规则。",
        ),
    );

    const result = await renderProjection({ runtime: "codex", outputRoot: out, coreRoot });

    expect(result.ok).toBe(true);
    const agents = readFileSync(join(out, "AGENTS.md"), "utf8");
    expect(agents).toContain(
      "| /knowledge-curate | knowledge\\|management@1 | 查询 \\| 更新项目业务知识和规则。 |",
    );
  });

  it("renders generated Claude and Codex skill files with hashes", async () => {
    const out = mkdtempSync(join(tmpdir(), "kata-projection-"));
    const result = await renderProjection({ runtime: "all", outputRoot: out });
    expect(result.ok).toBe(true);
    const claudeSkill = readFileSync(join(out, ".claude/skills/case-draft/SKILL.md"), "utf8");
    const codexSkill = readFileSync(join(out, ".agents/skills/case-draft/SKILL.md"), "utf8");
    expect(claudeSkill).toContain("generated by kata ai-core");
    expect(codexSkill).toContain("generated by kata ai-core");
    expect(claudeSkill).toContain("ai-core-hash:");
    expect(codexSkill).toContain("ai-core-hash:");
  });

  it("renders all GA-core product skills for Claude and Codex", async () => {
    const out = mkdtempSync(join(tmpdir(), "kata-projection-"));
    const result = await renderProjection({ runtime: "all", outputRoot: out });
    expect(result.ok).toBe(true);
    for (const skill of productSkills) {
      expect(readFileSync(join(out, `.agents/skills/${skill}/SKILL.md`), "utf8")).toContain(
        `name: ${skill}`,
      );
      expect(readFileSync(join(out, `.claude/skills/${skill}/SKILL.md`), "utf8")).toContain(
        `name: ${skill}`,
      );
    }
  });

  it("renders routing contract sections into GA-core product skills", async () => {
    const out = mkdtempSync(join(tmpdir(), "kata-projection-"));
    await renderProjection({ runtime: "all", outputRoot: out });

    for (const runtimeRoot of [".agents", ".claude"]) {
      for (const skillName of productSkills) {
        const skill = readFileSync(join(out, runtimeRoot, "skills", skillName, "SKILL.md"), "utf8");
        expect(skill).toContain("## 触发条件");
        expect(skill).toContain("## 不触发条件");
        expect(skill).toContain("## 输出");
        expect(skill).toContain("## 允许的工具");
        expect(skill).toContain("## 上下文预算");
        expect(skill).toContain("## 按需加载协议");
        expect(skill).toContain("## 证据策略");
        expect(skill).toContain("## 失败策略");
        expect(skill).toContain("## 硬规则");
      }
    }

    const caseMaintenance = readFileSync(join(out, ".agents/skills/case-edit/SKILL.md"), "utf8");
    expect(caseMaintenance).toContain("用户希望依 PRD 或需求源产出新的测试用例。");
    expect(caseMaintenance).toContain("用户希望基于已有用例创建或运行 Playwright 自动化。");
  });

  it("renders progressive disclosure rules into kata-owned skills", async () => {
    const out = mkdtempSync(join(tmpdir(), "kata-projection-"));
    await renderProjection({ runtime: "all", outputRoot: out });

    for (const runtimeRoot of [".agents", ".claude"]) {
      const skill = readFileSync(join(out, runtimeRoot, "skills/case-draft/SKILL.md"), "utf8");
      expect(skill).toContain("默认只读取当前 SKILL.md");
      expect(skill).toContain("禁止批量读取 references/**");
      expect(skill).toContain("| 阶段 | 条件 | 文件 | 类型 | 用途 |");
      expect(skill).toContain("source-intake");
      expect(skill).toContain("product-feedback-merge");
      expect(skill).toContain("references/confirmation-package-template.md");
      expect(skill).not.toContain("仅在当前任务需要时才使用参考。证据事实必须引用 SourceRef ID。");
      expect(skill).not.toContain("[条件加载]");
    }
  });

  it("renders explicit no-reference guidance for lightweight skills", async () => {
    const out = mkdtempSync(join(tmpdir(), "kata-projection-"));
    await renderProjection({ runtime: "all", outputRoot: out });

    const skill = readFileSync(join(out, ".agents/skills/bug-file/SKILL.md"), "utf8");
    expect(skill).toContain("## 按需加载协议");
    expect(skill).toContain("无外部参考；仅使用当前 SKILL.md 与任务证据。");
  });

  it("renders source-derived policy markers into generated skill files", async () => {
    const out = mkdtempSync(join(tmpdir(), "kata-projection-"));
    await renderProjection({ runtime: "all", outputRoot: out });
    for (const skillPath of [
      ".claude/skills/case-draft/SKILL.md",
      ".agents/skills/case-draft/SKILL.md",
    ]) {
      const skill = readFileSync(join(out, skillPath), "utf8");
      expect(skill).toContain("## 证据策略");
      const evidencePolicy = skill.slice(
        skill.indexOf("## 证据策略"),
        skill.indexOf("## 失败策略"),
      );
      expect(evidencePolicy).toContain("required_source_refs");
      expect(evidencePolicy).toContain("prd.file@1");
      expect(skill).toContain("stale_ref_policy: block");
      expect(skill).toContain("## 失败策略");
      expect(skill).toContain("missing_evidence: refuse_with_questions");
      expect(skill).toContain("## 硬规则");
      expect(skill).toContain("evidence_kind");
      expect(skill).toContain("ambiguity_class");
      expect(skill).toContain("archive.md 与 cases.xmind 在 blocking pending 清零后生成");
    }
  });

  it("renders environment confirmation acceptance rules into playwright automation", async () => {
    const out = mkdtempSync(join(tmpdir(), "kata-projection-"));
    await renderProjection({ runtime: "all", outputRoot: out });

    for (const runtimeRoot of [".claude"]) {
      const skill = readFileSync(
        join(out, runtimeRoot, "skills/playwright-automation/SKILL.md"),
        "utf8",
      );
      // P3-04: env-preflight detailed rules now delegated to references/env-preflight.md.
      // SKILL.md hard_rules section keeps the delegation + core constraints.
      expect(skill).toContain("严格遵循 references/env-preflight.md");
      expect(skill).toContain("skill.yaml 不逐条重复");
      expect(skill).toContain("名称片段 discovery 分两段执行");
      expect(skill).toContain("不枚举");
      expect(skill).toContain("静默 bootstrap");
      expect(skill).toContain("AskUserQuestion");
      expect(skill).toContain("默认推荐");
      expect(skill).toContain("ltqc-local.yaml");
      expect(skill).toContain("请确认执行环境");
      expect(skill).toContain("env-preflight");
      expect(skill).toContain("session 有效性");
      expect(skill).toContain("真实 Playwright 探测");
      expect(skill).toContain("blocked_by_case_draft_required");
      expect(skill).toContain("AutomationIntent 表示可自动化意图");
      expect(skill).toContain("执行管线");
      expect(skill).toContain("无 ui-probe 证据时不生成最终 Playwright 脚本");
      expect(skill).toContain("无 self-run 结果时不交付成功结论");
      expect(skill).toContain("失败处理：先归类");
      expect(skill).toContain("弱断言");
      expect(skill).toContain("workspace/<project>/_shared/env/*.yaml");
      expect(skill).toContain("smoke.spec.ts");
      expect(skill).toContain("full.spec.ts");
      expect(skill).toContain("references/env-preflight.md");

      const envPreflight = readFileSync(
        join(out, runtimeRoot, "skills/playwright-automation/references/env-preflight.md"),
        "utf8",
      );
      expect(envPreflight).toContain("用户回复只有 `确认`");
      expect(envPreflight).toContain("直接等价于用户选择 `ltqc-local.yaml`");
      expect(envPreflight).toContain("必须在目标 discovery 和环境判断之前先按行解析原始输入");
      expect(envPreflight).toContain("立即设置 `env_profile=ltqc-local.yaml`");
      expect(envPreflight).toContain("已剥离尾部");
      expect(envPreflight).toContain("探测确认登录跳转");
      expect(envPreflight).toContain("Session 文件存在但 mtime 34h > 24h");
      expect(envPreflight).toContain("唯一可见文本必须直接从 `会话已过期。` 开始");
      expect(envPreflight).toContain("只输出一次 no_permission 直接文本 blocker");
      expect(envPreflight).toContain("fallback 必须是本轮最后一个 assistant action");
      expect(envPreflight).toContain("不得以“探测确认已登录但无 dataAssets 产品权限”");
      expect(envPreflight).toContain("不得追加 tenant/project ID");
      expect(envPreflight).toContain("最终 blocker 文本的第一个字符必须就是模板首字");
      expect(envPreflight).toContain("### 最高优先级：工具拒绝哨兵");
      expect(envPreflight).toContain(
        "第一行必须严格等于 `blocked_by_environment: tool_permission_denied`",
      );
      expect(envPreflight).toContain("不得写成 `blocked_by_environment / tool_permission_denied`");
      expect(envPreflight).toContain("fenced code block 语言必须严格为 `shell`");
      expect(envPreflight).toContain("不得写成 `bash`");
      expect(envPreflight).toContain(
        "不得为了确认 `env_profile_file`、`project`、`featureId`、`profile.project`",
      );
      expect(envPreflight).toContain("`Read workspace/dataAssets/_shared/env/ltqc-local.yaml`");
      expect(envPreflight).toContain(
        "必须只使用拒绝前已经知道的 env profile 文件名、project 和 featureId",
      );
      expect(envPreflight).toContain("Session file mtime ~36.7h > 24h");
      expect(envPreflight).toContain("使用字面量 run-id");
      expect(envPreflight).toContain("NO NO NO! I just violated the rule");
      expect(envPreflight).toContain("description 为 `Get repo root` 的 `pwd`");
      expect(envPreflight).toContain(
        'description 为 `Test basic command availability` 的 `echo "test"`',
      );
      expect(envPreflight).toContain("`mkdir -p` 被工具策略阻止");
      expect(envPreflight).toContain("`The following parts require approval`");
      expect(envPreflight).toContain("不得换用 `openssl rand` 或 TaskStop");
      expect(envPreflight).toContain(
        "run-id generation 不得依赖 shell 随机数、hash、管道或命令替换",
      );
      expect(envPreflight).toContain("优先在内部推理中选择一个已知字面量 run-id");
      expect(envPreflight).toContain(
        "命令必须形如 `mkdir -p workspace/dataAssets/features/2026-04-dq-builtin-reasonability-field-calc-compare/results/<run-id>/playwright/preflight`",
      );
      expect(envPreflight).toContain("不得使用 `<REPO_ROOT>/workspace/...` 绝对路径");
      expect(envPreflight).toContain("不得运行 `test -f .../.gitkeep`");
      expect(envPreflight).toContain("输出 `not_needed` 的探测命令");
      expect(envPreflight).toContain("下一次 assistant action 必须立刻是最终 text");
      expect(envPreflight).toContain(
        "不得在同一 assistant message 中批量发起 `pwd` 与 run-id/evidence 相关 Bash",
      );
      expect(envPreflight).toContain(
        "也不得在同一 assistant message 中同时发起 run-id generation 与 evidence directory creation",
      );
      expect(envPreflight).toContain(
        "必须先等待 run-id tool_result，确认未拒绝后才能创建 evidence 目录",
      );
      expect(envPreflight).toContain(
        "若同一批 tool_result 中一个成功、另一个包含拒绝信号，拒绝信号优先",
      );
      expect(envPreflight).toContain("首次拒绝后不得调用 TodoWrite");
      expect(envPreflight).toContain("不得维护 todo 状态");
      expect(envPreflight).toContain("不得写“Todos have been modified”");
      expect(envPreflight).toContain(
        '不得用 `echo "test"` 或任何 basic command availability probe',
      );
      expect(envPreflight).toContain("“I already violated”“I can't undo”“STOP NOW”");
      expect(envPreflight).toContain(
        '下一次 action 也不得是 TodoWrite、TaskStop、Bash、`pwd`、`echo "test"` 或任何 tool_use',
      );
      expect(envPreflight).toContain(
        "首次拒绝后的下一次 assistant message 必须只包含一个 `type=text` content item",
      );
      expect(envPreflight).toContain("不得包含 `type=thinking` 或任何 tool_use");
      expect(envPreflight).toContain(
        '不得再运行 `date`、`mkdir`、`mktemp`、`pwd`、`ls`、`test -d`、`echo "test"`',
      );
      expect(envPreflight).toContain(
        "不得为了“Let me simplify”“simpler approach”“format it properly”",
      );
      expect(envPreflight).toContain(
        "“false positive”“allowed working directories”“check current working directory”“results directory exists”",
      );
      expect(envPreflight).toContain(
        "“确认测试文件”“feature 目录内容”“tests/runners/full.spec.ts 是否存在”“handoff 命令路径”",
      );
      expect(envPreflight).toContain(
        "ls workspace/dataAssets/features/2026-04-dq-builtin-reasonability-field-calc-compare/",
      );
      expect(envPreflight).toContain("Check if feature directory contents reveal tests existence");
      expect(envPreflight).toContain('`echo "preflight-$(date +%s | md5 | head -c 8)"`');
      expect(envPreflight).toContain('`openssl rand`、`uuidgen`、`TaskStop` 或 `echo "test"`');
      expect(envPreflight).toContain(
        "blocker 命令只使用已知的 env profile 文件名、project 和 featureId",
      );
      expect(envPreflight).toContain(
        "不得在模板前写“根据硬规则”“mkdir 被工具策略拒绝”“`mkdir -p` 被工具策略阻止”“必须停止 env-preflight 阶段”等解释",
      );
      expect(envPreflight).toContain("不得把整个 blocker 包进一个 fenced code block");
      expect(envPreflight).toContain("blocked_by_environment: tool_permission_denied");
      expect(envPreflight).toContain("第一次拒绝即为终止信号");
      expect(envPreflight).toContain("工具权限或工具策略拒绝");
      expect(envPreflight).toContain("session mtime/age calculation");
      expect(envPreflight).toContain(
        '先用 `stat -f "%m" <session_path>` 或等价单命令读取 mtime epoch',
      );
      expect(envPreflight).toContain("再用独立的 `date +%s` 读取当前 epoch");
      expect(envPreflight).toContain(
        '不得把 `date` 和 `stat` 组合进 `echo $(( $(date +%s) - $(stat -f "%m" ... ) ))`',
      );
      expect(envPreflight).toContain("run-id generation");
      expect(envPreflight).toContain("was blocked");
      expect(envPreflight).toContain("Contains command_substitution");
      expect(envPreflight).toContain("Contains simple_expansion");
      expect(envPreflight).toContain("This Bash command contains multiple operations");
      expect(envPreflight).toContain("Unhandled node type");
      expect(envPreflight).toContain("contains multiple operations");
      expect(envPreflight).toContain("不得区分“交互模式/非交互模式”");
      expect(envPreflight).toContain("不得把用户回复“确认”解释为允许继续请求工具权限");
      expect(envPreflight).toContain(
        "不得把 approval prompt、`hasn't granted it yet`、`was blocked`",
      );
      expect(envPreflight).toContain("换个命令继续算 mtime");
      expect(envPreflight).toContain("换个命令生成 run ID");
      expect(envPreflight).toContain("换个命令生成更简单 run ID");
      expect(envPreflight).toContain("simple approach");
      expect(envPreflight).toContain("用户还没机会 approve");
      expect(envPreflight).toContain(
        "不得在首次拒绝后继续调用 Bash、Read、Write、Edit、Glob、Grep、WebFetch、curl、TaskStop 或 Playwright probe",
      );
      expect(envPreflight).toContain("首次拒绝后的下一次 assistant action 必须是唯一最终 text");
      expect(envPreflight).toContain(
        "即使 thinking 中已经决定“输出 blocker/stop/no more tool calls”",
      );
      expect(envPreflight).toContain(
        "下一次 action 也不得是 `pwd`、`ls`、run-id retry、placeholder command、TaskStop、Read reference、`Read workspace/dataAssets/_shared/env/ltqc-local.yaml`",
      );
      expect(envPreflight).toContain("不得先输出一条解释 text 再继续 tool_use");
      expect(envPreflight).toContain("不得再出现任何 tool_use");
      expect(envPreflight).toContain('不得继续用 `stat -f "%Sm"`');
      expect(envPreflight).toContain("`openssl rand`、`uuidgen`、`date`");
      expect(envPreflight).toContain("`date +%s | md5 | head -c 8`");
      expect(envPreflight).toContain(
        'FEATURE="workspace/dataAssets/features/2026-04-dq-builtin-reasonability-field-calc-compare"',
      );
      expect(envPreflight).toContain(
        "`echo $$ | md5sum 2>/dev/null || uuidgen 2>/dev/null | head -c 8 || date +%s | head -c 8`",
      );
      expect(envPreflight).toContain("md5、md5sum、head、`mkdir -p`、重复 mkdir");
      expect(envPreflight).toContain(
        '不得继续运行 `pwd`、description 为 `Get repo root` 的 `pwd`、`echo "test"`、description 为 `Test basic command availability` 的 `echo "test"`',
      );
      expect(envPreflight).toContain("测试文件存在性检查");
      expect(envPreflight).toContain("handoff 命令路径检查");
      expect(envPreflight).toContain("重新 Read env-preflight reference");
      expect(envPreflight).toContain("feature directory contents 检查");
      expect(envPreflight).toContain("`npx playwright --version`");
      expect(envPreflight).toContain("`playwright_available`");
      expect(envPreflight).toContain("证据目录创建权限不足，环境预检无法继续。");
      expect(envPreflight).toContain("裸 `tool_permission_denied`");
      expect(envPreflight).toContain("Placeholder command");
      expect(envPreflight).toContain("Let me simplify the command");
      expect(envPreflight).toContain("Let me try using a single command approach");
      expect(envPreflight).toContain(
        "不得把 `This command requires approval`、`This Bash command contains multiple operations` 或 `The following parts require approval` 解读为",
      );
      expect(envPreflight).toContain("Let me just try something minimal to see what's allowed");
      expect(envPreflight).toContain("Let me verify the values");
      expect(envPreflight).toContain("Wait, I need to check what the project is");
      expect(envPreflight).toContain("the path IS under <REPO_ROOT>");
      expect(envPreflight).toContain("The directory IS under <REPO_ROOT>");
      expect(envPreflight).toContain("allowed working directory is `<REPO_ROOT>`");
      expect(envPreflight).toContain("Check current working directory");
      expect(envPreflight).toContain("Check if results directory exists");
      expect(envPreflight).toContain("The results directory doesn't exist");
      expect(envPreflight).toContain("先检查当前 working directory");
      expect(envPreflight).toContain("先看看 results 是否存在");
      expect(envPreflight).toContain("So `ls` works");
      expect(envPreflight).toContain("根据硬规则");
      expect(envPreflight).toContain("第一次工具权限拒绝即为终止信号");
      expect(envPreflight).toContain("env-preflight 阶段工具策略阻止");
      expect(envPreflight).toContain("创建当前 feature 证据目录时必须从 repo root 使用相对路径");
      expect(envPreflight).toContain("不得用 `<REPO_ROOT>/...` 绝对路径作为 `mkdir -p` 目标");
      expect(envPreflight).toContain("由于工具策略阻止");
      expect(envPreflight).toContain("请确认批准以上操作");
      expect(envPreflight).toContain("需要你批准");
      expect(envPreflight).toContain("请确认必需的写入权限后重试");
      expect(envPreflight).toContain("请先批准必要的写入权限后重试");
      expect(envPreflight).toContain("手动运行验证");
      expect(envPreflight).toContain("手动验收命令");
      expect(envPreflight).toContain("最终可见文本必须严格使用以下结构");
      expect(envPreflight).toContain("第一个字符必须是 `b`");
      expect(envPreflight).toContain("有头模式 full test 人工验收命令：");
      expect(envPreflight).toContain(
        "KATA_DATAASSETS_ENV=<env_profile_file> KATA_ACTIVE_PROJECT=<project>",
      );
      expect(envPreflight).toContain("不得使用裸 env 名");
      expect(envPreflight).toContain("path.resolve(process.cwd(), auth.session_path)");
      expect(envPreflight).toContain("const REPO_ROOT = '<REPO_ROOT>'");
      expect(envPreflight).toContain("path.resolve(REPO_ROOT, ...)");

      const handoff = readFileSync(
        join(out, runtimeRoot, "skills/playwright-automation/references/handoff.md"),
        "utf8",
      );
      expect(handoff).toContain("final handoff message must include the human acceptance command");
      expect(handoff).toContain("--headed --reporter=line");
      expect(handoff).toContain("Never declare E2E completion without this command");
    }
  });

  it("renders Lanhu source handling and restored case writing rules into case-draft", async () => {
    const out = mkdtempSync(join(tmpdir(), "kata-projection-"));
    await renderProjection({ runtime: "all", outputRoot: out });

    for (const runtimeRoot of [".claude"]) {
      // P3-03: Lanhu/Axure detailed rules now delegated to references/error-fallback-paths.md.
      // SKILL.md hard_rules section keeps the delegation + general constraints.
      const skill = readFileSync(join(out, runtimeRoot, "skills/case-draft/SKILL.md"), "utf8");
      expect(skill).toContain("source-intake、token 搜索顺序");
      expect(skill).toContain("references/error-fallback-paths.md");
      expect(skill).toContain("skill.yaml 不逐条重复");
      expect(skill).toContain("lanhu.fixture@1");
      expect(skill).toContain("项目未指定时先自行推断");
      expect(skill).toContain("历史上下文：history_inferred 作为参考证据使用");
      expect(skill).toContain("evidence_kind、ambiguity_class、confidence");
      expect(skill).toContain("archive.md 与 cases.xmind 在 blocking pending 清零后");
      expect(skill).toContain("blocking pending 非零时只输出草稿与确认类产物");
      expect(skill).toContain("automation_status=ready");
      expect(skill).toContain("Subagent 遇阻塞时通过 BlockedEnvelope 回传主 agent");
      expect(skill).toContain("few-shot 作为格式参照使用");
      expect(skill).toContain("slug 兜底由 `kata features resolve` 引擎处理");
      expect(skill).not.toContain("不直接获取外部来源");
      expect(skill).toContain("references/source-intake-protocol.md");
      expect(skill).toContain("references/coverage-matrix-guide.md");
      const sourceIntake = readFileSync(
        join(out, runtimeRoot, "skills/case-draft/references/source-intake-protocol.md"),
        "utf8",
      );
      expect(sourceIntake).toContain("Lanhu");
      expect(sourceIntake).toContain("这一步必须发生在任何外部抓取之前");
      expect(sourceIntake).toContain(
        "只有这些搜索完成且未命中当前页面同源缓存时，才允许调用 fetch/WebFetch/浏览器/设计源工具",
      );
      expect(sourceIntake).toContain("抓取/能力检查必须串行执行");
      expect(sourceIntake).toContain(
        "同一 assistant 消息或同一批 tool_use 中只能包含一个 fetch/WebFetch/MCP fetch/浏览器/设计源工具调用",
      );
      expect(sourceIntake).toContain(
        "不得同时调用 `mcp__fetch__fetch_html` 与 `mcp__fetch__fetch_markdown`",
      );
      expect(sourceIntake).toContain("第一次抓取或能力检查返回 `requires approval`");
      expect(sourceIntake).toContain(
        "立即停止同一 URL 的全部 fetch/WebFetch/MCP fetch/浏览器/设计源变体尝试",
      );
      expect(sourceIntake).toContain(
        "不得等待授权、不得切换 readable/html/markdown/txt 或 WebFetch 重试",
      );
      expect(sourceIntake).toContain("补充计数的 Bash/rg/count 命令返回 `requires approval`");
      expect(sourceIntake).toContain("不得把 `rg ... | wc -l` 改写为无管道 `rg -c`");
      const errorFallback = readFileSync(
        join(out, runtimeRoot, "skills/case-draft/references/error-fallback-paths.md"),
        "utf8",
      );
      expect(errorFallback).toContain("不得使用英文替代标题");
      expect(errorFallback).toContain("不得请求“授权必要的工具权限”");
      expect(errorFallback).toContain("若这一次 `mkdir -p` 返回 `was blocked`");
      expect(errorFallback).toContain("mkdir 命令本身必须严格使用 repo-root 相对路径");
      expect(errorFallback).toContain(
        "不得使用 `<REPO_ROOT>/workspace/{project}/features/{feature_id}`",
      );
      expect(errorFallback).toContain(
        "不得调用 `mkdir -p <REPO_ROOT>/workspace/dataAssets/features/2026-05-unresolved-lanhu-7afabbf5`",
      );
      expect(errorFallback).toContain(
        "下一条 assistant message 必须只包含一个 `type=text` content item",
      );
      expect(errorFallback).toContain("不得包含 `type=thinking`");
      expect(errorFallback).toContain("不得先产生新的 thinking 分析、错误解释、路径诊断或规则复述");
      expect(errorFallback).toContain("不得重试相对/绝对 `mkdir -p`");
      expect(errorFallback).toContain("The error says it's within");
      expect(errorFallback).toContain("Wait, the error says");
      expect(errorFallback).toContain("Let me read the error more carefully");
      expect(errorFallback).toContain("try using Write instead");
      expect(errorFallback).toContain("不得再读取其他 `references/**`");
      expect(errorFallback).toContain("maybe the user will grant permission this time");
      expect(errorFallback).toContain(
        "不得再调用 Read 补读 `references/source-intake-protocol.md`",
      );
      expect(errorFallback).toContain(
        "这个禁止覆盖按需加载表和“进入 error-fallback-paths”的一般读取时机",
      );
      expect(errorFallback).toContain(
        "即使本文件尚未读取、即使 Read 会被允许，也不得在抓取拒绝后读取 `references/error-fallback-paths.md`",
      );
      expect(errorFallback).toContain("Let me read the error-fallback-paths.md reference");
      expect(errorFallback).toContain("go into the error-fallback paths");
      expect(errorFallback).toContain(
        "后立即进入阻塞产物 `mkdir -p workspace/{project}/features/{feature_id}/`",
      );
      expect(errorFallback).toContain("“立即进入”表示下一次工具调用必须是这条 `mkdir -p`");
      expect(errorFallback).toContain("不得在其前补跑 `Grep` count、`rg` count、Bash count");
      expect(errorFallback).toContain("读取相邻 `metadata.yaml`、模块推断、命中数精确化");
      expect(errorFallback).toContain("Let me use Grep with count mode");
      expect(errorFallback).toContain("Let me read the metadata.yaml files");
      expect(errorFallback).toContain("I need to count the pid hits");
      expect(errorFallback).toContain("Now I have the counts");
      expect(errorFallback).toContain("Claude requested permissions to write to");
      expect(errorFallback).toContain(
        "同一 assistant 消息或同一批 tool_use 中只能包含一个 fetch/WebFetch/MCP fetch/浏览器/设计源工具调用",
      );
      expect(errorFallback).toContain(
        "不得并发或同批调用 `mcp__fetch__fetch_html` 与 `mcp__fetch__fetch_markdown`",
      );
      expect(errorFallback).toContain("补充计数的 Bash/rg/count 命令一旦返回 `requires approval`");
      expect(errorFallback).toContain("不得并发继续对 pageId/docId/pid 发起替代 Bash 计数");
      expect(errorFallback).toContain(
        "不得改试 `mcp__fetch__fetch_html`、`mcp__fetch__fetch_markdown`、`mcp__fetch__fetch_readable`、`mcp__fetch__fetch_txt` 或 `WebFetch`",
      );
      expect(errorFallback).toContain("不得再调用 Bash/Write/Read/Grep/fetch/WebFetch/MCP fetch");
      expect(errorFallback).toContain(
        "不得因为错误文本提到 `allowed working directories`、路径看似位于仓库根目录下或“应该被允许”而继续诊断",
      );
      expect(errorFallback).toContain(
        "不得尝试 “Write directly” 或 “Write might create the directory automatically”",
      );
      expect(errorFallback).toContain("不得把权限拒绝后续包装成“再尝试”“等待授权”或“换一种方式”");
      const reviewGate = readFileSync(
        join(out, runtimeRoot, "skills/case-draft/references/case-review-evidence-gates.md"),
        "utf8",
      );
      expect(reviewGate).not.toContain("才请求用户提供本地 PRD");
      expect(reviewGate).toContain("source_refs");
    }
  });

  it("keeps generated projection inventory in sync with rendered generated files", async () => {
    const out = mkdtempSync(join(tmpdir(), "kata-projection-"));
    await renderProjection({ runtime: "all", outputRoot: out });

    const inventoryGeneratedPaths = inventoryRows()
      .filter((row) => row.disposition === "generated")
      .map((row) => row.path)
      .sort();
    const renderedGeneratedPaths = generatedProjectionPaths
      .filter((path) => existsSync(join(out, path)))
      .sort();

    expect(inventoryGeneratedPaths).toEqual(renderedGeneratedPaths);
  });

  it("copies all declared product skill reference files byte-for-byte from ai-core sources", async () => {
    const out = mkdtempSync(join(tmpdir(), "kata-projection-"));
    await renderProjection({ runtime: "all", outputRoot: out });

    for (const skillName of productSkills) {
      for (const reference of declaredSkillReferences(skillName)) {
        const source = readFileSync(join(root, ".ai/core/skills", skillName, reference), "utf8");
        expect(readFileSync(join(out, ".claude/skills", skillName, reference), "utf8")).toBe(
          source,
        );
        expect(readFileSync(join(out, ".agents/skills", skillName, reference), "utf8")).toBe(
          source,
        );
      }
    }
  });

  it("projects newly declared product skill references without renderer code changes", async () => {
    const out = mkdtempSync(join(tmpdir(), "kata-projection-"));
    const coreRoot = copyCoreFixture();
    const skillRoot = join(coreRoot, "skills/workspace-manage");
    const skillPath = join(skillRoot, "skill.yaml");
    writeFileSync(join(skillRoot, "references/dynamic-always.md"), "dynamic always reference\n");
    writeFileSync(
      join(skillRoot, "references/dynamic-load-when.md"),
      "dynamic load_when reference\n",
    );
    writeFileSync(
      skillPath,
      readFileSync(skillPath, "utf8").replace(
        "evidence:",
        [
          "  - path: references/dynamic-always.md",
          "    type: normative",
          "    generated_from: test.fixture",
          "    load_phases:",
          "      - review",
          "    purpose: Validate dynamic projection of newly declared normative references.",
          "    load_when: always",
          "  - path: references/dynamic-load-when.md",
          "    type: informative",
          "    generated_from: test.fixture",
          "    load_phases:",
          "      - review",
          "    purpose: Validate dynamic projection of newly declared informative references.",
          "    load_when: Dynamic review fixture requires it.",
          "evidence:",
        ].join("\n"),
      ),
    );

    const result = await renderProjection({ runtime: "all", outputRoot: out, coreRoot });

    expect(result.ok).toBe(true);
    for (const runtimeRoot of [".claude", ".agents"]) {
      const skill = readFileSync(
        join(out, runtimeRoot, "skills/workspace-manage/SKILL.md"),
        "utf8",
      );
      expect(skill).toContain(
        "| review | `always` | references/dynamic-always.md | 规范 | Validate dynamic projection of newly declared normative references. |",
      );
      expect(skill).toContain(
        "| review | `Dynamic review fixture requires it.` | references/dynamic-load-when.md | 参考 | Validate dynamic projection of newly declared informative references. |",
      );
      expect(
        readFileSync(
          join(out, runtimeRoot, "skills/workspace-manage/references/dynamic-always.md"),
          "utf8",
        ),
      ).toBe("dynamic always reference\n");
      expect(
        readFileSync(
          join(out, runtimeRoot, "skills/workspace-manage/references/dynamic-load-when.md"),
          "utf8",
        ),
      ).toBe("dynamic load_when reference\n");
    }
  });

  it("returns structured issues when a required always_load product reference is missing", async () => {
    const out = mkdtempSync(join(tmpdir(), "kata-projection-"));
    const coreRoot = copyCoreFixture();
    rmSync(join(coreRoot, "skills/workspace-manage/references/project-layout.md"), {
      force: true,
    });

    const result = await renderProjection({ runtime: "codex", outputRoot: out, coreRoot });

    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual({
      code: "projection.contract_invalid",
      severity: "error",
      message: "Required product skill reference is missing.",
      path: ".ai/core/skills/workspace-manage/references/project-layout.md",
    });
  });

  it("copies vendor skill files byte-for-byte without generated trailers", async () => {
    const out = mkdtempSync(join(tmpdir(), "kata-projection-"));
    const source = readFileSync(
      join(root, ".ai/vendor-skills/playwright-cli/files/SKILL.md"),
      "utf8",
    );

    const render = await renderProjection({ runtime: "all", outputRoot: out });
    const check = await checkProjection({ runtime: "all", outputRoot: out });

    expect(render.ok).toBe(true);
    expect(check.ok).toBe(true);
    for (const skillPath of vendorProjectionPaths) {
      const projected = readFileSync(join(out, skillPath), "utf8");
      expect(projected).toBe(source);
      expect(projected).not.toContain("ai-core-hash:");
    }
  });

  it("projects every frozen vendor manifest file byte-for-byte", async () => {
    const out = mkdtempSync(join(tmpdir(), "kata-projection-"));

    const render = await renderProjection({ runtime: "all", outputRoot: out });
    const check = await checkProjection({ runtime: "all", outputRoot: out });

    expect(render.ok).toBe(true);
    expect(check.ok).toBe(true);
    for (const filePath of [
      "SKILL.md",
      "references/running-code.md",
      "references/spec-driven-testing.md",
    ]) {
      const source = readFileSync(join(root, ".ai/vendor-skills/playwright-cli/files", filePath));
      expect(readFileSync(join(out, ".claude/skills/playwright-cli", filePath))).toEqual(source);
      expect(readFileSync(join(out, ".agents/skills/playwright-cli", filePath))).toEqual(source);
    }
    for (const staleFilePath of ["workflow.md", "rules.md"]) {
      expect(existsSync(join(out, ".claude/skills/playwright-cli", staleFilePath))).toBe(false);
      expect(existsSync(join(out, ".agents/skills/playwright-cli", staleFilePath))).toBe(false);
    }

    unlinkSync(join(out, ".agents/skills/playwright-cli/references/running-code.md"));
    const drift = await checkProjection({ runtime: "codex", outputRoot: out });
    expect(drift.ok).toBe(false);
    expect(drift.issues).toContainEqual({
      code: "projection.drift",
      severity: "error",
      message: "Copied vendor projection content is missing.",
      path: ".agents/skills/playwright-cli/references/running-code.md",
    });
  });

  it("prunes stale runtime vendor files during render", async () => {
    const out = mkdtempSync(join(tmpdir(), "kata-projection-"));
    const staleFiles = [
      ".agents/skills/playwright-cli/stale.md",
      ".agents/skills/playwright-cli/references/stale.md",
      ".claude/skills/playwright-cli/stale.md",
      ".claude/skills/playwright-cli/references/stale.md",
    ];
    for (const staleFile of staleFiles) {
      mkdirSync(join(out, staleFile, ".."), { recursive: true });
      writeFileSync(join(out, staleFile), "stale");
    }

    const render = await renderProjection({ runtime: "all", outputRoot: out });

    expect(render.ok).toBe(true);
    for (const staleFile of staleFiles) {
      expect(existsSync(join(out, staleFile))).toBe(false);
    }
  });

  it("detects stale unmanifested runtime vendor files", async () => {
    const out = mkdtempSync(join(tmpdir(), "kata-projection-"));
    await renderProjection({ runtime: "codex", outputRoot: out });
    const staleFile = ".agents/skills/playwright-cli/references/stale.md";
    writeFileSync(join(out, staleFile), "stale");

    const drift = await checkProjection({ runtime: "codex", outputRoot: out });

    expect(drift.ok).toBe(false);
    expect(drift.issues).toContainEqual({
      code: "projection.drift",
      severity: "error",
      message: "Copied vendor projection contains an unmanifested file.",
      path: staleFile,
    });
  });

  it("detects frozen vendor manifest hash drift from the external skill contract", async () => {
    const vendorRepo = mkdtempSync(join(tmpdir(), "kata-vendor-projection-"));
    const coreRoot = copyCoreFixture();
    await freezeVendorSkill({
      root: vendorRepo,
      id: "playwright-cli",
      sourceDir: join(import.meta.dirname, "fixtures/vendor-playwright-cli"),
    });
    const contractPath = join(coreRoot, "external-skills/playwright-cli.yaml");
    writeFileSync(
      contractPath,
      readFileSync(contractPath, "utf8").replace(
        /manifest_hash:\s+sha256:[a-f0-9]+/,
        "manifest_hash: sha256:0000000000000000000000000000000000000000000000000000000000000000",
      ),
    );

    const drift = await checkProjection({
      runtime: "all",
      outputRoot: mkdtempSync(join(tmpdir(), "kata-projection-")),
      coreRoot,
      vendorRoot: join(vendorRepo, ".ai/vendor-skills"),
    });

    expect(drift.ok).toBe(false);
    expect(drift.issues).toContainEqual({
      code: "vendor.manifest_hash_mismatch",
      severity: "error",
      message: "Vendor manifest hash does not match external skill contract.",
      path: ".ai/core/external-skills/playwright-cli.yaml",
    });
  });

  it("returns structured vendor issues when frozen vendor files are corrupt", async () => {
    const vendorRepo = mkdtempSync(join(tmpdir(), "kata-vendor-projection-"));
    const coreRoot = copyCoreFixture();
    const out = mkdtempSync(join(tmpdir(), "kata-projection-"));
    await freezeVendorSkill({
      root: vendorRepo,
      id: "playwright-cli",
      sourceDir: join(import.meta.dirname, "fixtures/vendor-playwright-cli"),
    });
    const vendorRoot = join(vendorRepo, ".ai/vendor-skills");
    pinCoreFixtureManifestHash(coreRoot, join(vendorRoot, "playwright-cli/manifest.yaml"));
    const render = await renderProjection({
      runtime: "all",
      outputRoot: out,
      coreRoot,
      vendorRoot,
    });
    expect(render.ok).toBe(true);
    writeFileSync(join(vendorRoot, "playwright-cli/files/SKILL.md"), "mutated");

    const drift = await checkProjection({ runtime: "all", outputRoot: out, coreRoot, vendorRoot });

    expect(drift.ok).toBe(false);
    expect(drift.issues).toContainEqual({
      code: "vendor.manifest_mismatch",
      severity: "error",
      message: "Vendored file hash does not match frozen manifest.",
      path: ".ai/vendor-skills/playwright-cli/files/SKILL.md",
    });
  });

  it("detects missing copied vendor projection content", async () => {
    const out = mkdtempSync(join(tmpdir(), "kata-projection-"));
    await renderProjection({ runtime: "claude", outputRoot: out });
    unlinkSync(join(out, ".claude/skills/playwright-cli/SKILL.md"));
    const drift = await checkProjection({ runtime: "claude", outputRoot: out });
    expect(drift.ok).toBe(false);
    expect(drift.issues).toContainEqual({
      code: "projection.drift",
      severity: "error",
      message: "Copied vendor projection content is missing.",
      path: ".claude/skills/playwright-cli/SKILL.md",
    });
  });

  it("detects mutated copied vendor projection content", async () => {
    const out = mkdtempSync(join(tmpdir(), "kata-projection-"));
    await renderProjection({ runtime: "codex", outputRoot: out });
    writeFileSync(join(out, ".agents/skills/playwright-cli/SKILL.md"), "mutated");
    const drift = await checkProjection({ runtime: "codex", outputRoot: out });
    expect(drift.ok).toBe(false);
    expect(drift.issues).toContainEqual({
      code: "projection.drift",
      severity: "error",
      message: "Copied vendor projection content is stale.",
      path: ".agents/skills/playwright-cli/SKILL.md",
    });
  });

  it("rejects symlinked copied vendor projection files", async () => {
    const out = mkdtempSync(join(tmpdir(), "kata-projection-"));
    await renderProjection({ runtime: "codex", outputRoot: out });
    const projected = join(out, ".agents/skills/playwright-cli/SKILL.md");
    unlinkSync(projected);
    symlinkSync(join(root, ".ai/vendor-skills/playwright-cli/files/SKILL.md"), projected);

    const drift = await checkProjection({ runtime: "codex", outputRoot: out });

    expect(drift.ok).toBe(false);
    expect(drift.issues).toContainEqual({
      code: "projection.drift",
      severity: "error",
      message: "Copied vendor projection content must not be a symlink.",
      path: ".agents/skills/playwright-cli/SKILL.md",
    });
  });

  it("rejects a symlinked copied vendor runtime skill root", async () => {
    const out = mkdtempSync(join(tmpdir(), "kata-projection-"));
    await renderProjection({ runtime: "codex", outputRoot: out });
    rmSync(join(out, ".agents/skills/playwright-cli"), { recursive: true, force: true });
    symlinkSync(
      join(root, ".ai/vendor-skills/playwright-cli/files"),
      join(out, ".agents/skills/playwright-cli"),
      "dir",
    );

    const drift = await checkProjection({ runtime: "codex", outputRoot: out });

    expect(drift.ok).toBe(false);
    expect(drift.issues).toContainEqual({
      code: "projection.drift",
      severity: "error",
      message: "Projection runtime vendor paths must not contain symlink components.",
      path: ".agents/skills/playwright-cli",
    });
  });

  it("rejects a symlinked runtime skills parent during render without writing outside output root", async () => {
    const out = mkdtempSync(join(tmpdir(), "kata-projection-"));
    const outside = mkdtempSync(join(tmpdir(), "kata-projection-outside-"));
    mkdirSync(join(out, ".agents"), { recursive: true });
    symlinkSync(outside, join(out, ".agents/skills"), "dir");

    const result = await renderProjection({ runtime: "codex", outputRoot: out });

    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual({
      code: "projection.drift",
      severity: "error",
      message: "Projection runtime vendor paths must not contain symlink components.",
      path: ".agents/skills",
    });
    expect(existsSync(join(outside, "case-draft"))).toBe(false);
    expect(existsSync(join(outside, "playwright-cli"))).toBe(false);
  });

  it("rejects a symlinked generated skill root during render without writing outside output root", async () => {
    const out = mkdtempSync(join(tmpdir(), "kata-projection-"));
    const outside = mkdtempSync(join(tmpdir(), "kata-projection-outside-"));
    mkdirSync(join(out, ".agents/skills"), { recursive: true });
    symlinkSync(outside, join(out, ".agents/skills/workspace-manage"), "dir");

    const result = await renderProjection({ runtime: "codex", outputRoot: out });

    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual({
      code: "projection.drift",
      severity: "error",
      message: "Projection target paths must not contain symlink components.",
      path: ".agents/skills/workspace-manage",
    });
    expect(existsSync(join(outside, "SKILL.md"))).toBe(false);
  });

  it("rejects a symlinked generated references directory during render without writing outside output root", async () => {
    const out = mkdtempSync(join(tmpdir(), "kata-projection-"));
    const outside = mkdtempSync(join(tmpdir(), "kata-projection-outside-"));
    const projectedSkillRoot = join(out, ".agents/skills/workspace-manage");
    mkdirSync(projectedSkillRoot, { recursive: true });
    symlinkSync(outside, join(projectedSkillRoot, "references"), "dir");

    const result = await renderProjection({ runtime: "codex", outputRoot: out });

    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual({
      code: "projection.drift",
      severity: "error",
      message: "Projection target paths must not contain symlink components.",
      path: ".agents/skills/workspace-manage/references",
    });
    expect(existsSync(join(outside, "project-layout.md"))).toBe(false);
  });

  it("rejects a symlinked runtime skills parent during check", async () => {
    const out = mkdtempSync(join(tmpdir(), "kata-projection-"));
    const outside = mkdtempSync(join(tmpdir(), "kata-projection-outside-"));
    await renderProjection({ runtime: "codex", outputRoot: out });
    cpSync(join(out, ".agents/skills"), outside, { recursive: true });
    rmSync(join(out, ".agents/skills"), { recursive: true, force: true });
    symlinkSync(outside, join(out, ".agents/skills"), "dir");

    const drift = await checkProjection({ runtime: "codex", outputRoot: out });

    expect(drift.ok).toBe(false);
    expect(drift.issues).toContainEqual({
      code: "projection.drift",
      severity: "error",
      message: "Projection runtime vendor paths must not contain symlink components.",
      path: ".agents/skills",
    });
  });

  it("rejects a symlinked generated skill root during check", async () => {
    const out = mkdtempSync(join(tmpdir(), "kata-projection-"));
    const outside = mkdtempSync(join(tmpdir(), "kata-projection-outside-"));
    await renderProjection({ runtime: "codex", outputRoot: out });
    cpSync(join(out, ".agents/skills/workspace-manage"), outside, { recursive: true });
    rmSync(join(out, ".agents/skills/workspace-manage"), { recursive: true, force: true });
    symlinkSync(outside, join(out, ".agents/skills/workspace-manage"), "dir");

    const drift = await checkProjection({ runtime: "codex", outputRoot: out });

    expect(drift.ok).toBe(false);
    expect(drift.issues).toContainEqual({
      code: "projection.drift",
      severity: "error",
      message: "Projection target paths must not contain symlink components.",
      path: ".agents/skills/workspace-manage",
    });
  });

  it("rejects unsafe declared product skill reference paths", async () => {
    const out = mkdtempSync(join(tmpdir(), "kata-projection-"));
    const coreRoot = copyCoreFixture();
    const skillPath = join(coreRoot, "skills/workspace-manage/skill.yaml");
    writeFileSync(
      skillPath,
      readFileSync(skillPath, "utf8").replace(
        "  - path: references/project-layout.md",
        "  - path: ../escape.md",
      ),
    );

    const result = await renderProjection({ runtime: "codex", outputRoot: out, coreRoot });

    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual({
      code: "product_skill.invalid_reference",
      severity: "error",
      message:
        "Product skill reference requires safe path, type, load_phases, purpose, and load_when.",
      path: ".ai/core/skills/workspace-manage/skill.yaml",
    });
  });

  it("detects copied vendor inventory source mismatches", async () => {
    const out = mkdtempSync(join(tmpdir(), "kata-projection-"));
    const coreRoot = copyCoreFixture();
    await renderProjection({ runtime: "codex", outputRoot: out, coreRoot });
    const inventoryPath = join(coreRoot, "runtimes/projection-inventory.yaml");
    writeFileSync(
      inventoryPath,
      readFileSync(inventoryPath, "utf8").replace(
        [
          "  - path: .agents/skills/playwright-cli/SKILL.md",
          "    runtime: codex",
          "    disposition: copied_vendor",
          "    source: .ai/vendor-skills/playwright-cli/files/SKILL.md",
        ].join("\n"),
        [
          "  - path: .agents/skills/playwright-cli/SKILL.md",
          "    runtime: codex",
          "    disposition: copied_vendor",
          "    source: .ai/vendor-skills/playwright-cli/files/WRONG.md",
        ].join("\n"),
      ),
    );

    const drift = await checkProjection({ runtime: "codex", outputRoot: out, coreRoot });
    expect(drift.ok).toBe(false);
    expect(drift.issues).toContainEqual({
      code: "projection.inventory_mismatch",
      severity: "error",
      message: "Projection inventory copied vendor source does not match frozen vendor artifact.",
      path: ".ai/core/runtimes/projection-inventory.yaml",
    });
  });

  it("prunes runtime files classified as deleted", async () => {
    const out = mkdtempSync(join(tmpdir(), "kata-prune-"));
    const coreRoot = copyCoreFixture();
    const inventoryPath = join(coreRoot, "runtimes/projection-inventory.yaml");
    writeFileSync(
      inventoryPath,
      `${readFileSync(inventoryPath, "utf8")}
  - path: .agents/skills/obsolete-skill/SKILL.md
    runtime: codex
    disposition: deleted
    source: cleanup-test
    reason: Historical runtime surface removed.
`,
    );
    mkdirSync(join(out, ".agents/skills/obsolete-skill"), { recursive: true });
    writeFileSync(join(out, ".agents/skills/obsolete-skill/SKILL.md"), "legacy");
    const result = await renderProjection({
      runtime: "codex",
      outputRoot: out,
      coreRoot,
      prune: true,
    });
    expect(result.ok).toBe(true);
    expect(existsSync(join(out, ".agents/skills/obsolete-skill/SKILL.md"))).toBe(false);
  });

  it("prunes explicitly deleted runtime files for all selected runtimes", async () => {
    const out = mkdtempSync(join(tmpdir(), "kata-prune-"));
    const coreRoot = copyCoreFixture();
    const inventoryPath = join(coreRoot, "runtimes/projection-inventory.yaml");
    writeFileSync(
      inventoryPath,
      `${readFileSync(inventoryPath, "utf8")}
  - path: .agents/skills/obsolete-skill/SKILL.md
    runtime: codex
    disposition: deleted
    source: cleanup-test
    reason: Historical runtime surface removed.
  - path: .claude/skills/obsolete-skill/SKILL.md
    runtime: claude
    disposition: deleted
    source: cleanup-test
    reason: Historical runtime surface removed.
`,
    );
    for (const path of [
      ".agents/skills/obsolete-skill/SKILL.md",
      ".claude/skills/obsolete-skill/SKILL.md",
    ]) {
      mkdirSync(dirname(join(out, path)), { recursive: true });
      writeFileSync(join(out, path), "legacy");
    }

    const result = await renderProjection({
      runtime: "all",
      outputRoot: out,
      coreRoot,
      prune: true,
    });

    expect(result.ok).toBe(true);
    expect(existsSync(join(out, ".agents/skills/obsolete-skill/SKILL.md"))).toBe(false);
    expect(existsSync(join(out, ".claude/skills/obsolete-skill/SKILL.md"))).toBe(false);
  });

  it("rejects symlinked deleted runtime files during prune without removing outside output root", async () => {
    const out = mkdtempSync(join(tmpdir(), "kata-prune-"));
    const coreRoot = copyCoreFixture();
    const inventoryPath = join(coreRoot, "runtimes/projection-inventory.yaml");
    writeFileSync(
      inventoryPath,
      `${readFileSync(inventoryPath, "utf8")}
  - path: .agents/skills/obsolete-skill/SKILL.md
    runtime: codex
    disposition: deleted
    source: cleanup-test
    reason: Historical runtime surface removed.
`,
    );
    const outside = mkdtempSync(join(tmpdir(), "kata-prune-outside-"));
    const outsideFile = join(outside, "SKILL.md");
    mkdirSync(join(out, ".agents/skills/obsolete-skill"), { recursive: true });
    writeFileSync(outsideFile, "outside");
    symlinkSync(outsideFile, join(out, ".agents/skills/obsolete-skill/SKILL.md"), "file");

    const result = await renderProjection({
      runtime: "codex",
      outputRoot: out,
      coreRoot,
      prune: true,
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual({
      code: "projection.drift",
      severity: "error",
      message: "Projection target paths must not contain symlink components.",
      path: ".agents/skills/obsolete-skill/SKILL.md",
    });
    expect(readFileSync(outsideFile, "utf8")).toBe("outside");
  });

  it("rejects deleted inventory directory targets during prune without removing them", async () => {
    const out = mkdtempSync(join(tmpdir(), "kata-prune-"));
    const coreRoot = copyCoreFixture();
    const inventoryPath = join(coreRoot, "runtimes/projection-inventory.yaml");
    writeFileSync(
      inventoryPath,
      `${readFileSync(inventoryPath, "utf8")}
  - path: .agents/skills/removed-dir
    runtime: codex
    disposition: deleted
    source: .ai/core/migrations/skill-rename-map.yaml
    reason: Replaced by .agents/skills/obsolete-skill/SKILL.md.
`,
    );
    mkdirSync(join(out, ".agents/skills/removed-dir"), { recursive: true });
    writeFileSync(join(out, ".agents/skills/removed-dir/SKILL.md"), "legacy");

    const result = await renderProjection({
      runtime: "codex",
      outputRoot: out,
      coreRoot,
      prune: true,
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual({
      code: "projection.deleted_not_file_path",
      severity: "error",
      message: "Deleted rows must point to explicit runtime files before pruning.",
      path: ".agents/skills/removed-dir",
    });
    expect(existsSync(join(out, ".agents/skills/removed-dir"))).toBe(true);
    expect(readFileSync(join(out, ".agents/skills/removed-dir/SKILL.md"), "utf8")).toBe("legacy");
  });

  it("rejects invalid deleted inventory metadata during prune without removing files", async () => {
    const out = mkdtempSync(join(tmpdir(), "kata-prune-"));
    const coreRoot = copyCoreFixture();
    const inventoryPath = join(coreRoot, "runtimes/projection-inventory.yaml");
    writeFileSync(
      inventoryPath,
      `${readFileSync(inventoryPath, "utf8")}
  - path: .agents/skills/invalid-delete/SKILL.md
    runtime: codex
    disposition: deleted
    source: .agents/skills/invalid-delete/SKILL.md
`,
    );
    mkdirSync(join(out, ".agents/skills/invalid-delete"), { recursive: true });
    writeFileSync(join(out, ".agents/skills/invalid-delete/SKILL.md"), "legacy");

    const result = await renderProjection({
      runtime: "codex",
      outputRoot: out,
      coreRoot,
      prune: true,
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual({
      code: "projection.deleted_missing_metadata",
      severity: "error",
      message: "Deleted rows require source and reason before pruning.",
      path: ".agents/skills/invalid-delete/SKILL.md",
    });
    expect(readFileSync(join(out, ".agents/skills/invalid-delete/SKILL.md"), "utf8")).toBe(
      "legacy",
    );
  });

  it("detects deleted inventory files still present for a selected runtime", async () => {
    const out = mkdtempSync(join(tmpdir(), "kata-projection-"));
    const coreRoot = copyCoreFixture();
    const inventoryPath = join(coreRoot, "runtimes/projection-inventory.yaml");
    writeFileSync(
      inventoryPath,
      `${readFileSync(inventoryPath, "utf8")}
  - path: .agents/skills/obsolete-skill/SKILL.md
    runtime: codex
    disposition: deleted
    source: cleanup-test
    reason: Historical runtime surface removed.
`,
    );
    await renderProjection({ runtime: "codex", outputRoot: out, coreRoot });
    mkdirSync(join(out, ".agents/skills/obsolete-skill"), { recursive: true });
    writeFileSync(join(out, ".agents/skills/obsolete-skill/SKILL.md"), "legacy");

    const drift = await checkProjection({ runtime: "codex", outputRoot: out, coreRoot });

    expect(drift.ok).toBe(false);
    expect(drift.issues).toContainEqual({
      code: "projection.deleted_file_present",
      severity: "error",
      message: "Runtime file is present but projection inventory marks it deleted.",
      path: ".agents/skills/obsolete-skill/SKILL.md",
    });
  });

  it("detects deleted inventory files still present across all selected runtimes", async () => {
    const out = mkdtempSync(join(tmpdir(), "kata-projection-"));
    const coreRoot = copyCoreFixture();
    const inventoryPath = join(coreRoot, "runtimes/projection-inventory.yaml");
    writeFileSync(
      inventoryPath,
      `${readFileSync(inventoryPath, "utf8")}
  - path: .agents/skills/obsolete-skill/SKILL.md
    runtime: codex
    disposition: deleted
    source: cleanup-test
    reason: Historical runtime surface removed.
  - path: .claude/skills/obsolete-skill/SKILL.md
    runtime: claude
    disposition: deleted
    source: cleanup-test
    reason: Historical runtime surface removed.
`,
    );
    await renderProjection({ runtime: "all", outputRoot: out, coreRoot });
    mkdirSync(join(out, ".agents/skills/obsolete-skill"), { recursive: true });
    mkdirSync(join(out, ".claude/skills/obsolete-skill"), { recursive: true });
    writeFileSync(join(out, ".agents/skills/obsolete-skill/SKILL.md"), "legacy");
    writeFileSync(join(out, ".claude/skills/obsolete-skill/SKILL.md"), "legacy");

    const drift = await checkProjection({ runtime: "all", outputRoot: out, coreRoot });

    expect(drift.ok).toBe(false);
    expect(drift.issues).toContainEqual({
      code: "projection.deleted_file_present",
      severity: "error",
      message: "Runtime file is present but projection inventory marks it deleted.",
      path: ".agents/skills/obsolete-skill/SKILL.md",
    });
    expect(drift.issues).toContainEqual({
      code: "projection.deleted_file_present",
      severity: "error",
      message: "Runtime file is present but projection inventory marks it deleted.",
      path: ".claude/skills/obsolete-skill/SKILL.md",
    });
  });

  it("detects projection drift", async () => {
    const out = mkdtempSync(join(tmpdir(), "kata-projection-"));
    await renderProjection({ runtime: "all", outputRoot: out });
    const drift = await checkProjection({ runtime: "all", outputRoot: out });
    expect(drift.ok).toBe(true);
  });

  it("detects generated inventory entries missing rendered files", async () => {
    const out = mkdtempSync(join(tmpdir(), "kata-projection-"));
    const coreRoot = copyCoreFixture();
    await renderProjection({ runtime: "all", outputRoot: out, coreRoot });
    const inventoryPath = join(coreRoot, "runtimes/projection-inventory.yaml");
    writeFileSync(
      inventoryPath,
      readFileSync(inventoryPath, "utf8").replace(
        [
          "  - path: .agents/skills/case-draft/references/source-intake-protocol.md",
          "    runtime: codex",
          "    disposition: generated",
          "    source: .ai/core/skills/case-draft/references/source-intake-protocol.md",
          "",
        ].join("\n"),
        "",
      ),
    );

    const drift = await checkProjection({ runtime: "all", outputRoot: out, coreRoot });
    expect(drift.ok).toBe(false);
    expect(drift.issues).toContainEqual({
      code: "projection.inventory_mismatch",
      severity: "error",
      message: "Projection inventory generated files do not match renderer output.",
      path: ".ai/core/runtimes/projection-inventory.yaml",
    });
  });

  it("detects runtime generated_files mismatches", async () => {
    const out = mkdtempSync(join(tmpdir(), "kata-projection-"));
    const coreRoot = copyCoreFixture();
    await renderProjection({ runtime: "codex", outputRoot: out, coreRoot });
    const runtimePath = join(coreRoot, "runtimes/codex.yaml");
    writeFileSync(
      runtimePath,
      readFileSync(runtimePath, "utf8").replace(
        "  - .agents/skills/case-draft/references/source-intake-protocol.md\n",
        "",
      ),
    );

    const drift = await checkProjection({ runtime: "codex", outputRoot: out, coreRoot });
    expect(drift.ok).toBe(false);
    expect(drift.issues).toContainEqual({
      code: "projection.runtime_mismatch",
      severity: "error",
      message: "Runtime generated_files do not match renderer output.",
      path: ".ai/core/runtimes/codex.yaml",
    });
  });

  it("detects mutated generated projection content", async () => {
    const out = mkdtempSync(join(tmpdir(), "kata-projection-"));
    await renderProjection({ runtime: "codex", outputRoot: out });
    writeFileSync(join(out, ".agents/skills/case-draft/SKILL.md"), "mutated");
    const drift = await checkProjection({ runtime: "codex", outputRoot: out });
    expect(drift.ok).toBe(false);
    expect(drift.issues).toContainEqual({
      code: "projection.drift",
      severity: "error",
      message: "Generated projection content is stale.",
      path: ".agents/skills/case-draft/SKILL.md",
    });
  });

  it("detects missing generated projection content", async () => {
    const out = mkdtempSync(join(tmpdir(), "kata-projection-"));
    await renderProjection({ runtime: "claude", outputRoot: out });
    unlinkSync(join(out, ".claude/skills/case-draft/references/source-intake-protocol.md"));
    const drift = await checkProjection({ runtime: "claude", outputRoot: out });
    expect(drift.ok).toBe(false);
    expect(drift.issues).toContainEqual({
      code: "projection.drift",
      severity: "error",
      message: "Generated projection content is missing.",
      path: ".claude/skills/case-draft/references/source-intake-protocol.md",
    });
  });
});
