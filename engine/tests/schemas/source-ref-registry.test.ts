import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import Ajv from "ajv";
import { parse } from "yaml";
import { contractPath } from "@shared/lib/paths.ts";

const schema = JSON.parse(
  readFileSync(contractPath("schemas", "SourceRefRegistry.v1.schema.json"), "utf-8"),
);
const registry = parse(readFileSync(contractPath("schemas", "source-ref-registry.yaml"), "utf-8"));
const validate = new Ajv({ strict: false, validateSchema: false }).compile(schema);

describe("SourceRefRegistry@1", () => {
  it("accepts the registry YAML", () => {
    expect(validate(registry)).toBe(true);
  });

  it("includes all 4 SourceRef prefixes", () => {
    const names = registry.prefixes.map((p: { prefix: string }) => p.prefix);
    expect(names).toContain("SR-INTENT");
    expect(names).toContain("SR-ENV-PREFLIGHT");
    expect(names).toContain("SR-UI-PROBE");
    expect(names).toContain("SR-SELF-RUN");
  });

  it("rejects duplicate prefix entries", () => {
    const dup = {
      schema: "SourceRefRegistry@1",
      prefixes: [
        {
          prefix: "SR-X",
          description: "a",
          generated_by: "skill:case-draft",
          generated_at_step: "x",
          pattern: "^SR-X-[A-Z]+$",
        },
        {
          prefix: "SR-X",
          description: "a",
          generated_by: "skill:case-draft",
          generated_at_step: "x",
          pattern: "^SR-X-[A-Z]+$",
        },
      ],
    };
    expect(validate(dup)).toBe(false);
  });
});
