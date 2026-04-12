import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  checkCassetteLock,
  readCassette,
  renderCassetteLock,
  writeCassette,
  writeCassetteLock,
} from "./cassette-store.ts";
import type { JudgeConfig, JudgeRubric } from "./judge.ts";
import { runJudgeWithSamples } from "./judge.ts";
import { repoRoot } from "./paths.ts";
import type { AiCoreIssue } from "./types.ts";

export type BehavioralEvalMode = "replay" | "record";

export type BehavioralEvalCaseRaw = {
  id: string;
  subset: string;
  kind: string;
  subject_skill: string;
  input_fixture: string;
  rubric: JudgeRubric;
  judge_model: JudgeConfig;
  samples: number;
  aggregation: "majority" | "average";
};

export type BehavioralEvalResult = {
  id: string;
  pass: boolean;
  score: number;
  mode: BehavioralEvalMode;
  rationale: string;
};

export type BehavioralEvalSummary = {
  suite: string;
  pass: boolean;
  total: number;
  passed: number;
  failed: number;
  results: BehavioralEvalResult[];
};

const BEHAVIORAL_ROOT = ".ai/core/evals/behavioral";
const GOLDEN_FILE = "golden.json";
const CASSETTE_DIR = "cassettes";

function behavioralRoot(root: string): string {
  return join(root, BEHAVIORAL_ROOT);
}

export function loadBehavioralGolden(options: { root?: string } = {}): BehavioralEvalCaseRaw[] {
  const root = options.root ?? repoRoot();
  const path = join(behavioralRoot(root), GOLDEN_FILE);
  let raw: string;
  try {
    raw = readFileSync(path, "utf8");
  } catch {
    throw new Error(`Behavioral golden file not found: ${path}`);
  }
  const parsed = JSON.parse(raw);
  if (
    !parsed ||
    typeof parsed !== "object" ||
    !Array.isArray((parsed as Record<string, unknown>).cases)
  ) {
    throw new Error(`Invalid behavioral golden file: ${path}`);
  }
  const cases = (parsed as Record<string, unknown>).cases as Array<Record<string, unknown>>;
  return cases.map((c, i) => {
    const rubric = c.rubric as Record<string, unknown>;
    const judgeModel = c.judge_model as Record<string, unknown>;
    return {
      id: String(c.id || `case-${i}`),
      subset: String(c.subset || "fast-deterministic"),
      kind: String(c.kind || "llm-as-judge"),
      subject_skill: String(c.subject_skill || ""),
      input_fixture: String(c.input_fixture || ""),
      rubric: {
        criteria: Array.isArray(rubric.criteria) ? rubric.criteria.map(String) : [],
        threshold: typeof rubric.threshold === "number" ? rubric.threshold : 0.85,
      },
      judge_model: {
        provider: String(judgeModel.provider || "deepseek"),
        model_id: String(judgeModel.model_id || "deepseek-chat"),
        base_url: String(judgeModel.base_url || "https://api.deepseek.com/v1"),
        api_key_env: String(judgeModel.api_key_env || "DEEPSEEK_API_KEY"),
      },
      samples: typeof c.samples === "number" ? c.samples : 3,
      aggregation: (c.aggregation === "average" ? "average" : "majority") as "majority" | "average",
    };
  });
}

function loadFixture(fixturePath: string, root: string): string {
  const fullPath = join(behavioralRoot(root), fixturePath);
  const content = readFileSync(fullPath, "utf8");
  return content;
}

type PromptInfo = {
  systemText: string;
  userText: string;
  promptId: string;
};

function readYamlScalar(yamlText: string, key: string): string | undefined {
  // Simple regex-based extraction for flat and shallow-nested YAML scalars
  const pattern = new RegExp(`^\\s*${key}:\\s*(.+)$`, "m");
  const match = yamlText.match(pattern);
  return match ? match[1].trim() : undefined;
}

function readYamlNestedScalar(
  yamlText: string,
  parentKey: string,
  childKey: string,
): string | undefined {
  // Extract child scalar under a parent section like:
  //   parentKey:
  //     childKey: value
  const lines = yamlText.split("\n");
  let inParent = false;
  for (const line of lines) {
    if (line.match(new RegExp(`^\\s*${parentKey}:\\s*$`))) {
      inParent = true;
      continue;
    }
    if (inParent) {
      const childMatch = line.match(new RegExp(`^\\s+${childKey}:\\s*(.+)$`));
      if (childMatch) return childMatch[1].trim();
      // If we hit a key at same level or empty line, we've left the parent section
      if (/^\S/.test(line) && !/^\s/.test(line)) inParent = false;
    }
  }
  return undefined;
}

function findWorkflowForSkill(skillId: string, root: string): string {
  const workflowsDir = join(root, ".ai/core/workflows");
  const entries = readdirSync(workflowsDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.name.endsWith(".workflow.yaml")) continue;
    const path = join(workflowsDir, entry.name);
    const text = readFileSync(path, "utf8");
    const entrySkill = readYamlScalar(text, "entry_skill");
    if (entrySkill === skillId) return path;
  }
  throw new Error(`No workflow found for skill: ${skillId}`);
}

