import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";
import { writeFileAtomic } from "../atomic-writer.ts";
import { parseCasesYaml, validateCases } from "../cases/parse.ts";

export interface AutomationCaseLink {
  id: string;
  title: string;
  specFile?: string;
  status: AutomationCaseStatus;
  implementationIssue?: string;
  titleMismatch?: string;
}

export type AutomationCaseStatus = "unmapped" | "mapped-not-implemented" | "implemented";

export interface AutomationCoverage {
  yamlPath: string;
  cases: AutomationCaseLink[];
  unmapped: string[];
  mappedNotImplemented: string[];
  implemented: string[];
  missingSpecFile: string[];
  missingScript: string[];
  orphanScripts: string[];
  duplicateSpecFile: string[];
  titleMismatches: string[];
}

function findYaml(featureDir: string): string {
  const dir = join(featureDir, "cases");
  const files = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith(".yaml")) : [];
  if (files.length !== 1) throw new Error(`cases/ 下 yaml 必须唯一，当前为 ${files.length}`);
  return join(dir, files[0]);
}

function scriptFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  const walk = (current: string): void => {
    for (const name of readdirSync(current)) {
      const path = join(current, name);
      if (name === ".gitkeep") continue;
      if (statSync(path).isDirectory()) walk(path);
      else if (name.endsWith(".ts")) out.push(relative(dir, path).split("\\").join("/"));
    }
  };
  walk(dir);
  return out.sort();
}

