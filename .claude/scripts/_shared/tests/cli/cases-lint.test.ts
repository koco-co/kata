import { describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { lintLanhuBlockedDrafts } from "@shared/cli/cases-lint.ts";
import { lintArchiveCaseQa } from "@shared/lint/archive-case-qa.ts";
import { lintCaseMdSourceRefLeak } from "@shared/lint/case-md-sourceref-leak.ts";
import JSZip from "jszip";

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

describe("kata cases lint", () => {
  it("includes unresolved Lanhu blocked draft validation", async () => {
    const scratch = mkdtempSync(join(tmpdir(), "kata-cases-lint-"));
    try {
      const featureId = "2026-05-unresolved-lanhu-7afabbf5";
      const featureDir = join(scratch, `dataAssets/features/${featureId}`);
      mkdirSync(featureDir, { recursive: true });
      writeFileSync(
        join(featureDir, "manifest.json"),
        JSON.stringify(blockedLanhuManifest(featureId), null, 2),
      );
      writeFileSync(join(featureDir, "confirmation-package.md"), "# Confirmation Package\n");
      writeFileSync(join(featureDir, "archive.draft.md"), "# Draft - unresolved\n");
      writeFileSync(join(featureDir, "unresolved-summary.md"), "# Unresolved Summary\n");

      const result = await lintLanhuBlockedDrafts(scratch, ["dataAssets"]);
      expect(result.violations.map((violation) => violation.rule)).toEqual(
        expect.arrayContaining([
          "lanhu_confirmation_header_invalid",
          "lanhu_unresolved_header_invalid",
          "lanhu_archive_next_step_missing",
        ]),
      );
      expect(result.violations.every((violation) => violation.severity === "fail")).toBe(true);
    } finally {
      rmSync(scratch, { recursive: true, force: true });
    }
  });

  it("does not validate non-Lanhu features through the Lanhu blocked draft gate", async () => {
    const scratch = mkdtempSync(join(tmpdir(), "kata-cases-lint-"));
    try {
      const featureDir = join(scratch, "dataAssets/features/2026-05-regular-feature");
      mkdirSync(featureDir, { recursive: true });
      writeFileSync(join(featureDir, "manifest.json"), "{}");

      const result = await lintLanhuBlockedDrafts(scratch, ["dataAssets"]);
      expect(result.violations).toEqual([]);
    } finally {
      rmSync(scratch, { recursive: true, force: true });
    }
  });

  it("flags SourceRef and SR identifiers in final archive markdown", async () => {
    const scratch = mkdtempSync(join(tmpdir(), "kata-cases-lint-"));
    try {
      const featureDir = join(scratch, "dataAssets/features/2026-05-source-leak");
      mkdirSync(featureDir, { recursive: true });
      writeFileSync(join(featureDir, "archive.md"), "# 用例\n\nSourceRef SR-PRD-001\n");

      const result = await lintCaseMdSourceRefLeak(scratch);

      expect(result.violations).toHaveLength(2);
      expect(result.violations.map((violation) => violation.rule)).toEqual([
        "case-md-sourceref-leak",
        "case-md-sourceref-leak",
      ]);
      expect(result.violations.every((violation) => violation.severity === "fail")).toBe(true);
      expect(result.violations.map((violation) => violation.matched)).toEqual([
        "SourceRef",
        "SR-PRD-001",
      ]);
    } finally {
      rmSync(scratch, { recursive: true, force: true });
    }
  });

  it("does not flag clean archive text", async () => {
    const scratch = mkdtempSync(join(tmpdir(), "kata-cases-lint-"));
    try {
      const featureDir = join(scratch, "dataAssets/features/2026-05-clean-archive");
      mkdirSync(featureDir, { recursive: true });
      writeFileSync(join(featureDir, "archive.md"), "# 用例\n\n登录成功后进入资产列表。\n");

      const result = await lintCaseMdSourceRefLeak(scratch);

      expect(result.violations).toEqual([]);
    } finally {
      rmSync(scratch, { recursive: true, force: true });
    }
  });

  it("does not flag ordinary CSV business wording", async () => {
    const scratch = mkdtempSync(join(tmpdir(), "kata-cases-lint-"));
    try {
      const featureDir = join(scratch, "dataAssets/features/2026-05-csv-business");
      mkdirSync(featureDir, { recursive: true });
      writeFileSync(
        join(featureDir, "archive.md"),
        "# 用例\n\nCSV 导入后第 12 行显示成功。\nCSV 导出后第 12 行展示合计。\nrow 12 should show total.\n校验 checksum validation。\n",
      );

      const result = await lintCaseMdSourceRefLeak(scratch);

      expect(result.violations).toEqual([]);
    } finally {
      rmSync(scratch, { recursive: true, force: true });
    }
  });

  it("flags csv locators and CSV evidence context", async () => {
    const scratch = mkdtempSync(join(tmpdir(), "kata-cases-lint-"));
    try {
      const featureDir = join(scratch, "dataAssets/features/2026-05-csv-evidence");
      mkdirSync(featureDir, { recursive: true });
      writeFileSync(
        join(featureDir, "archive.md"),
        "# 用例\n\ncsv::requirements.csv#L12\nEvidence from CSV row 12 confirms the expectation.\n",
      );

      const result = await lintCaseMdSourceRefLeak(scratch);

      expect(result.violations.map((violation) => violation.matched)).toEqual([
        "csv::requirements.csv#L12",
        "Evidence from CSV row 12",
      ]);
    } finally {
      rmSync(scratch, { recursive: true, force: true });
    }
  });

  it("flags bare CSV filename row and line locators", async () => {
    const scratch = mkdtempSync(join(tmpdir(), "kata-cases-lint-"));
    try {
      const featureDir = join(scratch, "dataAssets/features/2026-05-csv-filename-locator");
      mkdirSync(featureDir, { recursive: true });
      writeFileSync(
        join(featureDir, "archive.md"),
        "# 用例\n\nrequirements.csv#L12\nrequirements.csv:L12\nrequirements.csv row 12\n",
      );

      const result = await lintCaseMdSourceRefLeak(scratch);

      expect(result.violations.map((violation) => violation.matched)).toEqual([
        "requirements.csv#L12",
        "requirements.csv:L12",
        "requirements.csv row 12",
      ]);
    } finally {
      rmSync(scratch, { recursive: true, force: true });
    }
  });

  it("flags bare case archive locators in final archive markdown", async () => {
    const scratch = mkdtempSync(join(tmpdir(), "kata-cases-lint-"));
    try {
      const featureDir = join(scratch, "dataAssets/features/2026-05-case-archive-locator");
      mkdirSync(featureDir, { recursive: true });
      writeFileSync(
        join(featureDir, "archive.md"),
        "# 用例\n\nSource evidence case.archive@1:L3216-L3279 is not presentation text.\n",
      );

      const result = await lintCaseMdSourceRefLeak(scratch);

      expect(result.violations.map((violation) => violation.matched)).toEqual([
        "case.archive@1:L3216-L3279",
      ]);
    } finally {
      rmSync(scratch, { recursive: true, force: true });
    }
  });

  it("scans manifest-declared localized archive and xmind presentation files", async () => {
    const scratch = mkdtempSync(join(tmpdir(), "kata-cases-lint-"));
    try {
      const featureId = "2026-05-localized-artifacts";
      const featureDir = join(scratch, `dataAssets/features/${featureId}`);
      mkdirSync(featureDir, { recursive: true });
      writeFileSync(
        join(featureDir, "manifest.json"),
        JSON.stringify(
          {
            schema: "FeatureManifest@2",
            feature_id: featureId,
            case_drafting: {
              status: "completed",
              archive_path: "中文用例.md",
              xmind_path: "中文用例.xmind",
              requirement_atoms: [],
              coverage_matrix_path: null,
            },
            automation: {
              status: "not-started",
              intents: [],
              last_handoff_path: null,
              last_run_status: "not-run",
            },
            files: {
              archive: "中文用例.md",
              xmind: "中文用例.xmind",
              tests_root: null,
              latest_results: null,
            },
          },
          null,
          2,
        ),
      );
      writeFileSync(join(featureDir, "中文用例.md"), "# 用例\n\nSourceRef should not leak.\n");
      const zip = new JSZip();
      zip.file(
        "content.json",
        JSON.stringify([
          {
            rootTopic: {
              title: "root",
              children: {
                attached: [{ title: "case.archive@1:L3216" }],
              },
            },
          },
        ]),
      );
      writeFileSync(
        join(featureDir, "中文用例.xmind"),
        await zip.generateAsync({ type: "nodebuffer" }),
      );

      const result = await lintCaseMdSourceRefLeak(scratch);

      expect(result.violations.map((violation) => violation.file)).toEqual([
        join(featureDir, "中文用例.md"),
        join(featureDir, "中文用例.xmind"),
      ]);
      expect(result.violations.map((violation) => violation.matched)).toEqual([
        "SourceRef",
        "case.archive@1:L3216",
      ]);
    } finally {
      rmSync(scratch, { recursive: true, force: true });
    }
  });

  it("flags provenance row locators without csv prefix", async () => {
    const scratch = mkdtempSync(join(tmpdir(), "kata-cases-lint-"));
    try {
      const featureDir = join(scratch, "dataAssets/features/2026-05-row-evidence");
      mkdirSync(featureDir, { recursive: true });
      writeFileSync(
        join(featureDir, "archive.md"),
        "# 用例\n\nEvidence from row #12 confirms the expectation.\nsource row 12 is the copied requirement.\nfrom line 8 as evidence.\n",
      );

      const result = await lintCaseMdSourceRefLeak(scratch);

      expect(result.violations.map((violation) => violation.matched)).toEqual([
        "Evidence from row #12",
        "source row 12",
        "from line 8 as evidence",
      ]);
    } finally {
      rmSync(scratch, { recursive: true, force: true });
    }
  });

  it("does not flag ordinary row or line product wording", async () => {
    const scratch = mkdtempSync(join(tmpdir(), "kata-cases-lint-"));
    try {
      const featureDir = join(scratch, "dataAssets/features/2026-05-row-business");
      mkdirSync(featureDir, { recursive: true });
      writeFileSync(
        join(featureDir, "archive.md"),
        "# 用例\n\nrow 12 should show total.\nline 8 displays a validation warning.\nCSV 导入后第 12 行显示成功。\n",
      );

      const result = await lintCaseMdSourceRefLeak(scratch);

      expect(result.violations).toEqual([]);
    } finally {
      rmSync(scratch, { recursive: true, force: true });
    }
  });

  it("flags source ref leaks in XMind attached child topics", async () => {
    const scratch = mkdtempSync(join(tmpdir(), "kata-cases-lint-"));
    try {
      const featureDir = join(scratch, "dataAssets/features/2026-05-xmind-leak");
      mkdirSync(featureDir, { recursive: true });
      const zip = new JSZip();
      zip.file(
        "content.json",
        JSON.stringify([
          {
            rootTopic: {
              title: "root",
              children: {
                attached: [{ title: "child leak SR-PRD-001" }],
              },
            },
          },
        ]),
      );
      writeFileSync(
        join(featureDir, "cases.xmind"),
        await zip.generateAsync({ type: "nodebuffer" }),
      );

      const result = await lintCaseMdSourceRefLeak(scratch);

      expect(result.violations).toHaveLength(1);
      expect(result.violations[0]?.rule).toBe("case-md-sourceref-leak");
      expect(result.violations[0]?.file).toBe(join(featureDir, "cases.xmind"));
      expect(result.violations[0]?.matched).toBe("SR-PRD-001");
    } finally {
      rmSync(scratch, { recursive: true, force: true });
    }
  });

  it("does not scan Lanhu fallback confirmation or unresolved summaries", async () => {
    const scratch = mkdtempSync(join(tmpdir(), "kata-cases-lint-"));
    try {
      const featureDir = join(scratch, "dataAssets/features/2026-05-unresolved-lanhu-7afabbf5");
      mkdirSync(featureDir, { recursive: true });
      writeFileSync(join(featureDir, "confirmation-package.md"), "SourceRefs: SR-PRD-001\n");
      writeFileSync(join(featureDir, "unresolved-summary.md"), "csv::requirements.csv#L12\n");

      const result = await lintCaseMdSourceRefLeak(scratch);

      expect(result.violations).toEqual([]);
    } finally {
      rmSync(scratch, { recursive: true, force: true });
    }
  });

  it("still scans archive.draft.md when unresolved-summary.md exists", async () => {
    const scratch = mkdtempSync(join(tmpdir(), "kata-cases-lint-"));
    try {
      const featureDir = join(scratch, "dataAssets/features/2026-05-unresolved-lanhu-7afabbf5");
      mkdirSync(featureDir, { recursive: true });
      writeFileSync(join(featureDir, "unresolved-summary.md"), "SourceRef SR-PRD-001\n");
      writeFileSync(join(featureDir, "archive.draft.md"), "Resolved draft leaks SR-PRD-001\n");

      const result = await lintCaseMdSourceRefLeak(scratch);

      expect(result.violations).toHaveLength(1);
      expect(result.violations[0]?.file).toBe(join(featureDir, "archive.draft.md"));
      expect(result.violations[0]?.matched).toBe("SR-PRD-001");
    } finally {
      rmSync(scratch, { recursive: true, force: true });
    }
  });

  it("flags archive title with machine identifiers (TC-/SR-/RA-)", () => {
    const scratch = mkdtempSync(join(tmpdir(), "kata-cases-lint-"));
    try {
      const featureId = "2026-05-case-qa";
      const featureDir = join(scratch, "dataAssets/features", featureId);
      mkdirSync(join(featureDir, "cases"), { recursive: true });
      writeFileSync(
        join(featureDir, "cases", "archive.md"),
        [
          "---",
          "suite_name: test",
          "---",
          "# 用例",
          "",
          "##### 【P1】TC-100 登录成功进入资产列表",
          "步骤 1: 打开登录页",
          "",
          "##### 【P2】用户管理-编辑用户信息",
          "步骤 1: 点击编辑",
        ].join("\n"),
      );

      const result = lintArchiveCaseQa(join(scratch, "dataAssets", "features"));
      expect(result.violations.map((v) => v.rule)).toContain("archive-title-machine-id");
      expect(result.violations.some((v) => v.matched?.includes("TC-100"))).toBe(true);
      expect(result.violations.every((v) => v.severity === "fail")).toBe(true);
      expect(result.passed).toBe(false);
    } finally {
      rmSync(scratch, { recursive: true, force: true });
    }
  });

  it("accepts a single feature directory for archive output lint", () => {
    const scratch = mkdtempSync(join(tmpdir(), "kata-cases-lint-"));
    try {
      const featureId = "2026-05-case-qa-feature-scope";
      const featureDir = join(scratch, "dataAssets/features", featureId);
      mkdirSync(join(featureDir, "cases"), { recursive: true });
      writeFileSync(
        join(featureDir, "cases", "archive.md"),
        [
          "---",
          "suite_name: test",
          "---",
          "# 用例",
          "",
          "##### 【P1】TC-100 登录成功进入资产列表",
        ].join("\n"),
      );

      const result = lintArchiveCaseQa(featureDir);
      expect(result.files).toBe(1);
      expect(result.violations.map((v) => v.rule)).toContain("archive-title-machine-id");
    } finally {
      rmSync(scratch, { recursive: true, force: true });
    }
  });
});
