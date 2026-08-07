import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  statSync,
  unlinkSync,
} from "node:fs";
import { basename, dirname, join, normalize, relative, resolve } from "node:path";
import { parse, stringify } from "yaml";
import { writeFileAtomic } from "./atomic-writer.ts";
import { assertFeatureNoSymlink, assertNoSymlinkPath } from "./features-layout.ts";

export const PRD_SECTION_ORDER = [
  "需求身份与来源",
  "背景、目标与成功标准",
  "范围",
  "角色、权限与前置条件",
  "现状与变更",
  "业务场景",
  "字段、枚举、校验与错误",
  "状态与数据规则",
  "异常、边界与兼容性",
  "依赖与影响",
  "已确认的产品决策",
  "验收标准",
  "截图与证据追踪",
] as const;

const PRD_FRONTMATTER_KEYS = ["source", "source_url", "requirement_id", "evidence_digest"] as const;
const PROMPT_POLLUTION =
  /二狗工作指引|STAGE\s*[1-4]|Return Format|Your Mission|Building God's View|分析完本组页面后，必须按以下格式输出/i;
const UNRESOLVED = /(?<!等)待确认|用户确认补充|TODO|TBD|待补充/;

/**
 * PRD 澄清遗漏问题清单稳定集合。
 * 与 `.claude/skills/test-case/checklists/clarify.md` 保持一致；新增条目须双处同步。
 */
export const PRD_CHECKLIST_SEED = [
  { id: "CL-001", title: "兼容与迁移" },
  { id: "CL-002", title: "边界值与枚举" },
  { id: "CL-003", title: "权限与角色" },
  { id: "CL-004", title: "失败与恢复" },
  { id: "CL-005", title: "并发与幂等" },
  { id: "CL-006", title: "依赖影响" },
] as const;

export interface PrdEvidencePage {
  id: string;
  name: string;
  path: string;
  text: string;
  assets: string[];
}

export interface PrdEvidence {
  contract: "kata.prd.evidence/v1";
  source: "lanhu";
  source_url: string;
  doc_id: string;
  version_id: string;
  page_id: string;
  requirement_id: string;
  title: string;
  pages: PrdEvidencePage[];
}

export interface PrdQuestion {
  id: string;
  question: string;
  answer: string;
  evidence: string[];
  risk: string;
  recommendation: string;
}

export type PrdChecklistVerdictValue = "asked" | "skipped" | "self-resolved";

export interface PrdChecklistVerdict {
  checklist_id: string;
  verdict: PrdChecklistVerdictValue;
  /** verdict = asked 时必填，指向 questions[].id 且该问题必须已答（「不涉及/范围外」也算答）。 */
  question_id?: string;
  /** verdict = skipped 时必填，写明对应的适用条件。 */
  reason?: string;
  /** verdict = self-resolved 时必填，写入自查结论。 */
  answer?: string;
}

export interface PrdDecision {
  id: string;
  title: string;
  decision: string;
  sources: string[];
}

export interface PrdTraceItem {
  id: string;
  statement: string;
  sources: string[];
}

export interface PrdSession {
  contract: "kata.prd.session/v1";
  evidence_digest: string;
  status: "questioning" | "review_ready" | "publish_confirmed";
  preparation: {
    knowledge_queries: string[];
    source_repos: { repo: string; branch: string; commit: string }[];
    omission_scans: {
      round: 1 | 2;
      summary: string;
      /** 第 2 轮遗漏扫描的澄清清单判定；ID 集合见 PRD_CHECKLIST_SEED。 */
      checklist_verdicts?: PrdChecklistVerdict[];
    }[];
  };
  questions: PrdQuestion[];
  decisions: PrdDecision[];
  requirement: {
    title: string;
    sections: Partial<Record<(typeof PRD_SECTION_ORDER)[number], string>>;
    traceability: PrdTraceItem[];
    images: { asset: string; alt: string }[];
  };
}

export interface PrdLintItem {
  rule: string;
  message: string;
}

