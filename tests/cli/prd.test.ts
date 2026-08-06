import { describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  computePrdDigest,
  finalizePrd,
  lintPrdFeature,
  migrateLegacyPrdLayout,
  PRD_CHECKLIST_SEED,
  type PrdChecklistVerdict,
  type PrdSession,
} from "../../cli/lib/prd.ts";

function feature(): string {
  const root = mkdtempSync(join(tmpdir(), "kata-prd-"));
  const dir = join(
    root,
    "workspace",
    "dataAssets",
    "features",
    "v7.0.1",
    "【16208】【标品】【数据标准】支持配置标准中英文字符限制条件",
  );
  mkdirSync(join(dir, "prd", "evidence"), { recursive: true });
  mkdirSync(join(dir, "prd", "assets"), { recursive: true });
  mkdirSync(join(dir, "prd", ".process"), { recursive: true });
  return dir;
}

function evidence(sourceUrl = "https://lanhuapp.com/web/#/?docId=doc&versionId=v1&pageId=p1") {
  return {
    contract: "kata.prd.evidence/v1",
    source: "lanhu",
    source_url: sourceUrl,
    doc_id: "doc",
    version_id: "v1",
    page_id: "p1",
    requirement_id: "16208",
    title: "支持配置标准中英文字符限制条件",
    pages: [
      {
        id: "p1",
        name: "16208 支持配置标准中英文字符限制条件",
        path: "标品/16208 支持配置标准中英文字符限制条件",
        text: "字符限制支持中文、英文与数字。",
        assets: ["p1-overview.png"],
      },
    ],
  };
}

function session(): PrdSession {
  return {
    contract: "kata.prd.session/v1",
    evidence_digest: "",
    status: "publish_confirmed",
    preparation: {
      knowledge_queries: ["dataAssets/数据标准: verified=1"],
      source_repos: [
        {
          repo: "group/metadata",
          branch: "release/7.0",
          commit: "0123456789abcdef0123456789abcdef01234567",
        },
      ],
      omission_scans: [
        { round: 1, summary: "覆盖需求明确范围、字段和验收。" },
        {
          round: 2,
          summary: "补查权限、兼容和失败恢复。",
          checklist_verdicts: validVerdicts(),
        },
      ],
    },
    questions: [
      {
        id: "Q-001",
        question: "非法字符如何处理？",
        answer: "保存时阻断，并展示明确错误。",
        evidence: ["lanhu:p1"],
        risk: "不阻断会写入不可执行规则。",
        recommendation: "保存时阻断。",
      },
    ],
    decisions: [
      {
        id: "PD-001",
        title: "非法字符处理",
        decision: "保存时阻断，并展示明确错误。",
        sources: ["Q-001", "lanhu:p1"],
      },
    ],
    requirement: {
      title: "支持配置标准中英文字符限制条件",
      sections: {
        "背景、目标与成功标准": "允许配置标准字段的中英文字符限制。",
        范围: "包含标准配置；不包含历史数据自动修复。",
        业务场景: "配置规则并保存。",
        "字段、枚举、校验与错误": "非法字符保存时阻断。",
        验收标准: "AC-001 非法字符无法保存且提示原因。",
      },
      traceability: [
        {
          id: "FR-001",
          statement: "支持配置中英文字符限制。",
          sources: ["lanhu:p1"],
        },
        {
          id: "AC-001",
          statement: "非法字符无法保存且提示原因。",
          sources: ["PD-001"],
        },
      ],
      images: [{ asset: "p1-overview.png", alt: "字符限制配置页" }],
    },
  };
}

/** 覆盖全部清单 ID 的合法判定：CL-002 链到 Q-001，其余按适用条件跳过。 */
function validVerdicts(): PrdChecklistVerdict[] {
  return PRD_CHECKLIST_SEED.map((item) => {
    if (item.id === "CL-002") {
      return { checklist_id: item.id, verdict: "asked" as const, question_id: "Q-001" };
    }
    return { checklist_id: item.id, verdict: "skipped" as const, reason: "对照适用条件跳过" };
  });
}

