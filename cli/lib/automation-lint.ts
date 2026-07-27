import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, extname, join, relative, resolve, sep } from "node:path";
import { SPEC_FILE_RE } from "./cases/parse.ts";
import { projectRootFromFeatureDir } from "./features-layout.ts";
import { locateProjectRoot } from "./workspace-locator.ts";

const CODE_EXTENSIONS = new Set([".cjs", ".js", ".jsx", ".mjs", ".ts", ".tsx"]);
const URL_RE = /https?:\/\//i;
const IP_RE = /\b(?:\d{1,3}\.){3}\d{1,3}\b/g;
const STRING_RE = /(["'`])(?:\\.|(?!\1)[\s\S])*?\1/g;
// A `/` after these chars (or after these keywords) opens a regex literal, not a comment/division.
const REGEX_OPEN_CHARS = new Set("([{,;=:!&|?+-*~^<>");
const REGEX_OPEN_KEYWORDS = new Set([
  "await",
  "case",
  "delete",
  "do",
  "else",
  "in",
  "instanceof",
  "new",
  "of",
  "return",
  "throw",
  "typeof",
  "void",
  "yield",
]);

export const AUTOMATION_LINT_RULES = [
  "no-wait-timeout",
  "no-networkidle",
  "no-hardcoded-env",
  "selector-quality",
  "case-file-naming",
] as const;

export type AutomationLintRule = (typeof AUTOMATION_LINT_RULES)[number];

export interface AutomationLintViolation {
  path: string;
  line: number;
  rule: string;
  message: string;
  content: string;
}

export interface AutomationLintIgnore {
  path: string;
  line: number;
  reason: string;
}

export interface AutomationLintOptions {
  featureDir?: string;
  shared?: boolean;
  project?: string;
  repoRoot?: string;
}

export interface AutomationLintReport {
  violations: AutomationLintViolation[];
  ignored: AutomationLintIgnore[];
  scannedFiles: number;
}

interface ScanTarget {
  roots: string[];
  projectDir: string;
}

interface MaskedSource {
  text: string;
  ignores: Map<number, string>;
}

function isCodeFile(path: string): boolean {
  return CODE_EXTENSIONS.has(extname(path).toLowerCase());
}

function listCodeFiles(root: string): string[] {
  if (!existsSync(root)) return [];
  const files: string[] = [];
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) =>
      a.name.localeCompare(b.name),
    )) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (entry.isFile() && isCodeFile(path)) files.push(path);
    }
  };
  walk(root);
  return files;
}

/** Decide whether the `/` at index i opens a regex literal (vs division); peeks at the masked prefix. */
function isRegexLiteralStart(chars: string[], i: number): boolean {
  let j = i - 1;
  while (j >= 0 && /\s/.test(chars[j])) j--;
  if (j < 0) return true;
  const ch = chars[j];
  if (REGEX_OPEN_CHARS.has(ch)) return true;
  if (/[\w$]/.test(ch)) {
    let k = j;
    while (k >= 0 && /[\w$]/.test(chars[k])) k--;
    return REGEX_OPEN_KEYWORDS.has(chars.slice(k + 1, j + 1).join(""));
  }
  return false;
}