export function computePrdDigest(content: string | Buffer): string {
  return `sha256:${createHash("sha256").update(content).digest("hex")}`;
}

function readJson<T>(path: string): T {
  if (!existsSync(path)) throw new Error(`缺少文件: ${path}`);
  try {
    return JSON.parse(readFileSync(path, "utf8")) as T;
  } catch (error) {
    throw new Error(`${path} JSON 无法解析: ${(error as Error).message}`);
  }
}

function yamlScalar(value: string): string {
  return JSON.stringify(value);
}

function renderSources(sources: string[]): string {
  return sources.map((source) => `\`${source}\``).join("、");
}

/** finalize 硬门：澄清清单每条必有判定，asked 必须链到已回答问题。 */
function assertChecklistVerdicts(session: PrdSession): void {
  const round2 = session.preparation.omission_scans.find((scan) => scan.round === 2);
  const verdicts = round2?.checklist_verdicts;
  if (!verdicts || verdicts.length === 0) {
    throw new Error("session 第 2 轮遗漏扫描缺少 checklist_verdicts");
  }
  const seedIds = new Set<string>(PRD_CHECKLIST_SEED.map((item) => item.id));
  const questionById = new Map(session.questions.map((question) => [question.id, question]));
  const seen = new Set<string>();
  for (const verdict of verdicts) {
    if (!seedIds.has(verdict.checklist_id)) throw new Error(`非法清单 ID: ${verdict.checklist_id}`);
    if (seen.has(verdict.checklist_id)) throw new Error(`重复清单判定: ${verdict.checklist_id}`);
    seen.add(verdict.checklist_id);
    if (!["asked", "skipped", "self-resolved"].includes(verdict.verdict)) {
      throw new Error(`${verdict.checklist_id} 非法判定状态: ${verdict.verdict}`);
    }
    if (verdict.verdict === "asked") {
      const question = verdict.question_id ? questionById.get(verdict.question_id) : undefined;
      if (!question) {
        throw new Error(`${verdict.checklist_id} 判定为 asked 但 question_id 未链接到已登记问题`);
      }
      if (!question.answer.trim()) {
        throw new Error(`${verdict.checklist_id} 链到的问题 ${question.id} 尚未回答`);
      }
    }
    if (verdict.verdict === "skipped" && !verdict.reason?.trim()) {
      throw new Error(`${verdict.checklist_id} 判定为 skipped 但缺少 reason`);
    }
    if (verdict.verdict === "self-resolved" && !verdict.answer?.trim()) {
      throw new Error(`${verdict.checklist_id} 判定为 self-resolved 但缺少 answer`);
    }
  }
  for (const item of PRD_CHECKLIST_SEED) {
    if (!seen.has(item.id)) throw new Error(`清单 ${item.id} ${item.title} 缺少判定`);
  }
}

