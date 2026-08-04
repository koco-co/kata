import { describe, expect, it } from "bun:test";
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { parse } from "yaml";
import {
  checkRepositoryPolicy,
  trackedAndUntrackedPaths,
} from "../../cli/lib/repository-policy.ts";
import { validateCommitMessage } from "../../cli/lib/commit-message.ts";
import { commitSubjectsInRange } from "../../cli/commands/repo.ts";

const POLICY = String.raw`root:
  allowed_files: [package.json]
  allowed_directories: [cli, config, runtime, workspace]
forbidden_globs:
  - kata-automation-*.config.ts
  - kata-automation-config-*.ts
  - kata-automation-config-*.overrides.json
  - lib/**
  - "**/project.json"
  - runtime/cases/**
  - runtime/playwright/**
  - runtime/db/**
  - workspace/**/automation/README.md
  - workspace/**/automation/scripts/**
  - workspace/*/_shared/helpers/**
  - workspace/*/_shared/rules/**
  - workspace/*/_shared/pages/**
  - workspace/*/_shared/fixtures/**
  - workspace/*/_shared/runtime/**
artifacts:
  cases_yaml:
    route: workspace/<project>/features/<version>/<feature>/cases/<name>.yaml
    filename_pattern: '[^/]+\.yaml'
  case_import:
    route: workspace/<project>/features/<version>/<feature>/cases/imports/<name>.<ext>
    extensions: [csv, xlsx, md, xmind]
  case_export:
    route: workspace/<project>/features/<version>/<feature>/cases/exports/<name>.<ext>
    extensions: [csv, xlsx, md, xmind]
    tracked: false
  automation_case:
    route: workspace/<project>/features/<version>/<feature>/automation/tests/cases/
    filename_pattern: 'c\d{4}-[a-z0-9]+(?:-[a-z0-9]+)*\.spec\.ts'
  automation_sql_template:
    route: workspace/<project>/features/<version>/<feature>/automation/tests/sql/
    filename_pattern: '[a-z0-9]+(?:-[a-z0-9]+)*\.sql'
  automation_run_temporary:
    route: workspace/<project>/features/<version>/<feature>/runs/<run-id>/_tmp/
    tracked: false
shared_modules:
  roots: [workspace/*/_shared/automation]
  minimum_feature_consumers: 2
  page_domain_pattern: "^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$"
dependencies:
  runtime_must_not_import: cli/
  forbidden_import_fragments:
    - runtime/cases/
    - runtime/playwright/
    - runtime/db/
    - _shared/helpers/
    - _shared/pages/
`;

function writePolicy(root: string): void {
  mkdirSync(join(root, "config", "policies"), { recursive: true });
  writeFileSync(join(root, "config", "policies", "repo-policy.yaml"), POLICY);
}

function importPath(from: string, to: string): string {
  const path = relative(dirname(from), to).split("\\").join("/").replace(/\.ts$/, "");
  return path.startsWith(".") ? path : `./${path}`;
}

