import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { contractPath } from "@shared/lib/paths.ts";

const SCHEMA_PATH = contractPath("schemas", "blackboard-state.json");
const STATE_MODEL_PATH = contractPath("blackboard", "state-model.md");

const REQUIRED_SLOTS = [
  "sources",
  "source_refs",
  "decisions",
  "open_questions",
  "artifacts",
  "coverage",
  "verification",
  "handoff",
];

describe("blackboard schema", () => {
  test("JSON schema parses and declares the eight first-version slots", () => {
    const text = readFileSync(SCHEMA_PATH, "utf8");
    const schema = JSON.parse(text) as {
      required?: string[];
      properties?: Record<string, unknown>;
      additionalProperties?: boolean;
    };
    expect(schema.required).toEqual(REQUIRED_SLOTS);
    expect(Object.keys(schema.properties ?? {}).sort()).toEqual([...REQUIRED_SLOTS].sort());
    expect(schema.additionalProperties).toBe(false);
  });

  test("state-model.md mirrors the same eight slots", () => {
    const text = readFileSync(STATE_MODEL_PATH, "utf8");
    for (const slot of REQUIRED_SLOTS) {
      expect(text).toContain(`\`${slot}\``);
    }
  });
});