function assertFinalizable(
  featureDir: string,
  evidence: PrdEvidence,
  evidenceText: string,
  session: PrdSession,
): void {
  if (evidence.contract !== "kata.prd.evidence/v1") {
    throw new Error("prd/evidence/lanhu.json contract 必须为 kata.prd.evidence/v1");
  }
  if (session.contract !== "kata.prd.session/v1") {
    throw new Error("prd/.process/session.json contract 必须为 kata.prd.session/v1");
  }
  if (!session.preparation || session.preparation.knowledge_queries.length === 0) {
    throw new Error("session 缺少项目知识注入记录");
  }
  if (session.preparation.source_repos.length === 0) {
    throw new Error("session 缺少已准备的 release 源码记录");
  }
  for (const repo of session.preparation.source_repos) {
    if (!repo.repo.trim() || !repo.branch.trim() || !/^[a-f0-9]{40}$/.test(repo.commit)) {
      throw new Error("session source_repos 必须记录 repo、branch 与 40 位 commit");
    }
  }
  const scanRounds = new Set(
    session.preparation.omission_scans
      .filter((scan) => scan.summary.trim())
      .map((scan) => scan.round),
  );
  if (!scanRounds.has(1) || !scanRounds.has(2)) {
    throw new Error("session 必须记录两轮遗漏扫描");
  }
  assertChecklistVerdicts(session);
  const digest = computePrdDigest(evidenceText);
  if (session.evidence_digest !== digest) {
    throw new Error(`session evidence_digest 已过期: 期望 ${digest}`);
  }
  const unanswered = session.questions.filter((question) => !question.answer.trim());
  if (unanswered.length > 0) {
    throw new Error(`仍有未回答问题: ${unanswered.map((question) => question.id).join(", ")}`);
  }
  if (session.status !== "publish_confirmed") {
    throw new Error("最终发布尚未确认: session.status 必须为 publish_confirmed");
  }
  for (const question of session.questions) {
    for (const field of ["question", "answer", "risk", "recommendation"] as const) {
      if (!question[field].trim()) throw new Error(`${question.id}.${field} 为空`);
    }
    if (question.evidence.length === 0) throw new Error(`${question.id}.evidence 为空`);
  }
  const decisionIds = new Set<string>();
  for (const decision of session.decisions) {
    if (!/^PD-\d{3}$/.test(decision.id)) throw new Error(`非法产品决策 ID: ${decision.id}`);
    if (decisionIds.has(decision.id)) throw new Error(`重复产品决策 ID: ${decision.id}`);
    decisionIds.add(decision.id);
    if (!decision.title.trim() || !decision.decision.trim() || decision.sources.length === 0) {
      throw new Error(`${decision.id} 缺少标题、决策或来源`);
    }
  }
  if (!session.requirement.title.trim()) throw new Error("requirement.title 为空");
  if (session.requirement.traceability.length === 0) throw new Error("缺少需求追踪条目");
  const seen = new Set<string>();
  for (const item of session.requirement.traceability) {
    if (!/^(?:FR|BR|ER|AC|PD)-\d{3}$/.test(item.id)) {
      throw new Error(`非法稳定需求 ID: ${item.id}`);
    }
    if (seen.has(item.id)) throw new Error(`重复稳定需求 ID: ${item.id}`);
    if (!item.statement.trim() || item.sources.length === 0) {
      throw new Error(`${item.id} 缺少表述或来源`);
    }
    seen.add(item.id);
  }
  if (![...seen].some((id) => id.startsWith("FR-"))) throw new Error("PRD 至少需要一个 FR");
  if (![...seen].some((id) => id.startsWith("AC-"))) throw new Error("PRD 至少需要一个 AC");
  const featureName = basename(featureDir);
  if (featureName.startsWith("【") && !featureName.includes(`【${evidence.requirement_id}】`)) {
    throw new Error(`蓝湖需求 ID ${evidence.requirement_id} 与 feature 目录 ${featureName} 不一致`);
  }
  const assetsRoot = resolve(featureDir, "prd", "assets");
  for (const image of session.requirement.images) {
    const path = resolve(assetsRoot, image.asset);
    if (path !== assetsRoot && !path.startsWith(`${assetsRoot}/`)) {
      throw new Error(`图片路径越界: ${image.asset}`);
    }
    if (!existsSync(path)) throw new Error(`PRD 图片不存在: assets/${image.asset}`);
  }
}

