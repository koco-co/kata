import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parse } from "yaml";

interface SqlProfile {
  required_placeholders?: string[];
  forbidden_fragments?: string[];
  required_fragments?: string[];
}

interface SqlProfilesFile {
  profiles?: Record<string, SqlProfile>;
}

export interface SqlLintResult {
  readonly profile: string;
  readonly sqlPath: string;
  readonly errors: string[];
}

function loadProfile(profile: string, repoRoot = process.cwd()): SqlProfile {
  const configPath = resolve(repoRoot, "config/automation/sql-profiles.yaml");
  const config = parse(readFileSync(configPath, "utf8")) as SqlProfilesFile;
  const result = config.profiles?.[profile];
  if (!result) throw new Error(`未知 SQL profile: ${profile}`);
  return result;
}

export function lintSql(sql: string, profileName: string, repoRoot = process.cwd()): SqlLintResult {
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
  return { profile: profileName, sqlPath: "", errors };
}

export function lintSqlFile(
  path: string,
  profileName: string,
  repoRoot = process.cwd(),
): SqlLintResult {
  const sqlPath = resolve(path);
  return { ...lintSql(readFileSync(sqlPath, "utf8"), profileName, repoRoot), sqlPath };
}

export function renderSql(sql: string, values: readonly string[]): string {
  const replacements = new Map<string, string>();
  for (const value of values) {
    const index = value.indexOf("=");
    if (index <= 0) throw new Error(`--set 必须为 KEY=value: ${value}`);
    const key = value.slice(0, index);
    const replacement = value.slice(index + 1);
    if (!/^[A-Z][A-Z0-9_]*$/.test(key)) throw new Error(`--set key 必须为大写标识符: ${key}`);
    if (replacements.has(key)) throw new Error(`--set 重复: ${key}`);
    replacements.set(key, replacement);
  }
  return sql.replace(/\{\{([A-Z][A-Z0-9_]*)\}\}/g, (placeholder, key: string) => {
    const value = replacements.get(key);
    if (value === undefined) throw new Error(`未提供占位符 ${placeholder}`);
    return value;
  });
}