function maskComments(source: string): MaskedSource {
  const chars = source.split("");
  const ignores = new Map<number, string>();
  let line = 1;
  let i = 0;

  const mask = (start: number, end: number): void => {
    for (let j = start; j < end; j++) {
      if (chars[j] !== "\n" && chars[j] !== "\r") chars[j] = " ";
    }
  };

  while (i < source.length) {
    const current = source[i];
    const next = source[i + 1];

    if (current === "'" || current === '"' || current === "`") {
      const quote = current;
      i++;
      while (i < source.length) {
        if (source[i] === "\\") {
          i += 2;
          continue;
        }
        if (source[i] === quote) {
          i++;
          break;
        }
        if (source[i] === "\n") line++;
        i++;
      }
      continue;
    }

    if (current === "/" && next === "/") {
      const commentStart = i + 2;
      let end = commentStart;
      while (end < source.length && source[end] !== "\n" && source[end] !== "\r") end++;
      const comment = source.slice(commentStart, end);
      const marker = comment.match(/^\s*kata-lint-ignore\s*:\s*(.*)$/);
      if (marker) ignores.set(line, marker[1].trim());
      mask(i, end);
      i = end;
      continue;
    }

    if (current === "/" && next === "*") {
      const commentStart = i;
      let end = i + 2;
      while (end < source.length && !(source[end] === "*" && source[end + 1] === "/")) end++;
      end = Math.min(source.length, end + 2);
      for (let j = commentStart; j < end; j++) if (source[j] === "\n") line++;
      mask(commentStart, end);
      i = end;
      continue;
    }

    // Regex literal: skip to the closing `/` so `//` inside a pattern/class is never
    // mistaken for a line comment (division is excluded via isRegexLiteralStart).
    if (current === "/" && isRegexLiteralStart(chars, i)) {
      i++;
      let inClass = false;
      while (i < source.length) {
        const ch = source[i];
        if (ch === "\\") {
          i += 2;
          continue;
        }
        if (ch === "\n") break;
        if (ch === "[") inClass = true;
        else if (ch === "]") inClass = false;
        else if (ch === "/" && !inClass) {
          i++;
          break;
        }
        i++;
      }
      while (i < source.length && /[a-z]/i.test(source[i])) i++;
      continue;
    }

    if (current === "\n") line++;
    i++;
  }

  return { text: chars.join(""), ignores };
}

function relativeProjectPath(projectDir: string, path: string): string {
  return relative(projectDir, path).split(sep).join("/");
}

function sourceContent(line: string, rule: string): string {
  if (rule === "no-hardcoded-env") return "<redacted hard-coded environment value>";
  return line.trim().slice(0, 240);
}

function addViolation(
  violations: AutomationLintViolation[],
  path: string,
  line: number,
  rule: string,
  message: string,
  originalLine: string,
): void {
  violations.push({ path, line, rule, message, content: sourceContent(originalLine, rule) });
}

function validIp(value: string): boolean {
  return value.split(".").every((part) => Number(part) >= 0 && Number(part) <= 255);
}

function stringLiterals(line: string): Array<{ start: number; value: string }> {
  const result: Array<{ start: number; value: string }> = [];
  for (const match of line.matchAll(STRING_RE)) {
    const raw = match[0];
    result.push({ start: match.index ?? 0, value: raw.slice(1, -1) });
  }
  return result;
}

function scanHardcodedEnvironment(
  maskedLine: string,
  originalLine: string,
  path: string,
  lineNumber: number,
  violations: AutomationLintViolation[],
): void {
  for (const literal of stringLiterals(maskedLine)) {
    const value = literal.value;
    const ip = [...value.matchAll(IP_RE)].find((match) => validIp(match[0]));
    const prefix = maskedLine.slice(0, literal.start);
    const sensitiveAssignment = /\b(?:cookie|password|token)\b\s*(?:=|:)\s*$/i.test(prefix);

    if (URL_RE.test(value)) {
      addViolation(
        violations,
        path,
        lineNumber,
        "no-hardcoded-env",
        "发现硬编码 URL；请从运行环境注入 base URL，不要把环境地址写入交付代码",
        originalLine,
      );
    } else if (ip) {
      addViolation(
        violations,
        path,
        lineNumber,
        "no-hardcoded-env",
        "发现硬编码 IP 地址；请从运行环境或配置注入地址",
        originalLine,
      );
    } else if (sensitiveAssignment) {
      addViolation(
        violations,
        path,
        lineNumber,
        "no-hardcoded-env",
        "发现硬编码 cookie/password/token；请从安全运行环境注入，禁止写入代码",
        originalLine,
      );
    }
  }
}