function renderPrd(evidence: PrdEvidence, session: PrdSession): string {
  const frontmatter = [
    "---",
    "source: lanhu",
    `source_url: ${yamlScalar(evidence.source_url)}`,
    `requirement_id: ${yamlScalar(evidence.requirement_id)}`,
    `evidence_digest: ${yamlScalar(session.evidence_digest)}`,
    "---",
  ].join("\n");
  const body: string[] = [`# ${session.requirement.title}`];

  const identity = [
    `- 需求 ID：${evidence.requirement_id}`,
    `- 蓝湖文档：${evidence.title}`,
    `- 文档 ID：\`${evidence.doc_id}\``,
    `- 版本 ID：\`${evidence.version_id}\``,
    `- 页面 ID：\`${evidence.page_id}\``,
  ].join("\n");
  const sections = { ...session.requirement.sections, 需求身份与来源: identity };
  if (session.decisions.length > 0) {
    sections.已确认的产品决策 = session.decisions
      .map(
        (item) =>
          `### ${item.id} ${item.title}\n\n${item.decision}\n\n来源：${renderSources(item.sources)}`,
      )
      .join("\n\n");
  }
  if (session.requirement.images.length > 0) {
    sections.截图与证据追踪 = session.requirement.images
      .map((image) => `![${image.alt}](assets/${image.asset})`)
      .join("\n\n");
  }

  for (const heading of PRD_SECTION_ORDER) {
    const value = sections[heading]?.trim();
    if (value) body.push(`## ${heading}\n\n${value}`);
  }

  const traceRows = session.requirement.traceability.map(
    (item) =>
      `| ${item.id} | ${item.statement.replace(/\|/g, "\\|")} | ${renderSources(item.sources)} |`,
  );
  body.push(
    [
      "## 需求追踪矩阵",
      "",
      "| ID | 需求或验收表述 | 来源 |",
      "| --- | --- | --- |",
      ...traceRows,
    ].join("\n"),
  );
  return `${frontmatter}\n\n${body.join("\n\n")}\n`;
}

export function finalizePrd(featureDir: string): { path: string; digest: string } {
  assertFeatureNoSymlink(featureDir);
  const evidencePath = join(featureDir, "prd", "evidence", "lanhu.json");
  const sessionPath = join(featureDir, "prd", ".process", "session.json");
  assertNoSymlinkPath(featureDir, evidencePath, "PRD evidence");
  assertNoSymlinkPath(featureDir, sessionPath, "PRD session");
  const evidenceText = readFileSync(evidencePath, "utf8");
  const evidence = readJson<PrdEvidence>(evidencePath);
  const session = readJson<PrdSession>(sessionPath);
  assertFinalizable(featureDir, evidence, evidenceText, session);
  const output = renderPrd(evidence, session);
  const outputPath = join(featureDir, "prd", "prd.md");
  assertNoSymlinkPath(featureDir, outputPath, "PRD output");
  writeFileAtomic(outputPath, output);
  return { path: outputPath, digest: computePrdDigest(output) };
}

function parseFrontmatter(markdown: string): {
  frontmatter: Record<string, unknown> | null;
  body: string;
} {
  const match = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!match) return { frontmatter: null, body: markdown };
  try {
    const value = parse(match[1]) as Record<string, unknown> | null;
    return { frontmatter: value ?? {}, body: markdown.slice(match[0].length) };
  } catch {
    return { frontmatter: null, body: markdown };
  }
}

function markdownImages(markdown: string): string[] {
  return [...markdown.matchAll(/!\[[^\]]*]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)].map((match) => match[1]);
}