function extractPromptIdFromWorkflow(workflowPath: string): string {
  const text = readFileSync(workflowPath, "utf8");
  const match = text.match(/^\s*prompt:\s*([^\s#]+)/m);
  if (!match) throw new Error(`No prompt reference found in workflow: ${workflowPath}`);
  return match[1];
}

function extractHardRules(skillYaml: string): string[] {
  const lines = skillYaml.split("\n");
  const rules: string[] = [];
  let inHardRules = false;
  for (const line of lines) {
    if (line.includes("hard_rules:")) {
      inHardRules = true;
      continue;
    }
    if (inHardRules) {
      const match = line.match(/^\s*-\s+(.+)$/);
      if (match) {
        rules.push(match[1].trim());
      } else if (/^\s{2,}[a-z]/.test(line)) {
        inHardRules = false;
      }
    }
  }
  return rules;
}

function buildSkillPrompt(skillId: string, root: string): PromptInfo {
  const workflow = findWorkflowForSkill(skillId, root);
  const promptId = extractPromptIdFromWorkflow(workflow);

  const promptPath = join(
    root,
    ".ai/core/prompts",
    `${promptId.replace(/@[0-9]+$/, "")}.prompt.yaml`,
  );
  const promptText = readFileSync(promptPath, "utf8");
  const systemText = readYamlNestedScalar(promptText, "rendering", "system") ?? "";
  // For 'user' we need to go deeper: rendering.role_sections.user
  const userText = readYamlNestedDeep(promptText, "rendering", "role_sections", "user") ?? "";

  const skillPath = join(root, ".ai/core/skills", skillId.replace(/@[0-9]+$/, ""), "skill.yaml");
  let hardRules: string[] = [];
  try {
    const skillYaml = readFileSync(skillPath, "utf8");
    hardRules = extractHardRules(skillYaml);
  } catch {
    // skill yaml may not exist
  }

  const fullSystem = [...hardRules, systemText].filter(Boolean).join("\n\n");
  return { systemText: fullSystem, userText, promptId };
}

function readYamlNestedDeep(
  yamlText: string,
  topKey: string,
  midKey: string,
  leafKey: string,
): string | undefined {
  const lines = yamlText.split("\n");
  let inTop = false;
  let inMid = false;
  for (const line of lines) {
    if (line.match(new RegExp(`^\\s*${topKey}:\\s*$`))) {
      inTop = true;
      inMid = false;
      continue;
    }
    if (inTop && line.match(new RegExp(`^\\s+${midKey}:\\s*$`))) {
      inMid = true;
      continue;
    }
    if (inMid) {
      const leafMatch = line.match(new RegExp(`^\\s+${leafKey}:\\s*(.+)$`));
      if (leafMatch) return leafMatch[1].trim();
      if (/^\S/.test(line) && !/^\s/.test(line)) {
        inTop = false;
        inMid = false;
      }
    }
  }
  return undefined;
}

export async function runBehavioralEvals(options: {
  mode: BehavioralEvalMode;
  root?: string;
}): Promise<BehavioralEvalSummary> {
  const root = options.root ?? repoRoot();
  const cases = loadBehavioralGolden({ root });
  const results: BehavioralEvalResult[] = [];

  for (const evalCase of cases) {
    const result = await runSingleBehavioralEval(evalCase, options.mode, root);
    results.push(result);
  }

  const passed = results.filter((r) => r.pass).length;
  return {
    suite: "behavioral",
    pass: passed === results.length,
    total: results.length,
    passed,
    failed: results.length - passed,
    results,
  };
}

async function runSingleBehavioralEval(
  evalCase: BehavioralEvalCaseRaw,
  mode: BehavioralEvalMode,
  root: string,
): Promise<BehavioralEvalResult> {
  const promptInfo = buildSkillPrompt(evalCase.subject_skill, root);
  const fixtureContent = loadFixture(evalCase.input_fixture, root);
  const cassetteRoot = join(behavioralRoot(root), CASSETTE_DIR);

  if (mode === "record") {
    return runRecordMode(evalCase, promptInfo, fixtureContent, cassetteRoot, root);
  }
  return runReplayMode(evalCase, promptInfo, fixtureContent, cassetteRoot, root);
}

async function runRecordMode(
  evalCase: BehavioralEvalCaseRaw,
  promptInfo: PromptInfo,
  fixtureContent: string,
  cassetteRoot: string,
  root: string,
): Promise<BehavioralEvalResult> {
  // Call LLM to generate subject output
  const subjectOutput = await callSubjectLLM(promptInfo, fixtureContent, evalCase.judge_model);
  if (!subjectOutput.ok) {
    return {
      id: evalCase.id,
      pass: false,
      score: 0,
      mode: "record",
      rationale: `Subject LLM call failed: ${subjectOutput.issues.map((i) => i.message).join("; ")}`,
    };
  }

  // Judge the output
  const judgeResult = await runJudgeWithSamples({
    rubric: evalCase.rubric,
    subjectOutput: subjectOutput.value!,
    fixtureInput: fixtureContent,
    config: evalCase.judge_model,
    samples: evalCase.samples,
    aggregation: evalCase.aggregation,
  });

  if (!judgeResult.ok) {
    return {
      id: evalCase.id,
      pass: false,
      score: 0,
      mode: "record",
      rationale: `Judge failed: ${judgeResult.issues.map((i) => i.message).join("; ")}`,
    };
  }

  // Store cassette
  const hash = writeCassette({
    id: evalCase.id,
    subjectSkill: evalCase.subject_skill,
    inputFixture: evalCase.input_fixture,
    promptText: `${promptInfo.systemText}\n${promptInfo.userText}`,
    output: {
      subject_output: subjectOutput.value,
      judge_result: judgeResult.value,
      recorded_at: new Date().toISOString(),
    },
    cassetteRoot,
    root,
  });

  // Update lock
  writeCassetteLock({ cassetteRoot, root });

  return {
    id: evalCase.id,
    pass: judgeResult.value?.pass,
    score: judgeResult.value?.score,
    mode: "record",
    rationale: `${judgeResult.value?.rationale}\n\nCassette stored: ${hash}`,
  };
}

async function runReplayMode(
  evalCase: BehavioralEvalCaseRaw,
  promptInfo: PromptInfo,
  _fixtureContent: string,
  cassetteRoot: string,
  root: string,
): Promise<BehavioralEvalResult> {
  const cassetteResult = readCassette({
    id: evalCase.id,
    subjectSkill: evalCase.subject_skill,
    inputFixture: evalCase.input_fixture,
    promptText: `${promptInfo.systemText}\n${promptInfo.userText}`,
    cassetteRoot,
    root,
  });

  if (!cassetteResult.ok) {
    return {
      id: evalCase.id,
      pass: false,
      score: 0,
      mode: "replay",
      rationale: `Cassette not found: ${cassetteResult.issues.map((i) => i.message).join("; ")}`,
    };
  }

  // Verify cassette lock integrity
  const lock = renderCassetteLock({ cassetteRoot, root });
  const lockCheck = checkCassetteLock({ cassetteRoot, root, lock });
  if (!lockCheck.ok) {
    return {
      id: evalCase.id,
      pass: false,
      score: 0,
      mode: "replay",
      rationale: `Cassette lock integrity check failed: ${lockCheck.issues.map((i) => i.message).join("; ")}`,
    };
  }

  const cassette = cassetteResult.value!;
  const output = cassette.output as Record<string, unknown>;
  const judgeResult = output?.judge_result as
    | { score?: number; pass?: boolean; rationale?: string }
    | undefined;

  return {
    id: evalCase.id,
    pass: true,
    score: typeof judgeResult?.score === "number" ? judgeResult.score : 1,
    mode: "replay",
    rationale: judgeResult?.rationale ?? "Cassette replay — no judge re-run",
  };
}

async function callSubjectLLM(
  promptInfo: PromptInfo,
  fixtureContent: string,
  config: JudgeConfig,
): Promise<{ ok: true; value: string } | { ok: false; issues: AiCoreIssue[] }> {
  const apiKey = process.env[config.api_key_env];
  if (!apiKey) {
    return {
      ok: false,
      issues: [
        {
          code: "subject.missing_api_key",
          severity: "error",
          message: `API key not found for env var ${config.api_key_env}`,
          path: "subject",
        },
      ],
    };
  }

  const fixtureObj = JSON.parse(fixtureContent);
  const prdText = JSON.stringify(fixtureObj, null, 2);

  try {
    const response = await fetch(`${config.base_url}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: config.model_id,
        messages: [
          { role: "system", content: promptInfo.systemText || "你是一个 QA 测试用例生成专家。" },
          {
            role: "user",
            content: `${promptInfo.userText || "根据以下需求生成测试用例："}\n\n## 需求文档 (PRD)\n${prdText}`,
          },
        ],
        temperature: 0.3,
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "unknown");
      return {
        ok: false,
        issues: [
          {
            code: "subject.api_error",
            severity: "error",
            message: `Subject LLM API error ${response.status}: ${errorText}`,
            path: "subject",
          },
        ],
      };
    }

    const data = (await response.json()) as { choices: Array<{ message: { content: string } }> };
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      return {
        ok: false,
        issues: [
          {
            code: "subject.empty_response",
            severity: "error",
            message: "Subject LLM returned an empty response.",
            path: "subject",
          },
        ],
      };
    }

    return { ok: true, value: content };
  } catch (error) {
    return {
      ok: false,
      issues: [
        {
          code: "subject.network_error",
          severity: "error",
          message: `Subject LLM call failed: ${error instanceof Error ? error.message : String(error)}`,
          path: "subject",
        },
      ],
    };
  }
}
