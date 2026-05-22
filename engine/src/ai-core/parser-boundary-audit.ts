import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { repoRoot } from "./paths.ts";
import type { AiCoreIssue, AiCoreResult } from "./types.ts";

export type ParserBoundaryAuditFile = {
  path: string;
  text: string;
};

export type ParserBoundaryAuditOptions = {
  root?: string;
  files?: ParserBoundaryAuditFile[];
};

const PARSER_BOUNDARY_MESSAGE =
  "Ad hoc YAML parsing must stay behind approved AI Core parser modules.";
const APPROVED_PARSER_MODULE_PATHS = new Set([
  // Parser contract modules are the only AI Core files allowed to own hand-written YAML boundary parsing.
  "engine/src/ai-core/yaml-contract.ts",
  "engine/src/ai-core/yaml-helpers.ts",
  "engine/src/ai-core/product-skill-contract.ts",
  "engine/src/ai-core/product-skill-contract/parser.ts",
  "engine/src/ai-core/plugin-manifest-contract.ts",
]);
const TOP_LEVEL_BLOCK_NAME = "<top-level>";
const TRANSITIONAL_AD_HOC_YAML_READER_FUNCTIONS = new Map<string, ReadonlySet<string>>([
  // Transitional exact-path and exact-function exceptions for committed legacy readers only.
  // New ad hoc YAML readers in these files must be explicitly migrated or listed here by name.
  ["engine/src/ai-core/evals.ts", new Set(["normalizeGoldenRows", "readSkillRouting"])],
  ["engine/src/ai-core/evals/golden-parser.ts", new Set(["normalizeGoldenRows"])],
  ["engine/src/ai-core/evals/fixtures.ts", new Set(["readSkillRouting"])],
  [
    "engine/src/ai-core/behavioral-evals.ts",
    new Set([
      "readYamlScalar",
      "readYamlNestedScalar",
      "extractPromptIdFromWorkflow",
      "extractHardRules",
      "readYamlNestedDeep",
    ]),
  ],
  ["engine/src/ai-core/import-runtime.ts", new Set(["parseRuntimeImportRecord"])],
  ["engine/src/ai-core/load.ts", new Set(["readTopLevelId"])],
  ["engine/src/ai-core/lint.ts", new Set(["parseRuntimeRootRows"])],
  ["engine/src/ai-core/projection.ts", new Set(["parseWorkflowStepReferences"])],
  ["engine/src/ai-core/validate.ts", new Set(["parseWorkflowSteps"])],
  ["engine/src/ai-core/vendor.ts", new Set(["readExternalManifestHash"])],
  [
    "engine/src/ai-core/workflow-maturity.ts",
    new Set([
      "parseWorkflowSteps",
      "hasFailurePolicy",
      "hasGates",
      "findRateCardRef",
      "classifyMaturity",
    ]),
  ],
]);
const REGEX_LITERAL_SOURCE = "\\/((?:\\\\.|[^\\/\\\\\\r\\n])+?)\\/[dgimsuvy]*";
const REGEX_IDENTIFIER_SOURCE = "[A-Za-z_$][A-Za-z0-9_$]*";
const REGEX_SIMPLE_EXEC_ARGUMENT_SOURCE = String.raw`${REGEX_IDENTIFIER_SOURCE}(?:\s*\.\s*${REGEX_IDENTIFIER_SOURCE}(?:\s*\(\s*\))?)*`;
const REGEX_WHITESPACE_QUANTIFIER_SOURCE = String.raw`\\{1,2}s(?:\*|\+|\{\d+(?:,\d*)?\})`;
const YAML_LINE_SPLIT_PATTERN =
  /\.split\(\s*(?:\/\\r\?\\n\/[dgimsuvy]*|\/\\n\/[dgimsuvy]*|(["'`])\\n\1)\s*\)/;
const YAML_SCALAR_CAPTURE_BODY_PATTERN = new RegExp(
  String.raw`^\^(?:${REGEX_WHITESPACE_QUANTIFIER_SOURCE}|\s*)` +
    String.raw`(?:[A-Za-z0-9_-]+|\$\{[^}]+\})\\{0,2}:${REGEX_WHITESPACE_QUANTIFIER_SOURCE}[\s\S]*\([^)]`,
);
const YAML_LINE_REGEX_BODY_PATTERN = new RegExp(
  String.raw`^\^(?:${REGEX_WHITESPACE_QUANTIFIER_SOURCE}|\s*)` +
    String.raw`(?:-\s*(?:$|\\{1,2}s|\(\?:)|[A-Za-z0-9_-]+\\{0,2}:\\{1,2}s)`,
);

export function auditAiCoreParserBoundaries(
  options: ParserBoundaryAuditOptions = {},
): AiCoreResult<null> {
  const root = options.root ?? repoRoot();
  const files = options.files ?? readAiCoreSourceFiles(root);
  const issues = files.flatMap(auditParserBoundaryFile);

  return {
    ok: issues.length === 0,
    value: null,
    issues,
  };
}

function readAiCoreSourceFiles(root: string): ParserBoundaryAuditFile[] {
  const sourceRoot = join(root, "engine", "src", "ai-core");
  return listTypeScriptFiles(sourceRoot).map((fullPath) => ({
    path: normalizePath(relative(root, fullPath)),
    text: readFileSync(fullPath, "utf8"),
  }));
}

function listTypeScriptFiles(dir: string): string[] {
  return readdirSync(dir)
    .flatMap((entry) => {
      const path = join(dir, entry);
      const stats = statSync(path);
      if (stats.isDirectory()) return listTypeScriptFiles(path);
      if (stats.isFile() && path.endsWith(".ts")) return [path];
      return [];
    })
    .sort();
}

function auditParserBoundaryFile(file: ParserBoundaryAuditFile): AiCoreIssue[] {
  const normalizedPath = normalizePath(file.path);
  if (APPROVED_PARSER_MODULE_PATHS.has(normalizedPath)) return [];

  const riskyBlocks = collectRiskyYamlReaderBlocks(file.text);
  const unexpectedBlocks = riskyBlocks.filter(
    (block) => !isTransitionalYamlReaderBlock(normalizedPath, block.name),
  );

  return unexpectedBlocks.length > 0 ? [adHocYamlReaderIssue(normalizedPath)] : [];
}

type SourceBlock = {
  name: string;
  text: string;
  start: number;
  end: number;
};

function collectRiskyYamlReaderBlocks(text: string): SourceBlock[] {
  return collectSourceBlocks(text).filter(
    (block) => containsAdHocYamlReaderPattern(block.text) || containsManualLineYamlRead(block.text),
  );
}

function collectSourceBlocks(text: string): SourceBlock[] {
  const functionBlocks = collectFunctionBlocks(text);
  const topLevelText = blankRanges(text, functionBlocks);
  return [
    ...functionBlocks,
    {
      name: TOP_LEVEL_BLOCK_NAME,
      text: topLevelText,
      start: 0,
      end: text.length,
    },
  ];
}

function collectFunctionBlocks(text: string): SourceBlock[] {
  const blocks: SourceBlock[] = [];
  const functionPattern =
    /\bfunction\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*\([^)]*\)(?:\s*:\s*(?:[^{}]|\{[^{}]*\})+?)?\s*\{/g;
  for (const match of text.matchAll(functionPattern)) {
    const openBrace = (match.index ?? 0) + match[0].length - 1;
    const end = findMatchingBrace(text, openBrace);
    if (end === undefined) continue;
    blocks.push({
      name: match[1],
      text: text.slice(match.index ?? 0, end + 1),
      start: match.index ?? 0,
      end: end + 1,
    });
  }
  return blocks;
}

function findMatchingBrace(text: string, openBrace: number): number | undefined {
  let depth = 0;
  let quote: string | undefined;
  let lineComment = false;
  let blockComment = false;

  for (let index = openBrace; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (lineComment) {
      if (char === "\n") lineComment = false;
      continue;
    }
    if (blockComment) {
      if (char === "*" && next === "/") {
        blockComment = false;
        index += 1;
      }
      continue;
    }
    if (quote) {
      if (char === "\\") {
        index += 1;
        continue;
      }
      if (char === quote) quote = undefined;
      continue;
    }
    if (char === "/" && next === "/") {
      lineComment = true;
      index += 1;
      continue;
    }
    if (char === "/" && next === "*") {
      blockComment = true;
      index += 1;
      continue;
    }
    if (char === '"' || char === "'" || char === "`") {
      quote = char;
      continue;
    }
    if (char === "{") {
      depth += 1;
      continue;
    }
    if (char === "}") {
      depth -= 1;
      if (depth === 0) return index;
    }
  }

  return undefined;
}

function blankRanges(text: string, ranges: Array<Pick<SourceBlock, "start" | "end">>): string {
  const chars = [...text];
  for (const range of ranges) {
    for (let index = range.start; index < range.end; index += 1) {
      chars[index] = chars[index] === "\n" ? "\n" : " ";
    }
  }
  return chars.join("");
}

function isTransitionalYamlReaderBlock(path: string, blockName: string): boolean {
  return TRANSITIONAL_AD_HOC_YAML_READER_FUNCTIONS.get(path)?.has(blockName) === true;
}

function containsAdHocYamlReaderPattern(text: string): boolean {
  return (
    containsRegexYamlScalarCapture(text) ||
    containsRegexVariableYamlScalarCapture(text) ||
    containsRegexExecYamlScalarCapture(text) ||
    containsDynamicRegexYamlScalarCapture(text)
  );
}

function containsRegexYamlScalarCapture(text: string): boolean {
  const pattern = new RegExp(String.raw`\.match(?:All)?\(\s*${REGEX_LITERAL_SOURCE}`, "g");
  return [...text.matchAll(pattern)].some((match) => isYamlScalarCaptureRegexBody(match[1]));
}

function containsRegexVariableYamlScalarCapture(text: string): boolean {
  const yamlRegexVariables = collectYamlScalarCaptureRegexVariables(text);
  return yamlRegexVariables.some((name) => {
    const escapedName = escapeRegExp(name);
    return (
      new RegExp(String.raw`\.match(?:All)?\(\s*${escapedName}\s*\)`).test(text) ||
      new RegExp(
        String.raw`\b${escapedName}\.exec\(\s*${REGEX_SIMPLE_EXEC_ARGUMENT_SOURCE}\s*\)`,
      ).test(text)
    );
  });
}

function collectYamlScalarCaptureRegexVariables(text: string): string[] {
  const declarationPattern = new RegExp(
    String.raw`\b(?:const|let|var)\s+(${REGEX_IDENTIFIER_SOURCE})\s*=\s*${REGEX_LITERAL_SOURCE}`,
    "g",
  );
  const dynamicDeclarationPattern = new RegExp(
    String.raw`\b(?:const|let|var)\s+(${REGEX_IDENTIFIER_SOURCE})\s*=\s*new RegExp\(\s*(["'\`])([\s\S]{0,240}?)\2`,
    "g",
  );
  return [
    ...[...text.matchAll(declarationPattern)]
      .filter((match) => isYamlScalarCaptureRegexBody(match[2]))
      .map((match) => match[1]),
    ...[...text.matchAll(dynamicDeclarationPattern)]
      .filter((match) => isYamlScalarCaptureRegexBody(match[3]))
      .map((match) => match[1]),
  ];
}

function containsRegexExecYamlScalarCapture(text: string): boolean {
  const pattern = new RegExp(
    String.raw`${REGEX_LITERAL_SOURCE}\.exec\(\s*${REGEX_SIMPLE_EXEC_ARGUMENT_SOURCE}\s*\)`,
    "g",
  );
  return [...text.matchAll(pattern)].some((match) => isYamlScalarCaptureRegexBody(match[1]));
}

function containsDynamicRegexYamlScalarCapture(text: string): boolean {
  const matchPattern = /\.(?:match|matchAll)\(\s*new RegExp\(\s*(["'`])([\s\S]{0,240}?)\1/g;
  const execPattern = new RegExp(
    String.raw`new RegExp\(\s*(["'\`])([\s\S]{0,240}?)\1[\s\S]{0,120}?\)\.exec\(\s*` +
      String.raw`${REGEX_SIMPLE_EXEC_ARGUMENT_SOURCE}\s*\)`,
    "g",
  );
  return [...text.matchAll(matchPattern), ...text.matchAll(execPattern)].some((match) =>
    isYamlScalarCaptureRegexBody(match[2]),
  );
}

function isYamlScalarCaptureRegexBody(body: string): boolean {
  return YAML_SCALAR_CAPTURE_BODY_PATTERN.test(body);
}

function containsManualLineYamlRead(text: string): boolean {
  if (!YAML_LINE_SPLIT_PATTERN.test(text)) return false;
  return (
    containsManualKeyValueYamlRead(text) ||
    containsManualListRowYamlRead(text) ||
    containsManualYamlLineRegexRead(text)
  );
}

function containsManualKeyValueYamlRead(text: string): boolean {
  return /(?:indexOf|includes)\(\s*["']:["']\s*\)/.test(text) && /\.slice\(/.test(text);
}

function containsManualListRowYamlRead(text: string): boolean {
  return /\.startsWith\(\s*["']-\s["']\s*\)/.test(text) && /\.slice\(\s*2\s*\)/.test(text);
}

function containsManualYamlLineRegexRead(text: string): boolean {
  return collectRegexLiteralBodies(text).some(isYamlLineRegexBody);
}

function collectRegexLiteralBodies(text: string): string[] {
  return [...text.matchAll(new RegExp(REGEX_LITERAL_SOURCE, "g"))].map((match) => match[1]);
}

function isYamlLineRegexBody(body: string): boolean {
  return YAML_LINE_REGEX_BODY_PATTERN.test(body);
}

function adHocYamlReaderIssue(path: string): AiCoreIssue {
  return {
    code: "parser_boundary.ad_hoc_yaml_reader",
    severity: "error",
    path,
    message: PARSER_BOUNDARY_MESSAGE,
  };
}

function normalizePath(path: string): string {
  return path.split(/[\\/]+/).join("/");
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