/** 写入 evidence 与 session 后返回一个触发 finalize 的闭包。 */
function runFinalize(state: PrdSession): () => void {
  const dir = feature();
  const evidenceText = `${JSON.stringify(evidence(), null, 2)}\n`;
  writeFileSync(join(dir, "prd", "evidence", "lanhu.json"), evidenceText);
  state.evidence_digest = computePrdDigest(evidenceText);
  writeFileSync(
    join(dir, "prd", ".process", "session.json"),
    `${JSON.stringify(state, null, 2)}\n`,
  );
  return () => finalizePrd(dir);
}

describe("PRD finalize and lint", () => {
  it("publishes the sole requirement authority with exact frontmatter and valid local assets", () => {
    const dir = feature();
    const source = evidence();
    const evidenceText = `${JSON.stringify(source, null, 2)}\n`;
    writeFileSync(join(dir, "prd", "evidence", "lanhu.json"), evidenceText);
    writeFileSync(join(dir, "prd", "assets", "p1-overview.png"), "png");
    const state = session();
    state.evidence_digest = computePrdDigest(evidenceText);
    writeFileSync(
      join(dir, "prd", ".process", "session.json"),
      `${JSON.stringify(state, null, 2)}\n`,
    );

    const result = finalizePrd(dir);
    const prd = readFileSync(result.path, "utf8");

    expect(prd).toStartWith("---\nsource: lanhu\n");
    expect(prd).toContain(`source_url: "${source.source_url}"`);
    expect(prd).toContain('requirement_id: "16208"');
    expect(prd).toContain(`evidence_digest: "${state.evidence_digest}"`);
    expect(prd).toContain("![字符限制配置页](assets/p1-overview.png)");
    expect(prd).toContain("PD-001");
    expect(prd).toContain("FR-001");
    expect(prd).toContain("AC-001");
    expect(prd).not.toContain("二狗工作指引");
    expect(prd).not.toContain("STAGE 2");
    expect(lintPrdFeature(dir).errors).toEqual([]);
  });

  it("blocks finalize until all questions and final publish confirmation are complete", () => {
    const dir = feature();
    const evidenceText = `${JSON.stringify(evidence(), null, 2)}\n`;
    writeFileSync(join(dir, "prd", "evidence", "lanhu.json"), evidenceText);
    const state = session();
    state.evidence_digest = computePrdDigest(evidenceText);
    state.status = "questioning";
    state.questions[0].answer = "";
    writeFileSync(
      join(dir, "prd", ".process", "session.json"),
      `${JSON.stringify(state, null, 2)}\n`,
    );

    expect(() => finalizePrd(dir)).toThrow(/publish_confirmed|未回答/);
  });

  it("blocks finalize when knowledge, release source or omission preparation evidence is missing", () => {
    const variants: Array<{
      mutate: (state: PrdSession) => void;
      error: RegExp;
    }> = [
      {
        mutate: (state) => {
          state.preparation.knowledge_queries = [];
        },
        error: /项目知识注入/,
      },
      {
        mutate: (state) => {
          state.preparation.source_repos = [];
        },
        error: /release 源码/,
      },
      {
        mutate: (state) => {
          state.preparation.omission_scans = [];
        },
        error: /两轮遗漏扫描/,
      },
    ];

    for (const variant of variants) {
      const dir = feature();
      const evidenceText = `${JSON.stringify(evidence(), null, 2)}\n`;
      writeFileSync(join(dir, "prd", "evidence", "lanhu.json"), evidenceText);
      const state = session();
      state.evidence_digest = computePrdDigest(evidenceText);
      variant.mutate(state);
      writeFileSync(
        join(dir, "prd", ".process", "session.json"),
        `${JSON.stringify(state, null, 2)}\n`,
      );

      expect(() => finalizePrd(dir)).toThrow(variant.error);
    }
  });

  it("reports prompt pollution, unresolved markers, escaping asset refs and missing assets", () => {
    const dir = feature();
    writeFileSync(
      join(dir, "prd", "prd.md"),
      `---
source: lanhu
source_url: "https://lanhuapp.com/"
requirement_id: "16208"
evidence_digest: "sha256:deadbeef"
---
# 需求

二狗工作指引

待确认

![越界](../outside.png)

![缺失](assets/missing.png)
`,
    );
    const rules = lintPrdFeature(dir).errors.map((item) => item.rule);
    expect(rules).toContain("prompt_pollution");
    expect(rules).toContain("unresolved");
    expect(rules).toContain("asset_path");
    expect(rules).toContain("asset_missing");
  });
});

