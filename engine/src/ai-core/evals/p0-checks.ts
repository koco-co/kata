import type { AiCoreIssue } from "../types.ts";
import {
  issueFromRule,
  readGaCoreJsonFixture,
  readJsonFixture,
  readSkillRouting,
  ruleIds,
} from "./fixtures.ts";
import type { CaseCheck, GaCoreFixtureInput, GaCoreGoldenCase, P0GoldenCase } from "./types.ts";

export function checkTriggerRouting(testCase: P0GoldenCase, root: string): CaseCheck {
  const fixture = readJsonFixture<{ utterance?: unknown }>(testCase, root);
  const utterance = typeof fixture.utterance === "string" ? fixture.utterance.trim() : "";
  const alias = utterance.match(/^\/([A-Za-z0-9:_-]+)/)?.[1];
  const routing = readSkillRouting(root);
  const matched = alias ? routing.commands.includes(alias) : false;
  const expectedSkillId = testCase.expected.skill_id;
  const expectedAlias = testCase.expected.command_alias;
  const matchedExpected = matched && routing.skillId === expectedSkillId && alias === expectedAlias;
  return {
    status: matchedExpected ? "passed" : "blocked",
    ruleIds: matched ? ["trigger.route_alias"] : ["trigger.no_route"],
    issues: matchedExpected
      ? []
      : [
          issueFromRule(
            "trigger.route_mismatch",
            "Trigger routing did not match the golden expected skill and command alias.",
            "trigger",
          ),
        ],
  };
}

// Eval-only deterministic fixture router; not a production workflow router.
export function evalRouteGaCoreSkill(
  input: string,
  skillIdsByName: Map<string, string>,
): string | undefined {
  const normalized = input.toLowerCase();
  for (const rule of GA_CORE_ROUTE_RULES) {
    if (rule.matches(input, normalized)) return skillIdsByName.get(rule.skillName);
  }
  return undefined;
}

const GA_CORE_ROUTE_RULES: Array<{
  skillName: string;
  matches: (input: string, normalized: string) => boolean;
}> = [
  { skillName: "playwright-automation", matches: matchesPlaywrightAutomation },
  { skillName: "case-edit", matches: matchesCaseEdit },
  { skillName: "knowledge-curate", matches: matchesKnowledgeCurate },
  { skillName: "diff-scan", matches: matchesDiffScan },
  { skillName: "bug-file", matches: matchesBugFile },
  { skillName: "workspace-manage", matches: matchesWorkspaceManage },
  { skillName: "conflict-analyze", matches: matchesConflictAnalyze },
  { skillName: "case-hotfix", matches: matchesCaseHotfix },
  { skillName: "case-draft", matches: matchesCaseDraft },
];

function matchesPlaywrightAutomation(input: string, normalized: string): boolean {
  return [
    input.includes("UI自动化规划"),
    input.includes("自动化覆盖"),
    input.includes("冒烟范围"),
    normalized.includes("playwright"),
    input.includes("生成自动化脚本"),
    input.includes("生成 UI 脚本"),
    input.includes("测试运行失败"),
    normalized.includes("trace"),
    input.includes("失败转 Bug"),
  ].some(Boolean);
}

function matchesCaseEdit(input: string, normalized: string): boolean {
  return [
    normalized.includes("xmind"),
    normalized.includes("archive"),
    input.includes("同步"),
    input.includes("反向同步"),
    input.includes("转换"),
    input.includes("转化"),
  ].some(Boolean);
}

function matchesKnowledgeCurate(input: string): boolean {
  return ["知识库", "业务规则", "业务术语", "模块知识", "记到"].some((term) =>
    input.includes(term),
  );
}

function matchesDiffScan(input: string, normalized: string): boolean {
  return [
    input.includes("扫描"),
    input.includes("隐患"),
    input.includes("静态分析"),
    input.includes("静态扫描"),
    normalized.includes("static scan"),
    normalized.includes("diff scan"),
    input.includes("提测分支"),
  ].some(Boolean);
}

function matchesBugFile(input: string, normalized: string): boolean {
  return [
    input.includes("Bug 报告"),
    input.includes("bug 报告"),
    input.includes("错误报告"),
    input.includes("写报告"),
    normalized.includes("exception"),
    normalized.includes("console error"),
    input.includes("报错"),
    input.includes("Bug报告"),
  ].some(Boolean);
}