function hasMissingRelativeImport(file: string): string | undefined {
  const text = readFileSync(file, "utf8");
  for (const match of text.matchAll(/(?:from|import\s*\()\s*["'](\.[^"']+)["']/g)) {
    const target = join(dirname(file), match[1]);
    const candidates = [target, `${target}.ts`, `${target}.tsx`, join(target, "index.ts")];
    if (!candidates.some((candidate) => existsSync(candidate))) return match[1];
  }
  return undefined;
}

function executableSource(text: string): string {
  return text
    .split(/\r?\n/)
    .filter((line) => !/^\s*\/\//.test(line))
    .join("\n");
}

function specFileMatchesCaseId(caseId: string, specFile: string): boolean {
  return specFile.startsWith(`c${caseId.slice(1).toLowerCase()}-`);
}

function containsCanonicalTitle(text: string, title: string): boolean {
  const source = executableSource(text);
  if (source.includes(title)) return true;
  const escapedDoubleQuotedTitle = JSON.stringify(title).slice(1, -1);
  return source.includes(escapedDoubleQuotedTitle);
}

function classifyScript(
  file: string,
  expectedTitle: string,
): {
  status: AutomationCaseStatus;
  implementationIssue?: string;
  titleMismatch?: string;
} {
  const text = readFileSync(file, "utf8");
  if (
    text.includes("runGeneratedCase") ||
    text.includes("Generated from the canonical cases YAML")
  ) {
    return {
      status: "mapped-not-implemented",
      implementationIssue: "generic runner requires a real business implementation",
    };
  }
  if (/test\.skip\(\s*true/.test(text)) {
    return {
      status: "mapped-not-implemented",
      implementationIssue: "spec disables itself via test.skip(true)",
    };
  }
  if (/\b(?:TODO|FIXME)\s*:|当前先(?:做骨架|保证)|待(?:下载处理就绪后)?补充/.test(text)) {
    return {
      status: "mapped-not-implemented",
      implementationIssue: "spec contains an explicit incomplete marker",
    };
  }
  if (/const\s+(?:ENV|PROJECT_ID)\s*=\s*getEnvConfig\(\)/.test(text)) {
    return {
      status: "mapped-not-implemented",
      implementationIssue: "implementation resolves private environment data during module load",
    };
  }
  const missingImport = hasMissingRelativeImport(file);
  if (missingImport) {
    return {
      status: "mapped-not-implemented",
      implementationIssue: `missing relative import: ${missingImport}`,
    };
  }
  const source = executableSource(text);
  if (!/\btest\s*\(/.test(source)) {
    return {
      status: "mapped-not-implemented",
      implementationIssue: "spec contains no Playwright test declaration",
    };
  }
  return {
    status: "implemented",
    ...(containsCanonicalTitle(text, expectedTitle)
      ? {}
      : { titleMismatch: "canonical YAML title is absent from executable source" }),
  };
}

export function inspectAutomationCoverage(featureDir: string): AutomationCoverage {
  const yamlPath = findYaml(featureDir);
  const file = parseCasesYaml(readFileSync(yamlPath, "utf8"));
  const problems = validateCases(file);
  if (problems.length > 0) {
    throw new Error(`用例校验未通过:\n${problems.map((p) => `  - ${p}`).join("\n")}`);
  }
  const scripts = scriptFiles(join(featureDir, "automation", "tests", "cases"));
  const byBase = new Map(scripts.map((path) => [basename(path), path]));
  const cases: AutomationCaseLink[] = file.cases.map((item) => {
    const specFile = item.automation?.spec_file;
    const script = specFile ? byBase.get(specFile) : undefined;
    if (!specFile) return { id: item.id, title: item.title, specFile, status: "unmapped" as const };
    if (!specFileMatchesCaseId(item.id, specFile)) {
      return {
        id: item.id,
        title: item.title,
        specFile,
        status: "mapped-not-implemented" as const,
        implementationIssue: "spec_file case ID prefix does not match YAML case_id",
      };
    }
    if (!script) {
      return {
        id: item.id,
        title: item.title,
        specFile,
        status: "mapped-not-implemented" as const,
        implementationIssue: "spec_file does not point to an existing script",
      };
    }
    const classification = classifyScript(
      join(featureDir, "automation", "tests", "cases", script),
      item.title,
    );
    return { id: item.id, title: item.title, specFile, ...classification };
  });
  const missingSpecFile = cases.filter((item) => !item.specFile).map((item) => item.id);
  const missingScript = cases
    .filter((item) => item.specFile && !byBase.has(item.specFile))
    .map((item) => `${item.id}:${item.specFile}`);
  const linked = new Set(cases.flatMap((item) => (item.specFile ? [item.specFile] : [])));
  const orphanScripts = scripts.filter((path) => !linked.has(basename(path)));
  const specCounts = new Map<string, number>();
  for (const item of cases) {
    if (item.specFile) specCounts.set(item.specFile, (specCounts.get(item.specFile) ?? 0) + 1);
  }
  const duplicateSpecFile = [...specCounts.entries()]
    .filter(([, count]) => count > 1)
    .map(([specFile]) => specFile)
    .sort();
  return {
    yamlPath,
    cases,
    unmapped: cases.filter((item) => item.status === "unmapped").map((item) => item.id),
    mappedNotImplemented: cases
      .filter((item) => item.status === "mapped-not-implemented")
      .map((item) => `${item.id}:${item.implementationIssue ?? "implementation required"}`),
    implemented: cases.filter((item) => item.status === "implemented").map((item) => item.id),
    missingSpecFile,
    missingScript,
    orphanScripts,
    duplicateSpecFile,
    titleMismatches: cases
      .flatMap((item) => (item.titleMismatch ? [`${item.id}:${item.titleMismatch}`] : []))
      .sort(),
  };
}

export function generateAutomationRunner(
  featureDir: string,
  opts: { apply?: boolean } = {},
): { path: string; imports: string[]; coverage: AutomationCoverage } {
  const coverage = inspectAutomationCoverage(featureDir);
  const casesDir = join(featureDir, "automation", "tests", "cases");
  const runnerDir = join(featureDir, "automation", "tests", "runners");
  const full = join(featureDir, "automation", "tests", "runners", "full.spec.ts");
  const fullText = existsSync(full) ? readFileSync(full, "utf8") : "";
  const imports = coverage.cases
    .filter((item) => item.status === "implemented")
    .map((item) => {
      const path = item.specFile;
      if (!path) throw new Error(`已实现用例缺少 spec_file: ${item.id}`);
      const script = scriptFiles(casesDir).find((candidate) => basename(candidate) === path);
      if (!script) throw new Error(`找不到自动化脚本: ${path}`);
      const importPath = relative(runnerDir, join(casesDir, script)).split("\\").join("/");
      return importPath.startsWith(".") ? importPath : `./${importPath}`;
    });
  const caseEntries = coverage.cases
    .filter((item) => item.status === "implemented")
    .map((item, index) => {
      const path = imports[index];
      if (!path) throw new Error(`已实现用例缺少 runner import: ${item.id}`);
      return { caseId: item.id, importPath: path };
    });
  const configImportPath = relative(
    resolve(runnerDir),
    resolve(process.cwd(), "runtime/automation/config/playwright"),
  )
    .split("\\")
    .join("/");
  const configImport = configImportPath.startsWith(".")
    ? configImportPath
    : `./${configImportPath}`;
  const rawOrderImportPath = relative(
    resolve(runnerDir),
    resolve(process.cwd(), "runtime/automation/runner/case-order"),
  )
    .split("\\")
    .join("/");
  const orderImportPath = rawOrderImportPath.startsWith(".")
    ? rawOrderImportPath
    : `./${rawOrderImportPath}`;
  const runner = join(runnerDir, "generated.ts");
  const content = [
    "// Generated by kata automation coverage. Do not add business logic here.",
    `import { loadPlaywrightAutomationConfig } from ${JSON.stringify(configImport)};`,
    `import { orderAutomationCases } from ${JSON.stringify(orderImportPath)};`,
    "",
    "const generatedCases: ReadonlyArray<{ readonly caseId: string; readonly module: string }> = [",
    ...caseEntries.map(
      ({ caseId, importPath }) =>
        `  { caseId: ${JSON.stringify(caseId)}, module: ${JSON.stringify(importPath)} },`,
    ),
    "];",
    "",
    "const orderedCases = orderAutomationCases(",
    "  generatedCases,",
    "  loadPlaywrightAutomationConfig().sortCases,",
    ");",
    "",
    "for (const generatedCase of orderedCases) {",
    "  await import(generatedCase.module);",
    "}",
    "",
  ].join("\n");
  if (opts.apply) {
    writeFileAtomic(runner, content);
    const full = join(featureDir, "automation", "tests", "runners", "full.spec.ts");
    if (existsSync(full)) {
      const normalizedFull = fullText.replace(/import ["']\.\/generated\.spec["'];?\n?/g, "");
      if (!normalizedFull.includes("./generated")) {
        writeFileAtomic(full, `import "./generated";\n${normalizedFull}`);
      }
    }
  }
  return { path: runner, imports: [...new Set(imports)], coverage };
}
