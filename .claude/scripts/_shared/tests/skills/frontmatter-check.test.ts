import { describe, expect, test } from "bun:test";

import {
  CLAUDE_SKILL_FRONTMATTER_FIELDS,
  CODEX_SKILL_FRONTMATTER_FIELDS,
  findUnsupportedFrontmatterFields,
} from "@shared/lib/skills/frontmatter-policy.ts";

const CLAUDE_FIELDS = [
  "name",
  "description",
  "allowed-tools",
  "when_to_use",
  "user-invocable",
  "disable-model-invocation",
  "argument-hint",
  "model",
  "effort",
  "paths",
  "context",
  "agent",
];
const CODEX_FIELDS = [
  "name",
  "description",
  "allowed-tools",
  "when_to_use",
  "disable-model-invocation",
];

describe("skill frontmatter policy", () => {
  test("Claude skill frontmatter whitelist includes native skill fields", () => {
    expect([...CLAUDE_SKILL_FRONTMATTER_FIELDS]).toEqual(CLAUDE_FIELDS);
  });

  test("Codex skill frontmatter whitelist excludes Claude-only when_to_use", () => {
    expect([...CODEX_SKILL_FRONTMATTER_FIELDS]).toEqual(CODEX_FIELDS);
  });

  test("flags Codex model as unsupported", () => {
    expect(
      findUnsupportedFrontmatterFields("codex", {
        name: "demo",
        description: "Demo skill",
        model: "gpt-5",
      }),
    ).toEqual(["model"]);
  });

  test("flags unrecognized slash-command frontmatter fields as unsupported", () => {
    expect(
      findUnsupportedFrontmatterFields("claude", {
        name: "demo",
        description: "Demo skill",
        arguments: true,
      }),
    ).toEqual(["arguments"]);
  });

  test("Claude allowlist accepts argument-hint", () => {
    expect(
      findUnsupportedFrontmatterFields("claude", {
        name: "demo",
        description: "Demo",
        "argument-hint": "<file>",
      }),
    ).toEqual([]);
  });

  test("Codex allowlist accepts when_to_use and disable-model-invocation", () => {
    expect(
      findUnsupportedFrontmatterFields("codex", {
        name: "demo",
        description: "Demo",
        when_to_use: "after probe",
        "disable-model-invocation": true,
      }),
    ).toEqual([]);
  });

  test("allows user-invocable and disable-model-invocation in Claude SKILL.md", () => {
    expect(
      findUnsupportedFrontmatterFields("claude", {
        name: "demo",
        description: "Demo skill",
        "user-invocable": true,
        "disable-model-invocation": false,
      }),
    ).toEqual([]);
  });

  test("allows Claude runtime-native orchestration fields", () => {
    expect(
      findUnsupportedFrontmatterFields("claude", {
        name: "demo",
        description: "Demo skill",
        when_to_use: "Before a task",
        paths: ["workspace/**"],
        model: "sonnet",
        effort: "high",
        context: "fork",
        agent: "general-purpose",
      }),
    ).toEqual([]);
  });

  test("flags unconfirmed Claude frontmatter fields as unsupported", () => {
    expect(
      findUnsupportedFrontmatterFields("claude", {
        name: "demo",
        description: "Demo skill",
        when_to_use: "Before a task",
        hooks: {},
      }),
    ).toEqual(["hooks"]);
  });

  test("allows when_to_use on both Claude and Codex", () => {
    expect(
      findUnsupportedFrontmatterFields("claude", {
        name: "demo",
        description: "Demo skill",
        when_to_use: "Use when the task needs this skill.",
      }),
    ).toEqual([]);
    expect(
      findUnsupportedFrontmatterFields("codex", {
        name: "demo",
        description: "Demo skill",
        when_to_use: "Use when the task needs this skill.",
      }),
    ).toEqual([]);
  });

  test("allows allowed-tools for both runtimes", () => {
    expect(
      findUnsupportedFrontmatterFields("claude", {
        name: "demo",
        description: "Demo skill",
        "allowed-tools": "Read, Bash",
      }),
    ).toEqual([]);
    expect(
      findUnsupportedFrontmatterFields("codex", {
        name: "demo",
        description: "Demo skill",
        "allowed-tools": "Read, Bash",
      }),
    ).toEqual([]);
  });
});
