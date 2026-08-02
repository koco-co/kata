import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parse } from "yaml";
import { sqlProfilesPath } from "../config-paths.ts";
import { locateProjectRoot } from "../workspace-locator.ts";

interface SqlPattern {
  name: string;
  pattern: string;
}

interface SqlProfile {
  datasource_types?: string[];
  required_placeholders?: string[];
  forbidden_fragments?: string[];
  required_fragments?: string[];
  required_patterns?: SqlPattern[];
  forbidden_patterns?: SqlPattern[];
}

interface SqlProfilesFile {
  profiles?: Record<string, SqlProfile>;
}

export interface SqlLintResult {
  readonly profile: string;
  readonly sqlPath: string;
  readonly errors: string[];
}

/** Load and validate the SQL profiles contract file. */
export function loadSqlProfilesFile(repoRoot = locateProjectRoot()): SqlProfilesFile {
  const configPath = sqlProfilesPath(repoRoot);
  const config = parse(readFileSync(configPath, "utf8")) as SqlProfilesFile;
  if (!config?.profiles || typeof config.profiles !== "object") {
    throw new Error(`SQL profiles 配置无效: ${configPath}`);
  }
  return config;
}

function loadProfile(profile: string, repoRoot = locateProjectRoot()): SqlProfile {
  const configPath = resolve(repoRoot, "config/policies/sql-profiles.yaml");
  const config = parse(readFileSync(configPath, "utf8")) as SqlProfilesFile;
  const direct = config.profiles?.[profile];
  const result =
    direct ??
    Object.values(config.profiles ?? {}).find((candidate) =>
      candidate.datasource_types?.includes(profile),
    );
  if (!result) throw new Error(`未知 SQL profile: ${profile}`);
  return result;
}

function matches(sql: string, rule: SqlPattern, profile: string): boolean {
  try {
    return new RegExp(rule.pattern, "isu").test(sql);
  } catch (error) {
    throw new Error(`${profile} SQL profile 正则无效(${rule.name}): ${(error as Error).message}`);
  }
}

export function lintSql(
  sql: string,
  profileName: string,
  repoRoot = locateProjectRoot(),
): SqlLintResult {
  const profile = loadProfile(profileName, repoRoot);
  const errors: string[] = [];
  for (const placeholder of profile.required_placeholders ?? []) {
    if (!sql.includes(`{{${placeholder}}}`)) errors.push(`缺少占位符 {{${placeholder}}}`);
  }
  for (const fragment of profile.required_fragments ?? []) {
    if (!sql.toUpperCase().includes(fragment.toUpperCase()))
      errors.push(`缺少必要片段 ${fragment}`);
  }
  for (const fragment of profile.forbidden_fragments ?? []) {
    if (sql.toLowerCase().includes(fragment.toLowerCase())) errors.push(`包含禁止片段 ${fragment}`);
  }
  for (const rule of profile.required_patterns ?? []) {
    if (!matches(sql, rule, profileName)) errors.push(`缺少必要语法 ${rule.name}`);
  }
  for (const rule of profile.forbidden_patterns ?? []) {
    if (matches(sql, rule, profileName)) errors.push(`包含非 ${profileName} 方言语法 ${rule.name}`);
  }
  return { profile: profileName, sqlPath: "", errors };
}

export function lintSqlFile(
  path: string,
  profileName: string,
  repoRoot = locateProjectRoot(),
): SqlLintResult {
  const sqlPath = resolve(path);
  return { ...lintSql(readFileSync(sqlPath, "utf8"), profileName, repoRoot), sqlPath };
}

export function renderSql(sql: string, values: readonly string[]): string {
  if (/\{\{[A-Z][A-Z0-9_]*\}\}/.test(sql)) {
    throw new Error(`检测到旧占位符 {{KEY}}；请改用 \${SchemaA}、\${RunSuffix} 等语义占位符`);
  }
  const replacements = new Map<string, string>();
  for (const value of values) {
    const index = value.indexOf("=");
    if (index <= 0) throw new Error(`--set 必须为 KEY=value: ${value}`);
    const key = value.slice(0, index);
    const replacement = value.slice(index + 1);
    if (!/^[A-Z][A-Za-z0-9]*$/.test(key))
      throw new Error(`--set key 必须为 PascalCase 语义标识符: ${key}`);
    if (replacements.has(key)) throw new Error(`--set 重复: ${key}`);
    replacements.set(key, replacement);
  }
  return sql.replace(/\$\{([A-Z][A-Za-z0-9]*)\}/g, (placeholder, key: string) => {
    const value = replacements.get(key);
    if (value === undefined) throw new Error(`未提供占位符 ${placeholder}`);
    return value;
  });
}

const FUNCTIONAL_TABLE_RE =
  /^test_table_\d+_c\d{4}(?:_(?:source|target|comparison|dimension)(?:_\d{2})?)?$/;

/** Resolve the physical automation table without leaking runtime suffixes into functional YAML. */
export function resolveAutomationTableName(
  functionalName: string,
  options: { skipPreconditionSetup: boolean; runSuffix: string },
): string {
  if (!FUNCTIONAL_TABLE_RE.test(functionalName)) {
    throw new Error(`功能用例表名非法: ${functionalName}`);
  }
  if (options.skipPreconditionSetup) return functionalName;
  if (!/^[a-z0-9][a-z0-9_]*$/.test(options.runSuffix)) {
    throw new Error(`RunSuffix 必须为小写字母、数字或下划线: ${options.runSuffix}`);
  }
  return `${functionalName}_${options.runSuffix}`;
}
