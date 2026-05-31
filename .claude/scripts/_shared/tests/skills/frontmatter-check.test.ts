import { describe, expect, test } from "bun:test";

import {
  CLAUDE_SKILL_FRONTMATTER_FIELDS,
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
  "context",
  "agent",
];

describe("skill frontmatter policy", () => {
  test("Claude skill frontmatter whitelist includes native skill fields", () => {
    expect([...CLAUDE_SKILL_FRONTMATTER_FIELDS]).toEqual(CLAUDE_FIELDS);
  });

  test("flags unrecognized slash-command frontmatter fields as unsupported", () => {
    expect(
      findUnsupportedFrontmatterFields({
        name: "demo",
        description: "Demo skill",
        arguments: true,
      }),
    ).toEqual(["arguments"]);
  });

  test("Claude allowlist accepts argument-hint", () => {
    expect(
      findUnsupportedFrontmatterFields({
        name: "demo",
        description: "Demo",
        "argument-hint": "<file>",
      }),
    ).toEqual([]);
  });

  test("allows user-invocable and disable-model-invocation in Claude SKILL.md", () => {
    expect(
      findUnsupportedFrontmatterFields({
        name: "demo",
        description: "Demo skill",
        "user-invocable": true,
        "disable-model-invocation": false,
      }),
    ).toEqual([]);
  });

  test("allows Claude runtime-native orchestration fields", () => {
    expect(
      findUnsupportedFrontmatterFields({
        name: "demo",
        description: "Demo skill",
        when_to_use: "Before a task",
        model: "sonnet",
        effort: "high",
        context: "fork",
        agent: "general-purpose",
      }),
    ).toEqual([]);
  });

  test("flags unconfirmed Claude frontmatter fields as unsupported", () => {
    expect(
      findUnsupportedFrontmatterFields({
        name: "demo",
        description: "Demo skill",
        when_to_use: "Before a task",
        hooks: {},
      }),
    ).toEqual(["hooks"]);
  });

  test("allows when_to_use on Claude", () => {
    expect(
      findUnsupportedFrontmatterFields({
        name: "demo",
        description: "Demo skill",
        when_to_use: "Use when the task needs this skill.",
      }),
    ).toEqual([]);
  });

  test("allows allowed-tools on Claude", () => {
    expect(
      findUnsupportedFrontmatterFields({
        name: "demo",
        description: "Demo skill",
        "allowed-tools": "Read, Bash",
      }),
    ).toEqual([]);
  });
});
