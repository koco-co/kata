import { afterEach, describe, expect, it } from "bun:test";
import { type JudgeConfig, runJudge, runJudgeWithSamples } from "../../src/ai-core/judge.ts";

const API_KEY_ENV = "KATA_P5_JUDGE_TEST_KEY";
const originalFetch = globalThis.fetch;

function judgeConfig(): JudgeConfig {
  return {
    provider: "deepseek",
    model_id: "deepseek-chat",
    base_url: "https://judge.example.test/v1",
    api_key_env: API_KEY_ENV,
  };
}

function mockJudgeFetch(contents: string[]): void {
  let call = 0;
  globalThis.fetch = (async (_url, _init) => {
    const content = contents[Math.min(call, contents.length - 1)];
    call += 1;
    return new Response(
      JSON.stringify({
        choices: [{ message: { content } }],
      }),
      { status: 200 },
    );
  }) as typeof fetch;
}

afterEach(() => {
  globalThis.fetch = originalFetch;
  delete process.env[API_KEY_ENV];
});

describe("AI Core judge", () => {
  it("fails closed when the configured API key is missing", async () => {
    const result = await runJudge({
      rubric: { criteria: ["包含可追踪来源"], threshold: 0.8 },
      subjectOutput: "case output",
      fixtureInput: "fixture",
      config: judgeConfig(),
    });

    expect(result.ok).toBe(false);
    expect(result.issues[0].code).toBe("judge.missing_api_key");
    expect(result.issues[0].path).toBe("judge");
  });

  it("sends rubric, fixture, and subject output to the judge API", async () => {
    process.env[API_KEY_ENV] = "test-key";
    let requestBody: Record<string, unknown> | undefined;
    let authorization: string | null = null;
    globalThis.fetch = (async (_url, init) => {
      authorization = new Headers(init?.headers).get("authorization");
      requestBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
      return new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content:
                  '```json\n{"score":0.82,"criteria_scores":{"包含可追踪来源":0.82},"rationale":"证据充分"}\n```',
              },
            },
          ],
        }),
        { status: 200 },
      );
    }) as typeof fetch;

    const result = await runJudge({
      rubric: { criteria: ["包含可追踪来源"], threshold: 0.8 },
      subjectOutput: "生成的用例",
      fixtureInput: "原始需求",
      config: judgeConfig(),
    });

    expect(result.ok).toBe(true);
    expect(result.value).toEqual({ score: 0.82, pass: true, rationale: "证据充分" });
    expect(authorization).toBe("Bearer test-key");
    expect(requestBody?.model).toBe("deepseek-chat");
    expect(JSON.stringify(requestBody)).toContain("包含可追踪来源");
    expect(JSON.stringify(requestBody)).toContain("生成的用例");
    expect(JSON.stringify(requestBody)).toContain("原始需求");
  });

  it("returns API error details without treating them as judge output", async () => {
    process.env[API_KEY_ENV] = "test-key";
    globalThis.fetch = (async () => new Response("rate limited", { status: 429 })) as typeof fetch;

    const result = await runJudge({
      rubric: { criteria: ["无事实错误"], threshold: 0.8 },
      subjectOutput: "case output",
      fixtureInput: "fixture",
      config: judgeConfig(),
    });

    expect(result.ok).toBe(false);
    expect(result.issues[0].code).toBe("judge.api_error");
    expect(result.issues[0].message).toContain("429");
    expect(result.issues[0].message).toContain("rate limited");
  });

  it("rejects invalid JSON responses", async () => {
    process.env[API_KEY_ENV] = "test-key";
    mockJudgeFetch(["not json"]);

    const result = await runJudge({
      rubric: { criteria: ["无事实错误"], threshold: 0.8 },
      subjectOutput: "case output",
      fixtureInput: "fixture",
      config: judgeConfig(),
    });

    expect(result.ok).toBe(false);
    expect(result.issues[0].code).toBe("judge.invalid_json");
  });

  it("rejects score values outside the 0..1 judge contract", async () => {
    process.env[API_KEY_ENV] = "test-key";
    mockJudgeFetch(['{"score":1.4,"criteria_scores":{},"rationale":"invalid"}']);

    const result = await runJudge({
      rubric: { criteria: ["无事实错误"], threshold: 0.8 },
      subjectOutput: "case output",
      fixtureInput: "fixture",
      config: judgeConfig(),
    });

    expect(result.ok).toBe(false);
    expect(result.issues[0].code).toBe("judge.invalid_output");
  });

  it("averages repeated judge samples and rounds to two decimals", async () => {
    process.env[API_KEY_ENV] = "test-key";
    mockJudgeFetch([
      '{"score":0.7,"criteria_scores":{},"rationale":"first"}',
      '{"score":0.82,"criteria_scores":{},"rationale":"second"}',
      '{"score":0.91,"criteria_scores":{},"rationale":"third"}',
    ]);

    const result = await runJudgeWithSamples({
      rubric: { criteria: ["覆盖核心路径"], threshold: 0.8 },
      subjectOutput: "case output",
      fixtureInput: "fixture",
      config: judgeConfig(),
      samples: 3,
      aggregation: "average",
    });

    expect(result.ok).toBe(true);
    expect(result.value?.score).toBe(0.81);
    expect(result.value?.pass).toBe(true);
    expect(result.value?.rationale).toContain("[Sample 1] first");
    expect(result.value?.rationale).toContain("[Sample 3] third");
  });
});
