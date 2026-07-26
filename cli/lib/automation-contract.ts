import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
<<<<<<< HEAD
import { basename, dirname, join, relative } from "node:path";
=======
import { basename, join, relative } from "node:path";
>>>>>>> origin/main
import { writeFileAtomic } from "./atomic-writer.ts";
import { parseCasesYaml } from "./cases/parse.ts";

export interface AutomationCaseLink {
  id: string;
  title: string;
  specFile?: string;
<<<<<<< HEAD
  status: AutomationCaseStatus;
  implementationIssue?: string;
}

export type AutomationCaseStatus = "unmapped" | "mapped-not-implemented" | "implemented";

export interface AutomationCoverage {
  yamlPath: string;
  cases: AutomationCaseLink[];
  unmapped: string[];
  mappedNotImplemented: string[];
  implemented: string[];
=======
}

export interface AutomationCoverage {
  yamlPath: string;
  cases: AutomationCaseLink[];
>>>>>>> origin/main
  missingSpecFile: string[];
  missingScript: string[];
  orphanScripts: string[];
  duplicateSpecFile: string[];
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

<<<<<<< HEAD
function hasMissingRelativeImport(file: string): string | undefined {
  const text = readFileSync(file, "utf8");
  for (const match of text.matchAll(/(?:from|import\s*\()\s*["'](\.[^"']+)["']/g)) {
    const target = join(dirname(file), match[1]);
    const candidates = [target, `${target}.ts`, `${target}.tsx`, join(target, "index.ts")];
    if (!candidates.some((candidate) => existsSync(candidate))) return match[1];
  }
  return undefined;
}

function classifyScript(file: string): { status: AutomationCaseStatus; issue?: string } {
  const text = readFileSync(file, "utf8");
  if (
    text.includes("runGeneratedCase") ||
    text.includes("Generated from the canonical cases YAML")
  ) {
    return {
      status: "mapped-not-implemented",
      issue: "generic runner requires a real business implementation",
    };
  }
  if (text.includes("v6411-ui-case-specs") || text.includes("inventory-consistency")) {
    return {
      status: "mapped-not-implemented",
      issue: "implementation depends on a removed non-canonical inventory/CSV fixture",
    };
  }
  if (/const\s+(?:ENV|PROJECT_ID)\s*=\s*getEnvConfig\(\)/.test(text)) {
    return {
      status: "mapped-not-implemented",
      issue: "implementation resolves private environment data during module load",
    };
  }
  const missingImport = hasMissingRelativeImport(file);
  if (missingImport) {
    return { status: "mapped-not-implemented", issue: `missing relative import: ${missingImport}` };
  }
  return { status: "implemented" };
}

=======
>>>>>>> origin/main
export function inspectAutomationCoverage(featureDir: string): AutomationCoverage {
  const yamlPath = findYaml(featureDir);
  const file = parseCasesYaml(readFileSync(yamlPath, "utf8"));
  const scripts = scriptFiles(join(featureDir, "automation", "tests", "cases"));
  const byBase = new Map(scripts.map((path) => [basename(path), path]));
<<<<<<< HEAD
  const cases: AutomationCaseLink[] = file.cases.map((item) => {
    const specFile = item.automation?.spec_file;
    const script = specFile ? byBase.get(specFile) : undefined;
    if (!specFile) return { id: item.id, title: item.title, specFile, status: "unmapped" as const };
    if (!script) {
      return {
        id: item.id,
        title: item.title,
        specFile,
        status: "mapped-not-implemented" as const,
        implementationIssue: "spec_file does not point to an existing script",
      };
    }
    const classification = classifyScript(join(featureDir, "automation", "tests", "cases", script));
    return { id: item.id, title: item.title, specFile, ...classification };
  });
=======
  const cases = file.cases.map((item) => ({
    id: item.id,
    title: item.title,
    specFile: item.automation?.spec_file,
  }));
>>>>>>> origin/main
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
<<<<<<< HEAD
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
  };
=======
  return { yamlPath, cases, missingSpecFile, missingScript, orphanScripts, duplicateSpecFile };
>>>>>>> origin/main
}

export function generateAutomationRunner(
  featureDir: string,
  opts: { apply?: boolean } = {},
): { path: string; imports: string[]; coverage: AutomationCoverage } {
  const coverage = inspectAutomationCoverage(featureDir);
<<<<<<< HEAD
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
  const runner = join(runnerDir, "generated.ts");
=======
  if (coverage.missingSpecFile.length || coverage.missingScript.length) {
    throw new Error(
      `自动化覆盖不完整: missing spec_file=${coverage.missingSpecFile.join(",")}; missing script=${coverage.missingScript.join(",")}`,
    );
  }
  const casesDir = join(featureDir, "automation", "tests", "cases");
  const scripts = scriptFiles(casesDir);
  const full = join(featureDir, "automation", "tests", "runners", "full.spec.ts");
  const fullText = existsSync(full) ? readFileSync(full, "utf8") : "";
  const existingRunnerScripts = new Set(
    [...fullText.matchAll(/(?:\.\.?\/cases\/)([^\s"']+\.ts)/g)].map((match) => basename(match[1])),
  );
  const imports = coverage.cases
    .filter((item) => !existingRunnerScripts.has(item.specFile ?? ""))
    .map((item) => {
      const path = scripts.find((candidate) => basename(candidate) === item.specFile);
      if (!path) throw new Error(`找不到自动化脚本: ${item.specFile}`);
      return `../cases/${path}`;
    });
  const runner = join(featureDir, "automation", "tests", "runners", "generated.spec.ts");
>>>>>>> origin/main
  const content = [
    "// Generated by kata automation coverage. Do not add business logic here.",
    ...[...new Set(imports)].sort().map((path) => `import ${JSON.stringify(path)};`),
    "",
  ].join("\n");
  if (opts.apply) {
    writeFileAtomic(runner, content);
    const full = join(featureDir, "automation", "tests", "runners", "full.spec.ts");
    if (existsSync(full)) {
<<<<<<< HEAD
      const normalizedFull = fullText.replace(/import ["']\.\/generated\.spec["'];?\n?/g, "");
      if (!normalizedFull.includes("./generated")) {
        writeFileAtomic(full, `import "./generated";\n${normalizedFull}`);
=======
      if (!fullText.includes("./generated.spec")) {
        writeFileAtomic(full, `import "./generated.spec";\n${fullText}`);
>>>>>>> origin/main
      }
    }
  }
  return { path: runner, imports: [...new Set(imports)].sort(), coverage };
}
