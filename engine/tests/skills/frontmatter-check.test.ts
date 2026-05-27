import { describe, expect, test } from "bun:test";

import {
  CLAUDE_SKILL_FRONTMATTER_FIELDS,
  CODEX_SKILL_FRONTMATTER_FIELDS,
  findUnsupportedFrontmatterFields,
} from "../../src/skills/frontmatter-policy.ts";

const CURRENT_FIELDS = ["name", "description", "allowed-tools"];

describe("skill frontmatter policy", () => {
  test("Claude skill frontmatter whitelist is the phase 1 field set", () => {
    expect([...CLAUDE_SKILL_FRONTMATTER_FIELDS]).toEqual(CURRENT_FIELDS);
  });

  test("Codex skill frontmatter whitelist is the phase 1 field set", () => {
    expect([...CODEX_SKILL_FRONTMATTER_FIELDS]).toEqual(CURRENT_FIELDS);
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

  test("flags Claude slash-command frontmatter fields as unsupported", () => {
    expect(
      findUnsupportedFrontmatterFields("claude", {
        name: "demo",
        description: "Demo skill",
        "argument-hint": "FILE",
        arguments: true,
        "disable-model-invocation": true,
        "user-invocable": true,
      }),
    ).toEqual(["argument-hint", "arguments", "disable-model-invocation", "user-invocable"]);
  });

  test("flags unconfirmed Claude frontmatter fields as unsupported", () => {
    expect(
      findUnsupportedFrontmatterFields("claude", {
        name: "demo",
        description: "Demo skill",
        when_to_use: "Before a task",
        paths: ["references/example.md"],
        model: "sonnet",
        effort: "high",
        hooks: {},
      }),
    ).toEqual(["effort", "hooks", "model", "paths", "when_to_use"]);
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