function matchesWorkspaceManage(input: string, normalized: string): boolean {
  return [
    normalized.includes("kata"),
    input.includes("功能菜单"),
    input.includes("有哪些功能"),
    input.includes("初始化"),
    input.includes("新项目"),
  ].some(Boolean);
}

function matchesConflictAnalyze(input: string): boolean {
  return input.includes("<<<<<<<") || input.includes("合并冲突") || input.includes("冲突分析");
}

function matchesCaseHotfix(input: string, normalized: string): boolean {
  return [
    normalized.includes("hotfix"),
    normalized.includes("zentao/bug-view-"),
    normalized.includes("bug-view-"),
    input.includes("禅道"),
    input.includes("回归用例"),
    input.includes("修复验证"),
  ].some(Boolean);
}

function matchesCaseDraft(input: string, normalized: string): boolean {
  return normalized.includes("prd") || input.includes("生成测试用例") || input.includes("写用例");
}

export function gaCoreFixtureInputs(
  testCase: GaCoreGoldenCase,
  root: string,
): GaCoreFixtureInput[] {
  const fixture = readGaCoreJsonFixture<Record<string, unknown>>(testCase, root);
  if (Array.isArray(fixture.inputs)) {
    return fixture.inputs.map((entry, index) => {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
        throw new Error(`Invalid ga-core fixture input at ${testCase.id}[${index}]`);
      }
      const item = entry as Record<string, unknown>;
      if (typeof item.text !== "string" || typeof item.expected_skill_id !== "string") {
        throw new Error(`Invalid ga-core fixture input at ${testCase.id}[${index}]`);
      }
      return { text: item.text, expectedSkillId: item.expected_skill_id };
    });
  }
  if (typeof fixture.input !== "string" || typeof fixture.expected_skill_id !== "string") {
    throw new Error(`Invalid ga-core fixture: ${testCase.id}`);
  }
  return [{ text: fixture.input, expectedSkillId: fixture.expected_skill_id }];
}

export function checkGaCoreTriggerRouting(
  testCase: GaCoreGoldenCase,
  root: string,
  activeSkillIds: Set<string>,
  skillIdsByName: Map<string, string>,
): CaseCheck {
  const inputs = gaCoreFixtureInputs(testCase, root);
  const issues: AiCoreIssue[] = [];
  const expectedCaseSkillId = testCase.expected.skill_id;
  let hits = 0;
  for (const input of inputs) {
    const routeIssue = gaCoreInputRouteIssue(
      input,
      testCase.id,
      expectedCaseSkillId,
      activeSkillIds,
      skillIdsByName,
    );
    if (routeIssue) issues.push(routeIssue);
    else hits += 1;
  }
  return {
    status: issues.length === 0 ? "passed" : "blocked",
    ruleIds: issues.length === 0 ? ["trigger.route_skill"] : ruleIds(issues),
    issues,
    triggerRouteAttempts: inputs.length,
    triggerRouteHits: hits,
  };
}

function gaCoreInputRouteIssue(
  input: GaCoreFixtureInput,
  caseId: string,
  expectedCaseSkillId: string | undefined,
  activeSkillIds: Set<string>,
  skillIdsByName: Map<string, string>,
): AiCoreIssue | undefined {
  if (!activeSkillIds.has(input.expectedSkillId)) {
    return issueFromRule(
      "trigger.expected_skill_missing",
      `Expected skill is not active: ${input.expectedSkillId}`,
      caseId,
    );
  }
  if (expectedCaseSkillId !== undefined && expectedCaseSkillId !== input.expectedSkillId) {
    return issueFromRule(
      "trigger.fixture_expected_mismatch",
      "Golden expected skill does not match fixture expected skill.",
      caseId,
    );
  }
  const actualSkillId = evalRouteGaCoreSkill(input.text, skillIdsByName);
  return actualSkillId === input.expectedSkillId
    ? undefined
    : issueFromRule(
        "trigger.route_mismatch",
        `Expected ${input.expectedSkillId} but routed to ${actualSkillId ?? "none"}.`,
        caseId,
      );
}