export function lintPrdFeature(featureDir: string): {
  errors: PrdLintItem[];
  warnings: PrdLintItem[];
} {
  assertFeatureNoSymlink(featureDir);
  const errors: PrdLintItem[] = [];
  const warnings: PrdLintItem[] = [];
  const prdPath = join(featureDir, "prd", "prd.md");
  assertNoSymlinkPath(featureDir, prdPath, "PRD");
  if (!existsSync(prdPath)) {
    errors.push({ rule: "prd_missing", message: "缺少 prd/prd.md" });
    return { errors, warnings };
  }
  const markdown = readFileSync(prdPath, "utf8");
  const parsed = parseFrontmatter(markdown);
  if (!parsed.frontmatter) {
    errors.push({ rule: "frontmatter", message: "PRD 缺少合法 frontmatter" });
  } else {
    const actual = Object.keys(parsed.frontmatter);
    for (const key of PRD_FRONTMATTER_KEYS) {
      if (typeof parsed.frontmatter[key] !== "string" || !parsed.frontmatter[key]) {
        errors.push({ rule: "frontmatter", message: `frontmatter.${key} 缺失或不是字符串` });
      }
    }
    for (const key of actual) {
      if (!PRD_FRONTMATTER_KEYS.includes(key as (typeof PRD_FRONTMATTER_KEYS)[number])) {
        errors.push({ rule: "frontmatter", message: `frontmatter 不允许字段 ${key}` });
      }
    }
  }
  if (PROMPT_POLLUTION.test(markdown)) {
    errors.push({ rule: "prompt_pollution", message: "PRD 混入 Lanhu MCP 工作提示" });
  }
  if (UNRESOLVED.test(markdown)) {
    errors.push({ rule: "unresolved", message: "PRD 含未解决标记" });
  }
  if (!/^## 需求追踪矩阵$/m.test(markdown)) {
    errors.push({ rule: "traceability", message: "PRD 缺少需求追踪矩阵" });
  }
  if (!/\|\s*FR-\d{3}\s*\|/.test(markdown) || !/\|\s*AC-\d{3}\s*\|/.test(markdown)) {
    errors.push({ rule: "stable_ids", message: "PRD 追踪矩阵至少需要 FR 与 AC 稳定 ID" });
  }
  const assetsRoot = resolve(featureDir, "prd", "assets");
  assertNoSymlinkPath(featureDir, assetsRoot, "PRD assets");
  const referenced = new Set<string>();
  for (const ref of markdownImages(markdown)) {
    if (!ref.startsWith("assets/") || ref.includes("\\") || ref.split("/").includes("..")) {
      errors.push({ rule: "asset_path", message: `图片只能引用 prd/assets/: ${ref}` });
      continue;
    }
    const absolute = resolve(dirname(prdPath), normalize(ref));
    if (absolute !== assetsRoot && !absolute.startsWith(`${assetsRoot}/`)) {
      errors.push({ rule: "asset_path", message: `图片路径越界: ${ref}` });
      continue;
    }
    referenced.add(relative(assetsRoot, absolute));
    if (!existsSync(absolute)) {
      errors.push({ rule: "asset_missing", message: `图片不存在: ${ref}` });
    }
  }
  if (existsSync(assetsRoot)) {
    for (const rel of readdirSync(assetsRoot, { recursive: true, encoding: "utf8" })) {
      if (!statSync(join(assetsRoot, rel)).isFile()) continue;
      if (!referenced.has(rel)) {
        warnings.push({ rule: "asset_orphan", message: `未被 PRD 引用的图片: assets/${rel}` });
      }
    }
  }
  return { errors, warnings };
}

export function readMarkdownFrontmatter(path: string): Record<string, unknown> {
  const parsed = parseFrontmatter(readFileSync(path, "utf8"));
  if (!parsed.frontmatter) throw new Error(`${basename(path)} 缺少合法 frontmatter`);
  return parsed.frontmatter;
}

export function serializeFrontmatter(fields: Record<string, unknown>, body: string): string {
  return `---\n${stringify(fields).trim()}\n---\n${body.startsWith("\n") ? "" : "\n"}${body}`;
}

