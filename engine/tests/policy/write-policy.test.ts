import { describe, expect, it } from "bun:test";
import { join } from "node:path";
import { repoRoot } from "@shared/lib/paths.ts";
import { evaluateWrite } from "../../src/policy/write-policy.ts";

describe("WritePolicy P0 slice", () => {
  it("blocks writes under .repos", () => {
    const result = evaluateWrite({
      path: "workspace/demo/.repos/app/src/index.ts",
      declaredWriteScopes: ["workspace/*/features/**"],
    });

    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("repos_read_only");
  });

  it("blocks writes under workspace project .kata/repos", () => {
    const result = evaluateWrite({
      path: "workspace/demo/.kata/repos/app/src/index.ts",
      declaredWriteScopes: ["workspace/*/features/**"],
    });

    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("repos_read_only");
  });

  it("blocks unsafe absolute paths", () => {
    const result = evaluateWrite({
      path: join(repoRoot(), "workspace/demo/features/a.md"),
      declaredWriteScopes: ["workspace/*/features/**"],
    });

    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("absolute_path");
  });

  it("allows declared workspace feature writes", () => {
    const result = evaluateWrite({
      path: "workspace/demo/features/202605-runtime/cases.md",
      declaredWriteScopes: ["workspace/*/features/**"],
    });

    expect(result.allowed).toBe(true);
  });

  it("normalizes dot segments before blocking .repos writes", () => {
    const result = evaluateWrite({
      path: "workspace/demo/features/../.repos/app/src/index.ts",
      declaredWriteScopes: ["workspace/*/features/**"],
    });

    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("repos_read_only");
  });

  it("blocks .repos case-insensitively before exact scope matching", () => {
    const result = evaluateWrite({
      path: "workspace/demo/.Repos/app.ts",
      declaredWriteScopes: ["workspace/demo/.Repos/app.ts"],
    });

    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("repos_read_only");
  });

  it("blocks protected shared contracts before exact scope matching", () => {
    const result = evaluateWrite({
      path: ".claude/contracts/rules/testing.md",
      declaredWriteScopes: [".claude/contracts/rules/testing.md"],
    });

    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("protected_contract");
  });

  it("blocks protected shared contracts case-insensitively", () => {
    const paths = [".Claude/contracts/rules/testing.md", ".agents/Contracts/rules/testing.md"];

    for (const path of paths) {
      const result = evaluateWrite({ path, declaredWriteScopes: [path] });
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe("protected_contract");
    }
  });

  it("blocks path traversal before scope matching", () => {
    const result = evaluateWrite({
      path: "workspace/demo/features/../../outside.md",
      declaredWriteScopes: ["workspace/*/features/**"],
    });

    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("path_traversal");
  });

  it("allows project-specific feature write scopes", () => {
    const result = evaluateWrite({
      path: "workspace/demo/features/202605-runtime/cases.md",
      declaredWriteScopes: ["workspace/demo/features/**"],
    });

    expect(result.allowed).toBe(true);
  });
});
