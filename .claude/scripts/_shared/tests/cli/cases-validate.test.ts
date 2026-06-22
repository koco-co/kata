import { describe, expect, it } from "bun:test";
import { execSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runCasesValidate } from "@shared/cli/cases-validate.ts";
import { repoRoot } from "@shared/lib/paths.ts";
import { stringify as stringifyYaml } from "yaml";

describe("kata cases validate", () => {
  function blockedLanhuManifest(featureId: string) {
    return {
      schema: "FeatureManifest@2",
      feature_id: featureId,
      case_drafting: {
        status: "blocked",
        archive_path: null,
        xmind_path: null,
        requirement_atoms: [],
      },
      automation: {
        status: "blocked",
        intents: [],
        last_run_status: "not-run",
      },
      files: { archive: null, xmind: null, tests_root: null, latest_results: null },
    };
  }

  it("exposes validate subcommand", () => {
    const out = execSync(
      `bun ${join(repoRoot(), ".claude/scripts/_shared/bin/kata")} cases --help`,
      {
        encoding: "utf-8",
      },
    );
    expect(out).toContain("validate");
  });

  it("rejects a missing feature", async () => {
    const scratch = mkdtempSync(join(tmpdir(), "kata-cases-validate-"));
    try {
      const result = await runCasesValidate({
        project: "dataAssets",
        featureId: "2026-05-missing",
        workspaceRoot: scratch,
        checkSourceRefs: [],
      });
      expect(result.ok).toBe(false);
      expect(result.issues.map((issue) => issue.rule)).toContain("feature_not_found");
    } finally {
      rmSync(scratch, { recursive: true, force: true });
    }
  });

  it("requires requested SourceRef schemes in feature artifacts", async () => {
    const scratch = mkdtempSync(join(tmpdir(), "kata-cases-validate-"));
    try {
      const featureDir = join(scratch, "dataAssets/features/2026-05-demo");
      mkdirSync(featureDir, { recursive: true });
      writeFileSync(
        join(featureDir, "manifest.json"),
        JSON.stringify({
          schema: "FeatureManifest@2",
          feature_id: "2026-05-demo",
          case_drafting: {
            status: "completed",
            archive_path: "archive.md",
            xmind_path: null,
            requirement_atoms: [
              {
                id: "RA-001",
                source_ref: `prd.file:demo#sha256:${"a".repeat(64)}`,
                ambiguity_class: "confirmed",
                confidence: "high",
              },
            ],
            coverage_matrix_path: "coverage-matrix.json",
          },
          automation: {
            status: "not-started",
            intents: [],
            last_handoff_path: null,
            last_run_status: "not-run",
          },
          files: { archive: "archive.md", xmind: null, tests_root: null, latest_results: null },
        }),
      );

      const result = await runCasesValidate({
        project: "dataAssets",
        featureId: "2026-05-demo",
        workspaceRoot: scratch,
        checkSourceRefs: ["prd.file", "lanhu.fixture"],
      });
      expect(result.ok).toBe(false);
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          rule: "source_ref_missing",
          message: expect.stringContaining("lanhu.fixture"),
        }),
      );

      writeFileSync(
        join(featureDir, "archive.md"),
        `SourceRef: lanhu.fixture:demo#sha256:${"b".repeat(64)}\n`,
      );
      const fixed = await runCasesValidate({
        project: "dataAssets",
        featureId: "2026-05-demo",
        workspaceRoot: scratch,
        checkSourceRefs: ["prd.file", "lanhu.fixture"],
      });
      expect(fixed.ok).toBe(true);
    } finally {
      rmSync(scratch, { recursive: true, force: true });
    }
  });

  it("validates unresolved Lanhu blocked draft structure", async () => {
    const scratch = mkdtempSync(join(tmpdir(), "kata-cases-validate-"));
    try {
      const featureId = "2026-05-unresolved-lanhu-7afabbf5";
      const featureDir = join(scratch, `dataAssets/features/${featureId}`);
      mkdirSync(featureDir, { recursive: true });
      writeFileSync(
        join(featureDir, "manifest.json"),
        JSON.stringify(blockedLanhuManifest(featureId), null, 2),
      );
      writeFileSync(
        join(featureDir, "confirmation-package.md"),
        "## 原始 URL\n\n```text\nhttps://lanhuapp.com/web/#/item/project/product?tid=24a1c6b2-a52e-454c-8d51-8aff866598b1&pid=7de90493-e80f-4592-a263-38fb2d2e98c0&versionId=75c3a864-be9f-4da2-9120-badaa403b2da&docId=fc0fee93-74f5-4eff-a769-99e68506b296&docType=axure&pageId=7afabbf5f0cf4d0680704ab3b5f20295\n```\n\n## SourceRefs\n- SR-LANHU-URL-001\n",
      );
      writeFileSync(
        join(featureDir, "archive.draft.md"),
        "# 蓝湖页面阻塞草稿\n\n## 下一步\n这个 Lanhu 页面对应的功能/页面名称是什么？\n",
      );
      writeFileSync(
        join(featureDir, "unresolved-summary.md"),
        "## Blocking / Pending\n- 这个 Lanhu 页面对应的功能/页面名称是什么？\n\n## Deferred Items\n- 截图或导出 PRD\n",
      );

      const result = await runCasesValidate({
        project: "dataAssets",
        featureId,
        workspaceRoot: scratch,
        checkSourceRefs: [],
      });
      expect(result).toEqual({ ok: true, issues: [] });
    } finally {
      rmSync(scratch, { recursive: true, force: true });
    }
  });

  it("reports unresolved Lanhu blocked draft contract violations", async () => {
    const scratch = mkdtempSync(join(tmpdir(), "kata-cases-validate-"));
    try {
      const featureId = "2026-05-unresolved-lanhu-7afabbf5";
      const featureDir = join(scratch, `dataAssets/features/${featureId}`);
      mkdirSync(join(featureDir, "inputs/lanhu-snapshots"), { recursive: true });
      writeFileSync(
        join(featureDir, "manifest.json"),
        JSON.stringify(
          {
            ...blockedLanhuManifest(featureId),
            case_drafting: {
              status: "completed",
              archive_path: "archive.md",
              xmind_path: null,
              requirement_atoms: [],
            },
          },
          null,
          2,
        ),
      );
      writeFileSync(join(featureDir, "confirmation-package.md"), "# Confirmation Package\n");
      writeFileSync(
        join(featureDir, "archive.draft.md"),
        "# Draft - unresolved\n\n## Next\nNeed info\n",
      );
      writeFileSync(join(featureDir, "unresolved-summary.md"), "# Unresolved Summary\n");

      const result = await runCasesValidate({
        project: "dataAssets",
        featureId,
        workspaceRoot: scratch,
        checkSourceRefs: [],
      });
      expect(result.ok).toBe(false);
      expect(result.issues.map((issue) => issue.rule)).toEqual(
        expect.arrayContaining([
          "lanhu_blocked_inputs_forbidden",
          "lanhu_confirmation_header_invalid",
          "lanhu_unresolved_header_invalid",
          "lanhu_archive_next_step_missing",
          "lanhu_archive_pending_section_forbidden",
          "lanhu_confirmation_sourcerefs_missing",
          "lanhu_blocked_manifest_status_invalid",
          "lanhu_blocked_manifest_paths_invalid",
        ]),
      );
    } finally {
      rmSync(scratch, { recursive: true, force: true });
    }
  });

  it("requires unresolved Lanhu feature id suffix to be exactly eight characters", async () => {
    const scratch = mkdtempSync(join(tmpdir(), "kata-cases-validate-"));
    try {
      const featureId = "2026-05-unresolved-lanhu-7abbf5";
      const featureDir = join(scratch, `dataAssets/features/${featureId}`);
      mkdirSync(featureDir, { recursive: true });
      writeFileSync(
        join(featureDir, "manifest.json"),
        JSON.stringify(blockedLanhuManifest(featureId), null, 2),
      );
      writeFileSync(join(featureDir, "confirmation-package.md"), "## 原始 URL\n\n## SourceRefs\n");
      writeFileSync(
        join(featureDir, "archive.draft.md"),
        "# 蓝湖页面阻塞草稿\n\n## 下一步\n这个 Lanhu 页面对应的功能/页面名称是什么？\n",
      );
      writeFileSync(
        join(featureDir, "unresolved-summary.md"),
        "## Blocking / Pending\n- 这个 Lanhu 页面对应的功能/页面名称是什么？\n",
      );

      const result = await runCasesValidate({
        project: "dataAssets",
        featureId,
        workspaceRoot: scratch,
        checkSourceRefs: [],
      });
      expect(result.ok).toBe(false);
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          rule: "lanhu_feature_id_suffix_invalid",
        }),
      );
    } finally {
      rmSync(scratch, { recursive: true, force: true });
    }
  });

  it("requires unresolved Lanhu confirmation URL to preserve pageId", async () => {
    const scratch = mkdtempSync(join(tmpdir(), "kata-cases-validate-"));
    try {
      const featureId = "2026-05-unresolved-lanhu-7afabbf5";
      const featureDir = join(scratch, `dataAssets/features/${featureId}`);
      mkdirSync(featureDir, { recursive: true });
      writeFileSync(
        join(featureDir, "manifest.json"),
        JSON.stringify(blockedLanhuManifest(featureId), null, 2),
      );
      writeFileSync(
        join(featureDir, "confirmation-package.md"),
        "## 原始 URL\n\n```text\nhttps://lanhu.example/\n```\n\n## SourceRefs\n",
      );
      writeFileSync(
        join(featureDir, "archive.draft.md"),
        "# 蓝湖页面阻塞草稿\n\n## 下一步\n这个 Lanhu 页面对应的功能/页面名称是什么？\n",
      );
      writeFileSync(
        join(featureDir, "unresolved-summary.md"),
        "## Blocking / Pending\n- 这个 Lanhu 页面对应的功能/页面名称是什么？\n",
      );

      const result = await runCasesValidate({
        project: "dataAssets",
        featureId,
        workspaceRoot: scratch,
        checkSourceRefs: [],
      });
      expect(result.ok).toBe(false);
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          rule: "lanhu_confirmation_pageid_missing",
        }),
      );
    } finally {
      rmSync(scratch, { recursive: true, force: true });
    }
  });

  it("requires unresolved Lanhu confirmation URL to use a fenced one-line URL", async () => {
    const scratch = mkdtempSync(join(tmpdir(), "kata-cases-validate-"));
    try {
      const featureId = "2026-05-unresolved-lanhu-7afabbf5";
      const featureDir = join(scratch, `dataAssets/features/${featureId}`);
      mkdirSync(featureDir, { recursive: true });
      writeFileSync(
        join(featureDir, "manifest.json"),
        JSON.stringify(blockedLanhuManifest(featureId), null, 2),
      );
      writeFileSync(
        join(featureDir, "confirmation-package.md"),
        "## 原始 URL\n\nhttps://lanhuapp.com/web/#/item/project/product?pageId=7afabbf5f0cf4d0680704ab3b5f20295\n\n## SourceRefs\n",
      );
      writeFileSync(
        join(featureDir, "archive.draft.md"),
        "# 蓝湖页面阻塞草稿\n\n## 下一步\n这个 Lanhu 页面对应的功能/页面名称是什么？\n",
      );
      writeFileSync(
        join(featureDir, "unresolved-summary.md"),
        "## Blocking / Pending\n- 这个 Lanhu 页面对应的功能/页面名称是什么？\n",
      );

      const result = await runCasesValidate({
        project: "dataAssets",
        featureId,
        workspaceRoot: scratch,
        checkSourceRefs: [],
      });
      expect(result.ok).toBe(false);
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          rule: "lanhu_confirmation_original_url_invalid",
        }),
      );
    } finally {
      rmSync(scratch, { recursive: true, force: true });
    }
  });

  it("requires unresolved Lanhu confirmation URL to be a lanhuapp.com URL", async () => {
    const scratch = mkdtempSync(join(tmpdir(), "kata-cases-validate-"));
    try {
      const featureId = "2026-05-unresolved-lanhu-7afabbf5";
      const featureDir = join(scratch, `dataAssets/features/${featureId}`);
      mkdirSync(featureDir, { recursive: true });
      writeFileSync(
        join(featureDir, "manifest.json"),
        JSON.stringify(blockedLanhuManifest(featureId), null, 2),
      );
      writeFileSync(
        join(featureDir, "confirmation-package.md"),
        "## 原始 URL\n\n```text\nhttps://example.com/prototype?pageId=7afabbf5f0cf4d0680704ab3b5f20295\n```\n\n## SourceRefs\n",
      );
      writeFileSync(
        join(featureDir, "archive.draft.md"),
        "# 蓝湖页面阻塞草稿\n\n## 下一步\n这个 Lanhu 页面对应的功能/页面名称是什么？\n",
      );
      writeFileSync(
        join(featureDir, "unresolved-summary.md"),
        "## Blocking / Pending\n- 这个 Lanhu 页面对应的功能/页面名称是什么？\n",
      );

      const result = await runCasesValidate({
        project: "dataAssets",
        featureId,
        workspaceRoot: scratch,
        checkSourceRefs: [],
      });
      expect(result.ok).toBe(false);
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          rule: "lanhu_confirmation_host_invalid",
        }),
      );
    } finally {
      rmSync(scratch, { recursive: true, force: true });
    }
  });

  it("requires unresolved Lanhu feature id suffix to match confirmation pageId", async () => {
    const scratch = mkdtempSync(join(tmpdir(), "kata-cases-validate-"));
    try {
      const featureId = "2026-05-unresolved-lanhu-deadbeef";
      const featureDir = join(scratch, `dataAssets/features/${featureId}`);
      mkdirSync(featureDir, { recursive: true });
      writeFileSync(
        join(featureDir, "manifest.json"),
        JSON.stringify(blockedLanhuManifest(featureId), null, 2),
      );
      writeFileSync(
        join(featureDir, "confirmation-package.md"),
        "## 原始 URL\n\n```text\nhttps://lanhuapp.com/web/#/item/project/product?pageId=7afabbf5f0cf4d0680704ab3b5f20295\n```\n\n## SourceRefs\n",
      );
      writeFileSync(
        join(featureDir, "archive.draft.md"),
        "# 蓝湖页面阻塞草稿\n\n## 下一步\n这个 Lanhu 页面对应的功能/页面名称是什么？\n",
      );
      writeFileSync(
        join(featureDir, "unresolved-summary.md"),
        "## Blocking / Pending\n- 这个 Lanhu 页面对应的功能/页面名称是什么？\n",
      );

      const result = await runCasesValidate({
        project: "dataAssets",
        featureId,
        workspaceRoot: scratch,
        checkSourceRefs: [],
      });
      expect(result.ok).toBe(false);
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          rule: "lanhu_feature_id_pageid_mismatch",
        }),
      );
    } finally {
      rmSync(scratch, { recursive: true, force: true });
    }
  });

  it("does not count malformed SourceRefs as evidence", async () => {
    const scratch = mkdtempSync(join(tmpdir(), "kata-cases-validate-"));
    try {
      const featureDir = join(scratch, "dataAssets/features/2026-05-demo");
      mkdirSync(featureDir, { recursive: true });
      writeFileSync(
        join(featureDir, "manifest.json"),
        JSON.stringify({
          schema: "FeatureManifest@2",
          feature_id: "2026-05-demo",
          case_drafting: { status: "not-started", requirement_atoms: [] },
          automation: {
            status: "not-started",
            intents: [],
            last_handoff_path: null,
            last_run_status: "not-run",
          },
          files: {},
        }),
      );
      writeFileSync(join(featureDir, "archive.md"), "SourceRef: lanhu.fixture:demo#sha256:abc\n");

      const result = await runCasesValidate({
        project: "dataAssets",
        featureId: "2026-05-demo",
        workspaceRoot: scratch,
        checkSourceRefs: ["lanhu.fixture"],
      });
      expect(result.ok).toBe(false);
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          rule: "source_ref_missing",
          message: expect.stringContaining("lanhu.fixture"),
        }),
      );
    } finally {
      rmSync(scratch, { recursive: true, force: true });
    }
  });

  it("returns structured issues for malformed manifest JSON", async () => {
    const scratch = mkdtempSync(join(tmpdir(), "kata-cases-validate-"));
    try {
      const featureDir = join(scratch, "dataAssets/features/2026-05-demo");
      mkdirSync(featureDir, { recursive: true });
      writeFileSync(join(featureDir, "manifest.json"), "{ nope");
      const result = await runCasesValidate({
        project: "dataAssets",
        featureId: "2026-05-demo",
        workspaceRoot: scratch,
        checkSourceRefs: [],
      });
      expect(result.ok).toBe(false);
      expect(result.issues.map((issue) => issue.rule)).toContain("manifest_json_invalid");
    } finally {
      rmSync(scratch, { recursive: true, force: true });
    }
  });

  it("rejects project and featureId path traversal", async () => {
    const scratch = mkdtempSync(join(tmpdir(), "kata-cases-validate-"));
    try {
      const badProject = await runCasesValidate({
        project: "../outside",
        featureId: "2026-05-demo",
        workspaceRoot: scratch,
        checkSourceRefs: [],
      });
      expect(badProject.ok).toBe(false);
      expect(badProject.issues.map((issue) => issue.rule)).toContain("project_invalid");

      const badFeature = await runCasesValidate({
        project: "dataAssets",
        featureId: "../outside",
        workspaceRoot: scratch,
        checkSourceRefs: [],
      });
      expect(badFeature.ok).toBe(false);
      expect(badFeature.issues.map((issue) => issue.rule)).toContain("feature_id_invalid");
    } finally {
      rmSync(scratch, { recursive: true, force: true });
    }
  });

  // Fix D: @2 feature path — no manifest.json needed; source refs collected from cases/ subdir
  it("@2 feature: validates without manifest.json using metadata.yaml", async () => {
    const scratch = mkdtempSync(join(tmpdir(), "kata-cases-validate-v2-"));
    try {
      const featureDir = join(scratch, "dataAssets/features/2026-05-v2-demo");
      mkdirSync(join(featureDir, "cases"), { recursive: true });
      writeFileSync(
        join(featureDir, "metadata.yaml"),
        stringifyYaml({
          schema: "FeatureMetadata@2",
          id: "2026-05-v2-demo",
          display_name: "V2 demo",
          status: "active",
          created_at: "2026-05-01",
          updated_at: "2026-05-01",
          modules: ["dq"],
          customers: [],
          versions: [],
          owners: ["qa"],
          inputs: [],
          relates_to: [],
          emits: {},
          case_drafting: { status: "in-progress" },
          automation: { status: "not-started", intents: [], last_run_status: "not-run" },
          files: {},
        }),
      );
      // No manifest.json — @2 feature should not fail with manifest_missing
      const result = await runCasesValidate({
        project: "dataAssets",
        featureId: "2026-05-v2-demo",
        workspaceRoot: scratch,
        checkSourceRefs: [],
      });
      expect(result.issues.map((i) => i.rule)).not.toContain("manifest_missing");
      expect(result.ok).toBe(true);
    } finally {
      rmSync(scratch, { recursive: true, force: true });
    }
  });

  it("@2 feature: source refs collected from cases/ subdir", async () => {
    const scratch = mkdtempSync(join(tmpdir(), "kata-cases-validate-v2-"));
    try {
      const featureDir = join(scratch, "dataAssets/features/2026-05-v2-refs");
      mkdirSync(join(featureDir, "cases"), { recursive: true });
      writeFileSync(
        join(featureDir, "metadata.yaml"),
        stringifyYaml({
          schema: "FeatureMetadata@2",
          id: "2026-05-v2-refs",
          display_name: "V2 refs",
          status: "active",
          created_at: "2026-05-01",
          updated_at: "2026-05-01",
          modules: ["dq"],
          customers: [],
          versions: [],
          owners: ["qa"],
          inputs: [],
          relates_to: [],
          emits: {},
          case_drafting: { status: "in-progress" },
          automation: { status: "not-started", intents: [], last_run_status: "not-run" },
          files: {},
        }),
      );
      // place source ref in cases/archive.md
      writeFileSync(
        join(featureDir, "cases/archive.md"),
        `SourceRef: lanhu.fixture:demo#sha256:${"b".repeat(64)}\n`,
      );
      const result = await runCasesValidate({
        project: "dataAssets",
        featureId: "2026-05-v2-refs",
        workspaceRoot: scratch,
        checkSourceRefs: ["lanhu.fixture"],
      });
      expect(result.ok).toBe(true);
    } finally {
      rmSync(scratch, { recursive: true, force: true });
    }
  });

  // ─── Feature 定位（@2 两级布局 + _standing + 中文目录名/slug 双向匹配）───

  function v2Meta(opts: { id: string; featureId?: string }) {
    return stringifyYaml({
      schema: "FeatureMetadata@2",
      id: opts.id,
      ...(opts.featureId ? { feature_id: opts.featureId } : {}),
      display_name: opts.id,
      status: "active",
      created_at: "2026-06-22",
      updated_at: "2026-06-22",
      modules: ["dq"],
      customers: [],
      versions: [],
      owners: [],
      inputs: [],
      relates_to: [],
      emits: {},
      case_drafting: { status: "completed" },
      automation: { status: "not-started", intents: [], last_run_status: "not-run" },
      files: {},
    });
  }

  it("locates a version-subdir feature with a CJK dirName by metadata.feature_id (slug)", async () => {
    const scratch = mkdtempSync(join(tmpdir(), "kata-cases-validate-loc-"));
    try {
      const dirName = "【v700】【浙商证券】【数据质量】StarRocks3.x数据源支持";
      const featureDir = join(scratch, "dataAssets/features/v7.0.0", dirName);
      mkdirSync(join(featureDir, "cases"), { recursive: true });
      writeFileSync(
        join(featureDir, "metadata.yaml"),
        v2Meta({ id: dirName, featureId: "2026-06-dq-starrocks3x" }),
      );

      const result = await runCasesValidate({
        project: "dataAssets",
        featureId: "2026-06-dq-starrocks3x",
        workspaceRoot: scratch,
        checkSourceRefs: [],
      });
      expect(result.issues.map((i) => i.rule)).not.toContain("feature_not_found");
      expect(result.ok).toBe(true);
    } finally {
      rmSync(scratch, { recursive: true, force: true });
    }
  });

  it("locates a version-subdir feature by its on-disk CJK dirName", async () => {
    const scratch = mkdtempSync(join(tmpdir(), "kata-cases-validate-loc-"));
    try {
      const dirName = "【v700】【浙商证券】【数据质量】StarRocks3.x数据源支持";
      const featureDir = join(scratch, "dataAssets/features/v7.0.0", dirName);
      mkdirSync(join(featureDir, "cases"), { recursive: true });
      writeFileSync(
        join(featureDir, "metadata.yaml"),
        v2Meta({ id: dirName, featureId: "2026-06-dq-starrocks3x" }),
      );

      const result = await runCasesValidate({
        project: "dataAssets",
        featureId: dirName,
        workspaceRoot: scratch,
        checkSourceRefs: [],
      });
      expect(result.issues.map((i) => i.rule)).not.toContain("feature_not_found");
      expect(result.ok).toBe(true);
    } finally {
      rmSync(scratch, { recursive: true, force: true });
    }
  });

  it("locates a feature under _standing by slug", async () => {
    const scratch = mkdtempSync(join(tmpdir(), "kata-cases-validate-loc-"));
    try {
      const dirName = "2026-06-standing-demo";
      const featureDir = join(scratch, "dataAssets/features/_standing", dirName);
      mkdirSync(join(featureDir, "cases"), { recursive: true });
      writeFileSync(
        join(featureDir, "metadata.yaml"),
        v2Meta({ id: dirName, featureId: "2026-06-standing-slug" }),
      );

      const result = await runCasesValidate({
        project: "dataAssets",
        featureId: "2026-06-standing-slug",
        workspaceRoot: scratch,
        checkSourceRefs: [],
      });
      expect(result.issues.map((i) => i.rule)).not.toContain("feature_not_found");
      expect(result.ok).toBe(true);
    } finally {
      rmSync(scratch, { recursive: true, force: true });
    }
  });

  it("still reports feature_not_found for an unknown slug across all layers", async () => {
    const scratch = mkdtempSync(join(tmpdir(), "kata-cases-validate-loc-"));
    try {
      const featureDir = join(scratch, "dataAssets/features/v7.0.0/【v700】only");
      mkdirSync(join(featureDir, "cases"), { recursive: true });
      writeFileSync(join(featureDir, "metadata.yaml"), v2Meta({ id: "【v700】only" }));

      const result = await runCasesValidate({
        project: "dataAssets",
        featureId: "2026-06-does-not-exist",
        workspaceRoot: scratch,
        checkSourceRefs: [],
      });
      expect(result.ok).toBe(false);
      expect(result.issues.map((i) => i.rule)).toContain("feature_not_found");
    } finally {
      rmSync(scratch, { recursive: true, force: true });
    }
  });

  it("defaults --check-source-refs to empty (opt-in), not prd.file,lanhu.fixture", () => {
    const out = execSync(
      `bun ${join(repoRoot(), ".claude/scripts/_shared/bin/kata")} cases validate --help`,
      { encoding: "utf-8" },
    );
    expect(out).toContain("--check-source-refs");
    expect(out).not.toContain("prd.file,lanhu.fixture");
  });
});