function scanSourceFile(
  absolutePath: string,
  projectDir: string,
  violations: AutomationLintViolation[],
  ignored: AutomationLintIgnore[],
): void {
  const path = relativeProjectPath(projectDir, absolutePath);
  const source = readFileSync(absolutePath, "utf8");
  const masked = maskComments(source);
  const originalLines = source.split(/\r?\n/);
  const maskedLines = masked.text.split(/\r?\n/);

  for (let index = 0; index < maskedLines.length; index++) {
    const lineNumber = index + 1;
    const maskedLine = maskedLines[index] ?? "";
    const originalLine = originalLines[index] ?? "";
    const ignoreReason = masked.ignores.get(lineNumber);

    if (ignoreReason !== undefined) {
      if (ignoreReason.length === 0) {
        addViolation(
          violations,
          path,
          lineNumber,
          "invalid-ignore",
          "kata-lint-ignore 必须填写豁免理由",
          originalLine,
        );
      } else {
        ignored.push({ path, line: lineNumber, reason: ignoreReason });
        continue;
      }
    }

    for (const match of maskedLine.matchAll(/\bwaitForTimeout\s*\(/g)) {
      addViolation(
        violations,
        path,
        lineNumber,
        "no-wait-timeout",
        "禁止使用 waitForTimeout 作为同步手段；改用 web-first assertion、expect.poll 或 toPass",
        originalLine,
      );
      if (match.index === undefined) break;
    }

    for (const match of maskedLine.matchAll(/waitForLoadState\s*\(\s*(["'])networkidle\1/g)) {
      addViolation(
        violations,
        path,
        lineNumber,
        "no-networkidle",
        "交付代码禁止等待 networkidle；改用具体的页面状态或业务断言",
        originalLine,
      );
      if (match.index === undefined) break;
    }

    scanHardcodedEnvironment(maskedLine, originalLine, path, lineNumber, violations);

    for (const match of maskedLine.matchAll(/(["'`])\.[A-Za-z_-]*[0-9a-f]{6,}[A-Za-z0-9_-]*/gi)) {
      addViolation(
        violations,
        path,
        lineNumber,
        "selector-quality",
        "选择器包含疑似 hash class；优先使用 getByRole、getByLabel、getByText 或 getByTestId",
        originalLine,
      );
      if (match.index === undefined) break;
    }

    for (const match of maskedLine.matchAll(/(?:\.nth\s*\([^)]*\)){3,}/g)) {
      addViolation(
        violations,
        path,
        lineNumber,
        "selector-quality",
        "单个选择器的 nth 链不得达到 3 级；请改用语义定位或稳定 test id",
        originalLine,
      );
      if (match.index === undefined) break;
    }
  }
}

function scanCaseFileName(
  absolutePath: string,
  projectDir: string,
  violations: AutomationLintViolation[],
): void {
  const rel = relativeProjectPath(projectDir, absolutePath);
  if (!/(^|\/)automation\/tests\/cases\//.test(rel)) return;
  const path = relativeProjectPath(projectDir, absolutePath);
  if (!SPEC_FILE_RE.test(basename(absolutePath))) {
    addViolation(
      violations,
      path,
      1,
      "case-file-naming",
      "tests/cases/ 下 TypeScript 文件名必须符合 t<序号>-<小写 slug>.ts",
      basename(absolutePath),
    );
  }
}

function resolveTarget(options: AutomationLintOptions): ScanTarget {
  if (options.shared === Boolean(options.featureDir)) {
    throw new Error("kata automation lint: 必须指定 <featureDir> 或 --shared 其中一个");
  }

  if (options.shared) {
    const root = options.repoRoot ?? locateProjectRoot();
    const project = options.project ?? process.env.KATA_ACTIVE_PROJECT;
    if (!project) {
      throw new Error(
        "kata automation lint --shared: 未指定项目；请传 --project <name>(或设置 KATA_ACTIVE_PROJECT)",
      );
    }
    const projectDir = join(root, "workspace", project);
    if (!existsSync(projectDir)) throw new Error(`kata automation lint: 未知项目 ${project}`);
    return {
      roots: ["pages", "helpers", "fixtures"].map((area) => join(projectDir, "_shared", area)),
      projectDir,
    };
  }

  const featureDir = resolve(options.featureDir as string);
  if (!existsSync(featureDir))
    throw new Error(`kata automation lint: feature 目录不存在: ${featureDir}`);
  return {
    roots: [join(featureDir, "automation", "tests")],
    projectDir: projectRootFromFeatureDir(featureDir),
  };
}

export function runAutomationLint(options: AutomationLintOptions): AutomationLintReport {
  const target = resolveTarget(options);
  const files = target.roots.flatMap((root) => listCodeFiles(root)).sort();
  const rawViolations: AutomationLintViolation[] = [];
  const ignored: AutomationLintIgnore[] = [];

  for (const file of files) {
    scanCaseFileName(file, target.projectDir, rawViolations);
    scanSourceFile(file, target.projectDir, rawViolations, ignored);
  }

  return {
    violations: rawViolations,
    ignored,
    scannedFiles: files.length,
  };
}