describe("repository policy", () => {
  it("keeps the deleted standalone contributor guide outside the root allow-list", () => {
    const repoRoot = resolve(import.meta.dir, "../..");
    const policy = parse(
      readFileSync(join(repoRoot, "config", "policies", "repo-policy.yaml"), "utf8"),
    ) as { root: { allowed_files: string[] } };

    expect(existsSync(join(repoRoot, "CONTRIBUTING.md"))).toBe(false);
    expect(policy.root.allowed_files).not.toContain("CONTRIBUTING.md");
  });

  it("keeps business-case semantic repair rules in the shared agent authority", () => {
    const repoRoot = resolve(import.meta.dir, "../..");
    const claude = readFileSync(join(repoRoot, "CLAUDE.md"), "utf8");
    const agents = readFileSync(join(repoRoot, "AGENTS.md"), "utf8");
    expect(agents).toBe(claude);
    expect(claude).toContain("必须结合 PRD、测试点、产品页面和项目知识逐条进行模型语义级修复");
    expect(claude).toContain("禁止使用脚本、正则或批量文本替换机械改写业务用例");
    expect(claude).toContain("脚本只可用于只读扫描、统计、lint、build 和派生产物生成");
  });

  it("exposes the current-repository check through kata repo lint without a root script", () => {
    const repoRoot = resolve(import.meta.dir, "../..");
    expect(existsSync(join(repoRoot, "scripts", "check-repository-policy.ts"))).toBe(false);
    expect(checkRepositoryPolicy(repoRoot, ["scripts/ad-hoc.ts"])).toEqual([
      {
        path: "scripts/ad-hoc.ts",
        reason: '顶层目录 "scripts" 不在允许清单中',
      },
    ]);

    const packageJson = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8")) as {
      scripts: { check: string };
    };
    expect(packageJson.scripts.check).toBe(
      "bun cli/bin/kata.ts repo lint --exit-code && bun cli/bin/kata.ts config validate --exit-code && bun cli/bin/kata.ts config docs --check && bun run test:knowledge-lint && bun run test:cases-lint && biome check .",
    );

    const result = spawnSync(
      "bun",
      [join(repoRoot, "cli", "bin", "kata.ts"), "repo", "lint", "--help"],
      { cwd: repoRoot, encoding: "utf8" },
    );
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("检查当前 Kata 仓库的目录、文件名与依赖边界");
    expect(result.stdout).toContain("--exit-code");
  });

  it("scans the current worktree instead of deleted entries left in the index", () => {
    const root = mkdtempSync(join(tmpdir(), "kata-policy-paths-"));
    execFileSync("git", ["init", "--quiet"], { cwd: root });
    writeFileSync(join(root, "deleted.ts"), "export {};\n");
    writeFileSync(join(root, "kept.ts"), "export {};\n");
    execFileSync("git", ["add", "deleted.ts", "kept.ts"], { cwd: root });
    rmSync(join(root, "deleted.ts"));
    writeFileSync(join(root, "untracked.ts"), "export {};\n");

    expect(trackedAndUntrackedPaths(root)).toEqual(["kept.ts", "untracked.ts"]);
  });

  it("rejects obsolete runtime, project metadata, shared paths and misplaced artifacts", () => {
    const root = mkdtempSync(join(tmpdir(), "kata-policy-"));
    writePolicy(root);
    const violations = checkRepositoryPolicy(root, [
      "package.json",
      "kata-automation-recheck.config.ts",
      "kata-automation-config-stale.ts",
      "kata-automation-config-stale.overrides.json",
      "lib/db/index.ts",
      "workspace/dataAssets/project.json",
      "runtime/cases/parse.ts",
      "runtime/playwright/index.ts",
      "runtime/db/index.ts",
      "workspace/dataAssets/features/v1/a/automation/README.md",
      "workspace/dataAssets/_shared/helpers/index.ts",
      "workspace/dataAssets/_shared/rules/README.md",
      "workspace/dataAssets/_shared/pages/data-quality/page.ts",
      "workspace/dataAssets/features/v1/a/automation/scripts/probe.ts",
      "workspace/dataAssets/features/v1/a/cases/legacy.md",
      "workspace/dataAssets/features/v1/a/automation/tests/cases/C0001.spec.ts",
      "workspace/dataAssets/features/v1/a/automation/tests/sql/Bad_Name.sql",
    ]);
    const rejected = new Set(violations.map((item) => item.path));
    for (const path of [
      "kata-automation-recheck.config.ts",
      "kata-automation-config-stale.ts",
      "kata-automation-config-stale.overrides.json",
      "lib/db/index.ts",
      "workspace/dataAssets/project.json",
      "runtime/cases/parse.ts",
      "runtime/playwright/index.ts",
      "runtime/db/index.ts",
      "workspace/dataAssets/features/v1/a/automation/README.md",
      "workspace/dataAssets/_shared/helpers/index.ts",
      "workspace/dataAssets/_shared/rules/README.md",
      "workspace/dataAssets/_shared/pages/data-quality/page.ts",
      "workspace/dataAssets/features/v1/a/automation/scripts/probe.ts",
      "workspace/dataAssets/features/v1/a/automation/tests/cases/C0001.spec.ts",
      "workspace/dataAssets/features/v1/a/automation/tests/sql/Bad_Name.sql",
      "workspace/dataAssets/features/v1/a/cases/legacy.md",
    ]) {
      expect(rejected.has(path), path).toBe(true);
    }
  });

  it("accepts the registered YAML, import, export and temporary run routes", () => {
    const root = mkdtempSync(join(tmpdir(), "kata-policy-"));
    writePolicy(root);
    expect(
      checkRepositoryPolicy(root, [
        "package.json",
        "cli/lib/cases/parse.ts",
        "runtime/automation/playwright/index.ts",
        "runtime/automation/db/index.ts",
        "workspace/dataAssets/features/v1/a/cases/a.yaml",
        "workspace/dataAssets/features/v1/a/cases/test-points.md",
        "workspace/dataAssets/features/v1/a/cases/imports/history.csv",
        "workspace/dataAssets/features/v1/a/cases/exports/a.xmind",
        "workspace/dataAssets/features/v1/a/automation/tests/cases/c0001-create-rule.spec.ts",
        "workspace/dataAssets/features/v1/a/automation/tests/sql/base-tables.sql",
        "workspace/dataAssets/features/v1/a/runs/20990101-0000-run-01/_tmp/probe.ts",
      ]),
    ).toEqual([]);
  });

  it("keeps the temporary run policy aligned with the ignored feature run path", () => {
    const repoRoot = resolve(import.meta.dir, "../..");
    const policy = parse(
      readFileSync(join(repoRoot, "config", "policies", "repo-policy.yaml"), "utf8"),
    ) as {
      artifacts: { automation_run_temporary: { route: string; tracked: boolean } };
    };

    expect(policy.artifacts.automation_run_temporary).toEqual({
      route: "workspace/<project>/features/<version>/<feature>/runs/<run-id>/_tmp/",
      tracked: false,
    });
    const ignored = spawnSync(
      "git",
      [
        "check-ignore",
        "--no-index",
        "--quiet",
        "workspace/dataAssets/features/v1/a/runs/20990101-0000-run-01/_tmp/probe.ts",
      ],
      { cwd: repoRoot },
    );
    expect(ignored.status).toBe(0);

    const rootReport = spawnSync(
      "git",
      ["check-ignore", "--no-index", "--quiet", "allure-report/index.html"],
      { cwd: repoRoot },
    );
    expect(rootReport.status).toBe(0);
  });

  it("keeps derived case exports ignored and untracked", () => {
    const repoRoot = resolve(import.meta.dir, "../..");
    const policy = parse(
      readFileSync(join(repoRoot, "config", "policies", "repo-policy.yaml"), "utf8"),
    ) as {
      artifacts: { case_export: { route: string; extensions: string[]; tracked: boolean } };
    };
    expect(policy.artifacts.case_export).toEqual({
      route: "workspace/<project>/features/<version>/<feature>/cases/exports/<name>.<ext>",
      extensions: ["csv", "xlsx", "md", "xmind"],
      tracked: false,
    });
    const ignored = spawnSync(
      "git",
      [
        "check-ignore",
        "--no-index",
        "--quiet",
        "workspace/dataAssets/features/v1/a/cases/exports/a.xmind",
      ],
      { cwd: repoRoot },
    );
    expect(ignored.status).toBe(0);
  });

  it("rejects .gitkeep files once their directory contains real content", () => {
    const root = mkdtempSync(join(tmpdir(), "kata-policy-"));
    writePolicy(root);

    expect(
      checkRepositoryPolicy(root, [
        "package.json",
        "workspace/dataAssets/features/.gitkeep",
        "workspace/dataAssets/features/v1/feature-a/cases/cases.yaml",
        "workspace/dataAssets/knowledge/terms/.gitkeep",
      ]),
    ).toEqual([
      {
        path: "workspace/dataAssets/features/.gitkeep",
        reason: ".gitkeep 仅用于保留空目录；目录已有内容时必须删除",
      },
    ]);
  });

  it("requires shared modules to have two transitive feature consumers and stable page domains", () => {
    const root = mkdtempSync(join(tmpdir(), "kata-policy-shared-"));
    writePolicy(root);
    const shared = join(root, "workspace", "dataAssets", "_shared", "automation");
    const page = join(shared, "pages", "data-quality", "task-page.ts");
    const legacyPage = join(shared, "pages", "2099-main-flow", "legacy-page.ts");
    const flow = join(shared, "flows", "quality-task.ts");
    const lonely = join(shared, "assertions", "lonely.ts");
    const caseA = join(
      root,
      "workspace",
      "dataAssets",
      "features",
      "v1",
      "a",
      "automation",
      "tests",
      "cases",
      "c0001-a.spec.ts",
    );
    const caseB = join(
      root,
      "workspace",
      "dataAssets",
      "features",
      "v1",
      "b",
      "automation",
      "tests",
      "cases",
      "c0001-b.spec.ts",
    );
    for (const file of [page, legacyPage, flow, lonely, caseA, caseB]) {
      mkdirSync(dirname(file), { recursive: true });
    }
    writeFileSync(page, "export const page = true;\n");
    writeFileSync(legacyPage, "export const legacy = true;\n");
    writeFileSync(
      flow,
      `import { page } from "${importPath(flow, page)}";\nexport const flow = page;\n`,
    );
    writeFileSync(lonely, "export const lonely = true;\n");
    writeFileSync(
      caseA,
      [
        `import { flow } from "${importPath(caseA, flow)}";`,
        `import { lonely } from "${importPath(caseA, lonely)}";`,
        `import { legacy } from "${importPath(caseA, legacyPage)}";`,
        "void flow; void lonely; void legacy;",
        "",
      ].join("\n"),
    );
    writeFileSync(
      caseB,
      [
        `import { flow } from "${importPath(caseB, flow)}";`,
        `import { legacy } from "${importPath(caseB, legacyPage)}";`,
        "void flow; void legacy;",
        "",
      ].join("\n"),
    );

    const paths = [page, legacyPage, flow, lonely, caseA, caseB].map((path) =>
      relative(root, path).split("\\").join("/"),
    );
    const violations = checkRepositoryPolicy(root, ["package.json", ...paths]);
    expect(
      violations.some(
        (item) =>
          item.path.endsWith("/assertions/lonely.ts") &&
          item.reason.includes("至少 2 个独立 feature"),
      ),
    ).toBe(true);
    expect(
      violations.some(
        (item) =>
          item.path.endsWith("/pages/2099-main-flow/legacy-page.ts") &&
          item.reason.includes("稳定产品领域"),
      ),
    ).toBe(true);
    expect(violations.some((item) => item.path.endsWith("/flows/quality-task.ts"))).toBe(false);
    expect(violations.some((item) => item.path.endsWith("/pages/data-quality/task-page.ts"))).toBe(
      false,
    );
  });

  it("validates every commit subject in a range through commitSubjectsInRange", () => {
    const root = mkdtempSync(join(tmpdir(), "kata-commit-range-"));
    try {
      execFileSync("git", ["init", "-q", "-b", "main", root]);
      execFileSync("git", ["-C", root, "config", "user.name", "Kata Test"]);
      execFileSync("git", ["-C", root, "config", "user.email", "kata@example.invalid"]);
      writeFileSync(join(root, "package.json"), "{\"name\":\"kata\"}\n");
      execFileSync("git", ["-C", root, "add", "package.json"]);
      execFileSync("git", ["-C", root, "commit", "-q", "-m", "✨ feat: base"]);
      const base = execFileSync("git", ["-C", root, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
      execFileSync("git", ["-C", root, "commit", "-q", "--allow-empty", "-m", "🐛 fix: valid"]);
      execFileSync("git", ["-C", root, "commit", "-q", "--allow-empty", "-m", "bad subject"]);

      const subjects = commitSubjectsInRange(base, "HEAD", root);
      expect(subjects.map((entry) => entry.subject)).toEqual([
        "bad subject",
        "🐛 fix: valid",
      ]);
      const reasons = subjects
        .map((entry) => validateCommitMessage(entry.subject))
        .filter((reason): reason is string => Boolean(reason));
      expect(reasons).toEqual(["提交消息必须使用 <emoji> <type>: <摘要> 格式"]);

      const filtered = commitSubjectsInRange(base, "HEAD~1", root);
      expect(filtered.map((entry) => entry.subject)).toEqual(["🐛 fix: valid"]);      expect(filtered.every((entry) => validateCommitMessage(entry.subject) === undefined)).toBe(
        true,
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
