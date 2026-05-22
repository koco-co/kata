import type { AiCoreResult } from "./types.ts";

export type JudgeRubric = {
  criteria: string[];
  threshold: number;
};

export type JudgeResult = {
  score: number;
  pass: boolean;
  rationale: string;
};

export type JudgeConfig = {
  provider: string;
  model_id: string;
  base_url: string;
  api_key_env: string;
};

type DeepSeekResponse = {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
};

type JudgeOutput = {
  score: number;
  criteria_scores: Record<string, number>;
  rationale: string;
};

const JUDGE_SYSTEM_PROMPT = `你是一个 QA 质量评审专家。根据给定的评分标准（rubric），评估被测试系统生成的测试用例质量。

评估规则：
1. 逐条检查 rubric 中的每项标准
2. 每项标准按 0.0（完全违反）到 1.0（完美符合）打分
3. 最终 score 取所有标准分数的平均值
4. 如果输出包含事实错误或编造内容，相关标准应打 0 分
5. 只根据提供的输入和输出进行评估，不要引入外部假设

返回 JSON 格式（不要包含 markdown 代码块标记）：
{
  "score": <0.0 到 1.0 之间的数字>,
  "criteria_scores": { "<标准原文>": <分数> },
  "rationale": "<中文评估理由，逐条说明>"
}`;

export async function runJudge(params: {
  rubric: JudgeRubric;
  subjectOutput: string;
  fixtureInput: string;
  config: JudgeConfig;
}): Promise<AiCoreResult<JudgeResult>> {
  const apiKey = process.env[params.config.api_key_env];
  if (!apiKey) {
    return {
      ok: false,
      issues: [
        {
          code: "judge.missing_api_key",
          severity: "error",
          message: `API key not found for env var ${params.config.api_key_env}`,
          path: "judge",
        },
      ],
    };
  }

  const criteriaText = params.rubric.criteria.map((c, i) => `${i + 1}. ${c}`).join("\n");

  const userPrompt = `## 评分标准 (Rubric)
${criteriaText}

## 原始需求输入 (Fixture)
${params.fixtureInput}

## 被测试系统生成的测试用例输出 (Subject Output)
${params.subjectOutput}

请根据评分标准逐条评估以上测试用例输出的质量，返回 JSON 格式结果。`;

  try {
    const response = await fetch(`${params.config.base_url}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: params.config.model_id,
        messages: [
          { role: "system", content: JUDGE_SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.1,
        max_tokens: 2048,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "unknown");
      return {
        ok: false,
        issues: [
          {
            code: "judge.api_error",
            severity: "error",
            message: `DeepSeek API error ${response.status}: ${errorText}`,
            path: "judge",
          },
        ],
      };
    }

    const data = (await response.json()) as DeepSeekResponse;
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      return {
        ok: false,
        issues: [
          {
            code: "judge.empty_response",
            severity: "error",
            message: "DeepSeek API returned an empty response.",
            path: "judge",
          },
        ],
      };
    }

    const parsed = parseJudgeOutput(content);
    if (!parsed.ok || parsed.value === undefined) {
      return { ok: false, issues: parsed.issues };
    }

    const { score, rationale } = parsed.value;
    return {
      ok: true,
      value: {
        score,
        pass: score >= params.rubric.threshold,
        rationale,
      },
      issues: [],
    };
  } catch (error) {
    return {
      ok: false,
      issues: [
        {
          code: "judge.network_error",
          severity: "error",
          message: `Judge API call failed: ${error instanceof Error ? error.message : String(error)}`,
          path: "judge",
        },
      ],
    };
  }
}

export async function runJudgeWithSamples(params: {
  rubric: JudgeRubric;
  subjectOutput: string;
  fixtureInput: string;
  config: JudgeConfig;
  samples: number;
  aggregation: "majority" | "average";
}): Promise<AiCoreResult<JudgeResult>> {
  const results: JudgeResult[] = [];
  for (let i = 0; i < params.samples; i++) {
    const result = await runJudge({
      rubric: params.rubric,
      subjectOutput: params.subjectOutput,
      fixtureInput: params.fixtureInput,
      config: params.config,
    });
    if (!result.ok) return result;
    if (result.value === undefined) {
      return {
        ok: false,
        issues: [
          {
            code: "judge.invalid_output",
            severity: "error",
            message: "Judge returned no result value.",
            path: "judge",
          },
        ],
      };
    }
    results.push(result.value);
  }

  if (params.aggregation === "average") {
    const avgScore = results.reduce((sum, r) => sum + r.score, 0) / results.length;
    const avgPass = avgScore >= params.rubric.threshold;
    return {
      ok: true,
      value: {
        score: Math.round(avgScore * 100) / 100,
        pass: avgPass,
        rationale: results.map((r, i) => `[Sample ${i + 1}] ${r.rationale}`).join("\n\n"),
      },
      issues: [],
    };
  }

  // majority aggregation
  const passes = results.filter((r) => r.pass).length;
  const majorityPass = passes > results.length / 2;
  const medianScore = [...results].sort((a, b) => a.score - b.score)[Math.floor(results.length / 2)]
    .score;
  return {
    ok: true,
    value: {
      score: medianScore,
      pass: majorityPass,
      rationale: results.map((r, i) => `[Sample ${i + 1}] ${r.rationale}`).join("\n\n"),
    },
    issues: [],
  };
}

function parseJudgeOutput(content: string): AiCoreResult<JudgeOutput> {
  let cleaned = content.trim();
  if (cleaned.startsWith("```")) {
    const end = cleaned.indexOf("\n");
    cleaned = cleaned.slice(end + 1);
    if (cleaned.endsWith("```")) {
      cleaned = cleaned.slice(0, -3).trim();
    }
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        parsed = JSON.parse(jsonMatch[0]);
      } catch {
        return {
          ok: false,
          issues: [
            {
              code: "judge.invalid_json",
              severity: "error",
              message: "Judge response is not valid JSON.",
              path: "judge",
            },
          ],
        };
      }
    } else {
      return {
        ok: false,
        issues: [
          {
            code: "judge.invalid_json",
            severity: "error",
            message: "Judge response is not valid JSON.",
            path: "judge",
          },
        ],
      };
    }
  }

  if (
    typeof parsed !== "object" ||
    parsed === null ||
    typeof (parsed as Record<string, unknown>).score !== "number" ||
    !Number.isFinite((parsed as Record<string, unknown>).score) ||
    ((parsed as Record<string, unknown>).score as number) < 0 ||
    ((parsed as Record<string, unknown>).score as number) > 1 ||
    typeof (parsed as Record<string, unknown>).rationale !== "string"
  ) {
    return {
      ok: false,
      issues: [
        {
          code: "judge.invalid_output",
          severity: "error",
          message: "Judge response missing score or rationale.",
          path: "judge",
        },
      ],
    };
  }

  return {
    ok: true,
    value: {
      score: (parsed as Record<string, unknown>).score as number,
      criteria_scores:
        ((parsed as Record<string, unknown>).criteria_scores as Record<string, number>) || {},
      rationale: (parsed as Record<string, unknown>).rationale as string,
    },
    issues: [],
  };
}
