import { expect, test } from "bun:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import * as ts from "typescript";
import { repoRoot } from "../lib/paths.ts";

const ROOT = repoRoot();

const TARGET_ENTRY_FILES = [
  "engine/src/history-convert.ts",
  "engine/src/ai-core/evals.ts",
  "engine/src/ai-core/contract-schema.ts",
  "engine/src/ai-core/projection.ts",
  "engine/src/knowledge-curate.ts",
  "engine/src/cli/ai-core.ts",
  "engine/src/xmind-gen.ts",
  "engine/src/ai-core/product-skill-contract.ts",
];

const TARGET_SPLIT_DIRS = [
  "engine/src/history-convert",
  "engine/src/ai-core/evals",
  "engine/src/ai-core/contract-schema",
  "engine/src/ai-core/projection",
  "engine/src/knowledge-curate",
  "engine/src/cli/ai-core",
  "engine/src/xmind-gen",
  "engine/src/ai-core/product-skill-contract",
];

function collectTsFiles(dir: string): string[] {
  const absoluteDir = path.join(ROOT, dir);
  try {
    const stat = statSync(absoluteDir);
    if (!stat.isDirectory()) {
      return [];
    }
  } catch {
    return [];
  }

  const files: string[] = [];
  for (const entry of readdirSync(absoluteDir, { withFileTypes: true })) {
    const entryPath = path.join(absoluteDir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectTsFiles(path.relative(ROOT, entryPath)));
    } else if (entry.isFile() && entry.name.endsWith(".ts")) {
      files.push(entryPath);
    }
  }
  return files;
}

test("P4-01 split source files stay within size budgets", () => {
  const files = [
    ...TARGET_ENTRY_FILES.map((filePath) => path.join(ROOT, filePath)),
    ...TARGET_SPLIT_DIRS.flatMap((dir) => collectTsFiles(dir)),
  ].sort();
  const uniqueFiles = [...new Set(files)];

  const oversizedFiles = uniqueFiles.flatMap((filePath) => {
    const lines = readFileSync(filePath, "utf8").split(/\r?\n/).length;
    return lines > 800 ? [`${path.relative(ROOT, filePath)} ${lines}`] : [];
  });

  expect(oversizedFiles).toEqual([]);
});

function functionName(node: ts.Node, sourceFile: ts.SourceFile): string {
  if ("name" in node && node.name && ts.isIdentifier(node.name)) {
    return node.name.text;
  }
  const { parent } = node;
  if (ts.isVariableDeclaration(parent) && ts.isIdentifier(parent.name)) {
    return parent.name.text;
  }
  if (ts.isPropertyAssignment(parent)) {
    return parent.name.getText(sourceFile);
  }
  return "<anonymous>";
}

test("P4-01 split source functions stay within readability budgets", () => {
  const files = [
    ...TARGET_ENTRY_FILES.map((filePath) => path.join(ROOT, filePath)),
    ...TARGET_SPLIT_DIRS.flatMap((dir) => collectTsFiles(dir)),
  ].sort();
  const uniqueFiles = [...new Set(files)];
  const oversizedFunctions: string[] = [];

  for (const filePath of uniqueFiles) {
    const sourceText = readFileSync(filePath, "utf8");
    const sourceFile = ts.createSourceFile(filePath, sourceText, ts.ScriptTarget.Latest, true);
    const lineOf = (position: number): number =>
      ts.getLineAndCharacterOfPosition(sourceFile, position).line + 1;

    const visit = (node: ts.Node): void => {
      const functionLike =
        ts.isFunctionDeclaration(node) ||
        ts.isFunctionExpression(node) ||
        ts.isArrowFunction(node) ||
        ts.isMethodDeclaration(node);
      if (functionLike && node.body) {
        const start = lineOf(node.getStart(sourceFile));
        const end = lineOf(node.end);
        const lineCount = end - start + 1;
        if (lineCount > 50) {
          oversizedFunctions.push(
            `${path.relative(ROOT, filePath)}:${start}-${end} ${functionName(
              node,
              sourceFile,
            )} ${lineCount}`,
          );
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(sourceFile);
  }

  expect(oversizedFunctions).toEqual([]);
});