/** Enforce PRD -> test-points -> cases digests for features using the canonical PRD layout. */
export function assertCaseDigestChain(
  featureDir: string,
  testPointsDigest?: string,
  caseSourceRefs: Array<string | undefined> = [],
): void {
  assertFeatureNoSymlink(featureDir);
  const prdPath = join(featureDir, "prd", "prd.md");
  assertNoSymlinkPath(featureDir, prdPath, "PRD");
  if (!existsSync(prdPath)) return; // Historical feature: grandfathered until canonical PRD exists.
  const testPointsPath = join(featureDir, "cases", "test-points.md");
  assertNoSymlinkPath(featureDir, testPointsPath, "test points");
  if (!existsSync(testPointsPath)) {
    throw new Error("canonical PRD 已存在，但缺少 cases/test-points.md");
  }
  const prdText = readFileSync(prdPath, "utf8");
  const testPointsText = readFileSync(testPointsPath, "utf8");
  const testPointsFrontmatter = parseFrontmatter(testPointsText).frontmatter;
  const expectedPrdDigest = computePrdDigest(prdText);
  if (testPointsFrontmatter?.prd_digest !== expectedPrdDigest) {
    throw new Error(`cases/test-points.md prd_digest 已过期: 期望 ${expectedPrdDigest}`);
  }
  if (UNRESOLVED.test(testPointsText)) {
    throw new Error("cases/test-points.md 含未解决标记");
  }
  const testPointRows = [...testPointsText.matchAll(/^\|\s*(TP-\d{3})\s*\|(.+)$/gm)];
  if (testPointRows.length === 0) throw new Error("cases/test-points.md 没有 TP-001 格式的覆盖项");
  for (const row of testPointRows) {
    if (!/(?:FR|BR|ER|AC|PD)-\d{3}/.test(row[2])) {
      throw new Error(`测试点 ${row[1]} 未引用 PRD 稳定 ID`);
    }
  }
  const knownTestPoints = new Set(testPointRows.map((row) => row[1]));
  for (const [index, sourceRef] of caseSourceRefs.entries()) {
    if (!sourceRef || !knownTestPoints.has(sourceRef)) {
      throw new Error(`用例 ${index + 1} source_ref 必须引用已覆盖测试点 TP-nnn`);
    }
  }
  const expectedTestPointsDigest = computePrdDigest(testPointsText);
  if (testPointsDigest !== expectedTestPointsDigest) {
    throw new Error(`cases YAML meta.test_points_digest 已过期: 期望 ${expectedTestPointsDigest}`);
  }
}

export interface LegacyPrdMigration {
  moves: { from: string; to: string }[];
}

/** Move retired feature-root requirement artifacts into the canonical evidence/cases layout. */
export function migrateLegacyPrdLayout(featureDir: string, apply: boolean): LegacyPrdMigration {
  assertFeatureNoSymlink(featureDir);
  const evidenceDir = join(featureDir, "prd", "evidence");
  const casesDir = join(featureDir, "cases");
  const candidates: Array<{ from: string; to: string; staleTestPoints?: boolean }> = [
    {
      from: join(featureDir, "prd.md"),
      to: join(evidenceDir, "legacy-prd.md"),
    },
    {
      from: join(featureDir, "requirement-notes.md"),
      to: join(evidenceDir, "legacy-requirement-notes.md"),
    },
    {
      from: join(featureDir, "cases", "requirement-notes.md"),
      to: join(evidenceDir, "legacy-requirement-notes.md"),
    },
    {
      from: join(featureDir, "test-points.md"),
      to: join(casesDir, "test-points.md"),
      staleTestPoints: true,
    },
  ];
  const moves = candidates
    .filter((item) => existsSync(item.from))
    .map(({ from, to }) => ({ from, to }));
  for (const item of candidates) {
    assertNoSymlinkPath(featureDir, item.from, "legacy PRD");
    assertNoSymlinkPath(featureDir, item.to, "PRD migration target");
  }
  if (!apply) return { moves };
  for (const item of candidates) {
    if (!existsSync(item.from)) continue;
    mkdirSync(dirname(item.to), { recursive: true });
    if (existsSync(item.to)) {
      const source = readFileSync(item.from);
      const target = readFileSync(item.to);
      if (!source.equals(target)) {
        throw new Error(`迁移目标已存在且内容不同，拒绝覆盖: ${item.to}`);
      }
      unlinkSync(item.from);
      continue;
    }
    if (item.staleTestPoints) {
      const source = readFileSync(item.from, "utf8");
      const output = source.startsWith("---\n")
        ? source
        : `---\nprd_digest: "stale:legacy"\n---\n\n${source}`;
      writeFileAtomic(item.to, output);
      unlinkSync(item.from);
    } else {
      renameSync(item.from, item.to);
    }
  }
  return { moves };
}
