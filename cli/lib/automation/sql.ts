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
  profiles: Record<string, SqlProfile>;
}

export interface SqlLintResult {
  readonly profile: string;
  readonly sqlPath: string;
  readonly errors: string[];
}

const PROFILE_KEYS = [
  "datasource_types",
  "required_placeholders",
  "forbidden_fragments",
  "required_fragments",
  "required_patterns",
  "forbidden_patterns",
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function exactKeys(value: Record<string, unknown>, allowed: readonly string[], path: string): void {
  const unknown = Object.keys(value).filter((key) => !allowed.includes(key));
  if (unknown.length > 0) throw new Error(`${path} 包含未知字段: ${unknown.join(", ")}`);
}

function stringArray(value: unknown, path: string, required = false): string[] | undefined {
  if (value === undefined && !required) return undefined;
  if (
    !Array.isArray(value) ||
    (required && value.length === 0) ||
    value.some((item) => typeof item !== "string" || !item.trim())
  ) {
    throw new Error(`${path} 必须是${required ? "非空" : ""}字符串数组`);
  }
  return value.map((item) => (item as string).trim());
}

function patternArray(value: unknown, path: string): SqlPattern[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) throw new Error(`${path} 必须是数组`);
  return value.map((item, index) => {
    const itemPath = `${path}[${index}]`;
    if (!isRecord(item)) throw new Error(`${itemPath} 必须是对象`);
    exactKeys(item, ["name", "pattern"], itemPath);
    if (typeof item.name !== "string" || !item.name.trim()) {
      throw new Error(`${itemPath}.name 必须是非空字符串`);
    }
    if (typeof item.pattern !== "string" || !item.pattern.trim()) {
      throw new Error(`${itemPath}.pattern 必须是非空字符串`);
    }
    try {
      new RegExp(item.pattern, "isu");
    } catch (error) {
      throw new Error(
        `${itemPath} SQL profile 正则无效(${item.name}): ${(error as Error).message}`,
      );
    }
    return { name: item.name.trim(), pattern: item.pattern };
  });
}

function parseProfile(value: unknown, path: string): SqlProfile {
  if (!isRecord(value)) throw new Error(`${path} 必须是对象`);
  exactKeys(value, PROFILE_KEYS, path);
  return {
    datasource_types: stringArray(value.datasource_types, `${path}.datasource_types`, true),
    ...(value.required_placeholders === undefined
      ? {}
      : {
          required_placeholders: stringArray(
            value.required_placeholders,
            `${path}.required_placeholders`,
          ),
        }),
    ...(value.forbidden_fragments === undefined
      ? {}
      : {
          forbidden_fragments: stringArray(
            value.forbidden_fragments,
            `${path}.forbidden_fragments`,
          ),
        }),
    ...(value.required_fragments === undefined
      ? {}
      : {
          required_fragments: stringArray(value.required_fragments, `${path}.required_fragments`),
        }),
    ...(value.required_patterns === undefined
      ? {}
      : { required_patterns: patternArray(value.required_patterns, `${path}.required_patterns`) }),
    ...(value.forbidden_patterns === undefined
      ? {}
      : {
          forbidden_patterns: patternArray(value.forbidden_patterns, `${path}.forbidden_patterns`),
        }),
  };
}

/** Load and deeply validate the SQL profiles contract file. */
export function loadSqlProfilesFile(repoRoot = locateProjectRoot()): SqlProfilesFile {
  const configPath = sqlProfilesPath(repoRoot);
  const raw = parse(readFileSync(configPath, "utf8")) as unknown;
  if (!isRecord(raw)) throw new Error(`SQL profiles 配置无效: ${configPath}`);
  exactKeys(raw, ["profiles"], configPath);
  if (!isRecord(raw.profiles) || Object.keys(raw.profiles).length === 0) {
    throw new Error(`SQL profiles 配置无效: ${configPath}`);
  }
  const profiles: Record<string, SqlProfile> = {};
  const datasourceOwners = new Map<string, string>();
  for (const [name, value] of Object.entries(raw.profiles)) {
    if (!name.trim()) throw new Error(`${configPath}.profiles 包含空 profile 名`);
    const profile = parseProfile(value, `${configPath}.profiles.${name}`);
    for (const datasourceType of profile.datasource_types ?? []) {
      const existing = datasourceOwners.get(datasourceType);
      if (existing) {
        throw new Error(
          `${configPath} 数据源类型 ${datasourceType} 同时属于 ${existing} 与 ${name}`,
        );
      }
      datasourceOwners.set(datasourceType, name);
    }
    profiles[name] = profile;
  }
  return { profiles };
}

function loadProfile(profile: string, repoRoot = locateProjectRoot()): SqlProfile {
  const config = loadSqlProfilesFile(repoRoot);
  const direct = config.profiles[profile];
  const result =
    direct ??
    Object.values(config.profiles).find((candidate) =>
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
