import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { Glob } from "bun";
import { parse } from "yaml";
import { lintFeatureTests } from "./tests-layout.ts";
import type { CaseLintReport, CaseLintViolation } from "./types.ts";

function walkFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkFiles(path));
    else if (entry.isFile()) out.push(path);
  }
  return out;
}

function violation(
  file: string,
  rule: string,
  message: string,
  severity: "warn" | "fail" = "fail",
  lineNumber = 1,
  matched = basename(file),
): CaseLintViolation {
  return { file, lineNumber, rule, matched, severity, message };
}

function projectDirs(workspaceRoot: string): string[] {
  if (!existsSync(workspaceRoot)) return [];
  return readdirSync(workspaceRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getNestedValue(value: unknown, path: readonly string[]): unknown {
  let current = value;
  for (const segment of path) {
    if (!isRecord(current)) return undefined;
    current = current[segment];
  }
  return current;
}

export function lintNoEnvLocal(workspaceRoot: string): CaseLintReport {
  const glob = new Glob(join(workspaceRoot, "*/features/*/.env.local"));
  const violations = [...glob.scanSync()].map((file) =>
    violation(
      file,
      "no_env_local",
      "Feature-local .env.local is not allowed; use _shared/env/*.yaml profiles.",
    ),
  );
  return {
    scanRoot: workspaceRoot,
    files: violations.length,
    violations,
    passed: violations.length === 0,
  };
}

export function lintRunnerIsAggregator(workspaceRoot: string): CaseLintReport {
  const glob = new Glob(join(workspaceRoot, "*/features/*/tests/runners/*.spec.ts"));
  const violations: CaseLintViolation[] = [];
  let files = 0;
  for (const file of glob.scanSync()) {
    files += 1;
    const content = readFileSync(file, "utf-8");
    if (/\btest(?:\.describe)?\s*\(/.test(content)) {
      violations.push(
        violation(
          file,
          "runner_is_aggregator",
          "Runner specs must only aggregate case imports.",
          "warn",
        ),
      );
    }
  }
  return { scanRoot: workspaceRoot, files, violations, passed: violations.length === 0 };
}

export function lintCasesInCasesDir(workspaceRoot: string): CaseLintReport {
  const glob = new Glob(join(workspaceRoot, "*/features/*/tests/*.ts"));
  const violations: CaseLintViolation[] = [];
  let files = 0;
  for (const file of glob.scanSync()) {
    files += 1;
    const name = basename(file);
    if (/^t\d+/i.test(name)) {
      violations.push(
        violation(file, "cases_in_cases_dir", "Case files must live under tests/cases/.", "warn"),
      );
    }
  }
  return { scanRoot: workspaceRoot, files, violations, passed: violations.length === 0 };
}

export function lintSessionCompliant(workspaceRoot: string): CaseLintReport {
  const violations: CaseLintViolation[] = [];
  let files = 0;
  for (const project of projectDirs(workspaceRoot)) {
    for (const file of walkFiles(join(workspaceRoot, project, "features"))) {
      if (!/\.(?:ts|tsx|md|json|yaml)$/.test(file)) continue;
      files += 1;
      const content = readFileSync(file, "utf-8");
      if (
        content.includes(`.auth/${project}/`) ||
        content.includes(".auth/session.json") ||
        content.includes(`.kata/auth/${project}/`)
      ) {
        violations.push(
          violation(
            file,
            "session_compliant",
            `Auth storageState must live under workspace/${project}/.kata/auth/.`,
            "fail",
            1,
            "legacy auth path",
          ),
        );
      }
    }
  }
  return { scanRoot: workspaceRoot, files, violations, passed: violations.length === 0 };
}

export function lintEnvProfileCompliance(workspaceRoot: string): CaseLintReport {
  const violations: CaseLintViolation[] = [];
  let files = 0;
  for (const project of projectDirs(workspaceRoot)) {
    const envDir = join(workspaceRoot, project, "_shared/env");
    for (const file of walkFiles(envDir).filter((item) => item.endsWith(".yaml"))) {
      files += 1;
      const profile = parse(readFileSync(file, "utf-8")) as unknown;
      const sessionPath = getNestedValue(profile, ["auth", "session_path"]);
      const expectedPrefix = `workspace/${project}/.kata/auth/`;
      if (typeof sessionPath === "string" && !sessionPath.startsWith(expectedPrefix)) {
        violations.push(
          violation(
            file,
            "env_profile_compliance",
            `auth.session_path must be repo-root relative under ${expectedPrefix}.`,
            "fail",
            1,
            sessionPath,
          ),
        );
      }
      const env = getNestedValue(profile, ["env"]);
      const allowWrite = getNestedValue(profile, ["runtime", "allow_write"]);
      if (env === "ltqc-prod" && allowWrite !== false) {
        violations.push(
          violation(
            file,
            "env_profile_compliance",
            "ltqc-prod must keep runtime.allow_write=false.",
          ),
        );
      }
    }
  }
  return { scanRoot: workspaceRoot, files, violations, passed: violations.length === 0 };
}

export function lintNoDanglingHelpers(workspaceRoot: string): CaseLintReport {
  const sharedRoots = projectDirs(workspaceRoot).flatMap((project) => [
    join(workspaceRoot, project, "_shared/helpers"),
    join(workspaceRoot, project, "_shared/pages"),
  ]);
  const candidates: string[] = [];
  for (const root of sharedRoots) {
    for (const file of walkFiles(root)) {
      if (!/\.(?:ts|tsx)$/.test(file) || file.endsWith(".d.ts")) continue;
      if (basename(file) === "index.ts" || basename(file).endsWith(".test.ts")) continue;
      candidates.push(file);
    }
  }

  const consumerRoots = projectDirs(workspaceRoot).flatMap((project) => [
    join(workspaceRoot, project, "features"),
    join(workspaceRoot, project, "_shared"),
  ]);
  const consumerContents: string[] = [];
  for (const root of consumerRoots) {
    for (const file of walkFiles(root)) {
      if (!/\.(?:ts|tsx)$/.test(file)) continue;
      consumerContents.push(readFileSync(file, "utf-8"));
    }
  }
  const haystack = consumerContents.join("\n");

  const violations: CaseLintViolation[] = [];
  for (const helper of candidates) {
    const base = basename(helper).replace(/\.(?:ts|tsx)$/, "");
    const importPattern = new RegExp(`from\\s+["'][^"']*/${base}(?:\\.tsx?)?["']`);
    if (!importPattern.test(haystack)) {
      violations.push(
        violation(
          helper,
          "no_dangling_helpers",
          `Shared helper/page "${base}" has no importers; remove it or wire it up.`,
          "warn",
        ),
      );
    }
  }
  return {
    scanRoot: workspaceRoot,
    files: candidates.length,
    violations,
    passed: violations.length === 0,
  };
}

export function lintSpecStructureValid(workspaceRoot: string): CaseLintReport {
  const glob = new Glob(join(workspaceRoot, "*/features/*/tests"));
  const violations: CaseLintViolation[] = [];
  let files = 0;
  for (const testsDir of glob.scanSync()) {
    files += 1;
    const report = lintFeatureTests(testsDir);
    for (const item of report.violations) {
      violations.push(
        violation(item.file, `spec_structure_valid:${item.rule}`, item.message, "warn"),
      );
    }
  }
  return { scanRoot: workspaceRoot, files, violations, passed: violations.length === 0 };
}
