import { describe, expect, it } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import * as ts from "typescript";

const SRC_ROOT = join(import.meta.dirname, "../../src");

function listTypeScriptFiles(dir: string): string[] {
  const entries = readdirSync(dir, { withFileTypes: true }).sort((a, b) =>
    a.name.localeCompare(b.name),
  );
  const files: string[] = [];

  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...listTypeScriptFiles(path));
    } else if (entry.isFile() && path.endsWith(".ts")) {
      files.push(path);
    }
  }

  return files;
}

function findRequireCalls(filePath: string): string[] {
  const source = readFileSync(filePath, "utf8");
  const sourceFile = ts.createSourceFile(
    filePath,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const hits: string[] = [];

  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
      if (node.expression.text === "require") {
        const pos = sourceFile.getLineAndCharacterOfPosition(node.expression.getStart(sourceFile));
        hits.push(`${relative(SRC_ROOT, filePath)}:${pos.line + 1}:${pos.character + 1}`);
      }
    }

    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return hits;
}

describe("engine src module system", () => {
  it("does not use CommonJS require calls", () => {
    const requireCalls = listTypeScriptFiles(SRC_ROOT).flatMap(findRequireCalls);

    expect(requireCalls).toEqual([]);
  });
});