describe("PRD checklist verdicts", () => {
  it("blocks finalize when round-2 omission scan lacks checklist_verdicts", () => {
    const state = session();
    state.preparation.omission_scans[1].checklist_verdicts = undefined;
    expect(runFinalize(state)).toThrow(/checklist_verdicts/);
  });

  it("blocks finalize when any seed checklist item lacks a verdict", () => {
    const state = session();
    state.preparation.omission_scans[1].checklist_verdicts = validVerdicts().slice(1);
    expect(runFinalize(state)).toThrow(/CL-001.*缺少判定/);
  });

  it("blocks finalize when asked verdict is not linked to a known question", () => {
    const state = session();
    const verdicts = validVerdicts();
    verdicts[1].question_id = "Q-999";
    state.preparation.omission_scans[1].checklist_verdicts = verdicts;
    expect(runFinalize(state)).toThrow(/question_id 未链接/);
  });

  it("blocks finalize when asked verdict links to an unanswered question", () => {
    const state = session();
    state.questions[0].answer = "";
    expect(runFinalize(state)).toThrow(/CL-002 链到的问题.*尚未回答/);
  });

  it("blocks finalize when skipped verdict lacks reason", () => {
    const state = session();
    const verdicts = validVerdicts();
    verdicts[2].reason = "";
    state.preparation.omission_scans[1].checklist_verdicts = verdicts;
    expect(runFinalize(state)).toThrow(/CL-003 判定为 skipped 但缺少 reason/);
  });

  it("blocks finalize when self-resolved verdict lacks answer", () => {
    const state = session();
    const verdicts = validVerdicts().map((verdict) =>
      verdict.verdict === "skipped"
        ? { checklist_id: verdict.checklist_id, verdict: "self-resolved" as const, answer: "" }
        : verdict,
    );
    state.preparation.omission_scans[1].checklist_verdicts = verdicts;
    expect(runFinalize(state)).toThrow(/self-resolved 但缺少 answer/);
  });
});

describe("legacy PRD migration", () => {
  it("archives legacy authorities as evidence and moves test points under cases", () => {
    const dir = feature();
    writeFileSync(join(dir, "prd.md"), "# old prd\n");
    writeFileSync(join(dir, "requirement-notes.md"), "# old notes\n");
    writeFileSync(join(dir, "test-points.md"), "# old points\n");

    const dryRun = migrateLegacyPrdLayout(dir, false);
    expect(dryRun.moves).toHaveLength(3);
    expect(readFileSync(join(dir, "prd.md"), "utf8")).toBe("# old prd\n");

    migrateLegacyPrdLayout(dir, true);
    expect(readFileSync(join(dir, "prd", "evidence", "legacy-prd.md"), "utf8")).toBe("# old prd\n");
    expect(readFileSync(join(dir, "prd", "evidence", "legacy-requirement-notes.md"), "utf8")).toBe(
      "# old notes\n",
    );
    expect(readFileSync(join(dir, "cases", "test-points.md"), "utf8")).toContain(
      'prd_digest: "stale:legacy"',
    );
  });
});
