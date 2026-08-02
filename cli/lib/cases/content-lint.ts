import { readFileSync } from "node:fs";
import { parse } from "yaml";
import { lintSql } from "../automation/sql.ts";
import { casesLintPath } from "../config-paths.ts";
import type { CaseItem, CasesFile } from "./types.ts";

export interface CasesLintConfig {
  forbidden_terms: Record<string, string[]>;
  first_step_pattern: string;
  first_step_expected: string;
  first_step_example: string;
  default_datasource_type: string;
  datasource_types: string[];
  table_roles: string[];
  empty_table_markers: string[];
}

export interface CaseContentViolation {
  rule: string;
  message: string;
}

interface DatasourceBlock {
  letter: string;
  text: string;
  datasource?: string;
  type?: string;
  schema?: string;
  sql?: string;
}

const SQL_STATEMENT_RE =
  /\b(?:CREATE\s+TABLE|INSERT\s+INTO|DROP\s+TABLE|ALTER\s+TABLE|MERGE\s+INTO|UPDATE\s+|DELETE\s+FROM)\b/i;
const DATASOURCE_RE = /\$\{DataSource([A-Z])\}/g;
const SCHEMA_RE = /\$\{Schema([A-Z])\}/g;
const RUN_SUFFIX_RE = /\$\{RunSuffix\}/;

function strings(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string" && item.length > 0);
}

/** Load the executable global authored-case policy. It deliberately has no schema/version marker. */
export function loadCasesLintConfig(repoRoot: string): CasesLintConfig {
  const path = casesLintPath(repoRoot);
  const value = parse(readFileSync(path, "utf8")) as Partial<CasesLintConfig> | null;
  if (!value || typeof value !== "object") throw new Error(`用例内容 lint 配置无效: ${path}`);
  if (
    !value.forbidden_terms ||
    Object.values(value.forbidden_terms).some((terms) => !strings(terms)) ||
    typeof value.first_step_pattern !== "string" ||
    typeof value.first_step_expected !== "string" ||
    typeof value.first_step_example !== "string" ||
    typeof value.default_datasource_type !== "string" ||
    !strings(value.datasource_types) ||
    !strings(value.table_roles) ||
    !strings(value.empty_table_markers)
  ) {
    throw new Error(`用例内容 lint 配置缺少可执行规则: ${path}`);
  }
  if (!value.datasource_types.includes(value.default_datasource_type)) {
    throw new Error(`默认数据源类型未注册: ${value.default_datasource_type}`);
  }
  return value as CasesLintConfig;
}

function semanticText(item: CaseItem): string[] {
  return [
    item.title,
    item.precondition ?? "",
    ...item.steps.flatMap((step) => [step.action, step.expected]),
    ...(item.tags ?? []),
  ];
}

function placeholderLetters(text: string, pattern: RegExp): Set<string> {
  const letters = new Set<string>();
  pattern.lastIndex = 0;
  for (const match of text.matchAll(pattern)) {
    if (match[1]) letters.add(match[1]);
  }
  return letters;
}

function parseDatasourceBlocks(precondition: string): DatasourceBlock[] {
  const headings = [...precondition.matchAll(/^数据源\s+([A-Z])[：:]\s*$/gm)];
  return headings.map((heading, index) => {
    const start = (heading.index ?? 0) + heading[0].length;
    const end = headings[index + 1]?.index ?? precondition.length;
    const text = precondition.slice(start, end).trim();
    const datasource = text.match(/^\s*-\s*数据源[：:]\s*(\$\{DataSource[A-Z]\})\s*$/m)?.[1];
    const type = text.match(/^\s*-\s*数据源类型[：:]\s*([^\n]+?)\s*$/m)?.[1];
    const schema = text.match(/^\s*-\s*数据库[：:]\s*(\$\{Schema[A-Z]\})\s*$/m)?.[1];
    const sqlHeading = /^\s*-\s*初始化 SQL[：:]\s*$/m.exec(text);
    const sql = sqlHeading
      ? text.slice((sqlHeading.index ?? 0) + sqlHeading[0].length).trim()
      : undefined;
    return { letter: heading[1] ?? "", text, datasource, type, schema, sql };
  });
}

function pushDatasourceViolation(
  violations: CaseContentViolation[],
  rule: string,
  expected: string,
  actual: string,
): void {
  violations.push({
    rule,
    message: `测试用例的数据资源契约不完整，禁止继续生成或交付派生产物。\n预期: ${expected}\n实际: ${actual}`,
  });
}

function normalizedIdentifier(value: string): string {
  return value.replaceAll("`", "").replaceAll('"', "").replace(/[;,]$/, "");
}

function tableReferences(sql: string): string[] {
  const pattern =
    /\b(?:DROP\s+TABLE(?:\s+IF\s+EXISTS)?|CREATE\s+TABLE(?:\s+IF\s+NOT\s+EXISTS)?|INSERT\s+INTO(?:\s+TABLE)?|ALTER\s+TABLE|MERGE\s+INTO|UPDATE|DELETE\s+FROM)\s+([^\s(;,]+)/gi;
  return [...sql.matchAll(pattern)].map((match) => normalizedIdentifier(match[1] ?? ""));
}

function createdTables(sql: string): string[] {
  return [...sql.matchAll(/\bCREATE\s+TABLE(?:\s+IF\s+NOT\s+EXISTS)?\s+([^\s(;,]+)/gi)].map(
    (match) => normalizedIdentifier(match[1] ?? ""),
  );
}

function validateTableNames(
  file: CasesFile,
  item: CaseItem,
  block: DatasourceBlock,
  violations: CaseContentViolation[],
  config: CasesLintConfig,
): void {
  const sql = block.sql ?? "";
  const requirementId = item.requirement_id ?? file.meta.requirement_id;
  if (!requirementId) {
    pushDatasourceViolation(
      violations,
      "case_sql_table_name",
      "涉及建表 SQL 的用例必须声明数字 requirement_id，以生成稳定表名",
      "缺少 requirement_id",
    );
    return;
  }
  const caseId = item.id.toLowerCase();
  const base = `test_table_${requirementId}_${caseId}`;
  const schemaPrefix = `\${Schema${block.letter}}.`;
  const references = tableReferences(sql);
  const creates = [...new Set(createdTables(sql))];
  const unqualified = references.filter((name) => !name.startsWith(schemaPrefix));
  if (unqualified.length > 0) {
    pushDatasourceViolation(
      violations,
      "case_sql_table_name",
      `SQL 表名必须使用 ${schemaPrefix}${base} 形式完整限定数据库`,
      `发现未按当前数据源数据库限定的表名: ${unqualified.join(", ")}`,
    );
  }

  const names = creates
    .filter((name) => name.startsWith(schemaPrefix))
    .map((name) => name.slice(schemaPrefix.length));
  const roleAlternation = config.table_roles.join("|");
  const single = new RegExp(`^${base}$`);
  const multi = new RegExp(`^${base}_(${roleAlternation})(?:_(\\d{2}))?$`);
  if (names.length <= 1) {
    if (names.some((name) => !single.test(name))) {
      pushDatasourceViolation(
        violations,
        "case_sql_table_name",
        `单表用例必须命名为 ${base}`,
        `建表名称: ${names.join(", ") || "未识别"}`,
      );
    }
    return;
  }
  const invalid = names.filter((name) => !multi.test(name));
  if (invalid.length > 0) {
    pushDatasourceViolation(
      violations,
      "case_sql_table_name",
      `多表用例必须命名为 ${base}_<${config.table_roles.join("|")}>[_两位序号]`,
      `建表名称: ${names.join(", ")}`,
    );
    return;
  }
  const grouped = new Map<string, Array<{ name: string; ordinal?: string }>>();
  for (const name of names) {
    const match = name.match(multi);
    if (!match?.[1]) continue;
    const entries = grouped.get(match[1]) ?? [];
    entries.push({ name, ...(match[2] ? { ordinal: match[2] } : {}) });
    grouped.set(match[1], entries);
  }
  const repeatedWithoutOrdinal = [...grouped.values()].flatMap((entries) =>
    entries.length > 1 ? entries.filter((entry) => !entry.ordinal).map((entry) => entry.name) : [],
  );
  if (repeatedWithoutOrdinal.length > 0) {
    pushDatasourceViolation(
      violations,
      "case_sql_table_name",
      "同一角色存在两张及以上表时，每张表都必须追加两位序号，例如 source_01、source_02",
      `缺少序号: ${repeatedWithoutOrdinal.join(", ")}`,
    );
  }
}

function lintDatasourceSql(
  file: CasesFile,
  item: CaseItem,
  config: CasesLintConfig,
  violations: CaseContentViolation[],
): void {
  const allText = semanticText(item).join("\n");
  const precondition = item.precondition ?? "";
  const datasourceLetters = placeholderLetters(allText, DATASOURCE_RE);
  const schemaLetters = placeholderLetters(allText, SCHEMA_RE);
  const pairLetters = new Set([...datasourceLetters].filter((letter) => schemaLetters.has(letter)));
  if (RUN_SUFFIX_RE.test(allText)) {
    pushDatasourceViolation(
      violations,
      "case_run_suffix",
      `功能用例只能保存稳定表名；\${RunSuffix} 仅由自动化运行时追加`,
      `功能用例内容出现 \${RunSuffix}`,
    );
  }

  const orphaned = new Set([
    ...[...datasourceLetters].filter((letter) => !schemaLetters.has(letter)),
    ...[...schemaLetters].filter((letter) => !datasourceLetters.has(letter)),
  ]);
  // 单独的数据源占位符是合法的连接/列表场景；Schema 单独出现或 SQL 无成对资源则非法。
  const orphanedSchemas = [...schemaLetters].filter((letter) => !datasourceLetters.has(letter));
  if (orphanedSchemas.length > 0) {
    pushDatasourceViolation(
      violations,
      "case_datasource_pair",
      `SQL 必须由同字母的 \${DataSourceX} 与 \${SchemaX} 成对声明；Schema 不得单独出现`,
      `孤立数据库占位符: ${orphanedSchemas.map((letter) => `\${Schema${letter}}`).join(", ")}`,
    );
  }
  if (pairLetters.size === 0) return;

  const blocks = parseDatasourceBlocks(precondition);
  for (const letter of pairLetters) {
    const block = blocks.find((candidate) => candidate.letter === letter);
    const expectedDatasource = `\${DataSource${letter}}`;
    const expectedSchema = `\${Schema${letter}}`;
    if (
      !block ||
      block.datasource !== expectedDatasource ||
      block.schema !== expectedSchema ||
      !block.type
    ) {
      pushDatasourceViolation(
        violations,
        "case_datasource_block",
        `前置条件必须包含“数据源 ${letter}”固定语义块，并逐行声明数据源 ${expectedDatasource}、规范数据源类型、数据库 ${expectedSchema} 与初始化 SQL`,
        block ? block.text : `未找到数据源 ${letter} 语义块`,
      );
      continue;
    }
    if (!config.datasource_types.includes(block.type)) {
      const alias = config.datasource_types.find(
        (type) => type.toLocaleLowerCase() === block.type?.toLocaleLowerCase(),
      );
      pushDatasourceViolation(
        violations,
        "case_datasource_type",
        `数据源类型必须精确匹配已注册值: ${config.datasource_types.join("、")}`,
        alias
          ? `别名或大小写错误“${block.type}”，应写为“${alias}”`
          : `未注册数据源类型“${block.type}”；禁止回退到 ${config.default_datasource_type}`,
      );
      continue;
    }
    if (!block.sql || !SQL_STATEMENT_RE.test(block.sql)) {
      pushDatasourceViolation(
        violations,
        "case_datasource_sql",
        `数据源 ${letter} 必须包含与 ${block.type} 匹配的完整可执行初始化 SQL`,
        block.sql || "初始化 SQL 缺失",
      );
      continue;
    }
    const profile = lintSql(block.sql, block.type);
    if (profile.errors.length > 0) {
      pushDatasourceViolation(
        violations,
        "case_sql_profile",
        `${block.type} SQL 必须满足已注册方言 profile`,
        profile.errors.join("；"),
      );
    }
    if (!/\bINSERT\s+INTO\b/i.test(block.sql)) {
      const emptyDeclared = config.empty_table_markers.some((marker) =>
        block.text.includes(marker),
      );
      if (!emptyDeclared) {
        pushDatasourceViolation(
          violations,
          "case_datasource_sql",
          "结果依赖行数据时必须写出明确 INSERT；无行数据时必须明确声明该表为空表",
          "SQL 未包含 INSERT，前置条件也未声明空表",
        );
      }
    }
    validateTableNames(file, item, block, violations, config);
  }

  // 保留变量以明确 DataSource 单独出现的合法分支，避免后续误改为双向强制。
  void orphaned;
}

/** Lint authored case semantics only; metadata, requirements and evidence fields are out of scope. */
export function lintCaseContent(file: CasesFile, config: CasesLintConfig): CaseContentViolation[] {
  const violations: CaseContentViolation[] = [];
  const firstStep = new RegExp(config.first_step_pattern);
  const forbiddenByCategory = new Map<string, Set<string>>();

  for (const item of file.cases) {
    const fields = semanticText(item);
    for (const [category, terms] of Object.entries(config.forbidden_terms)) {
      for (const term of terms) {
        if (!fields.some((field) => field.includes(term))) continue;
        const matches = forbiddenByCategory.get(category) ?? new Set<string>();
        matches.add(term);
        forbiddenByCategory.set(category, matches);
      }
    }
    const actual = item.steps[0]?.action.trim() || "<空步骤>";
    if (!firstStep.test(actual)) {
      violations.push({
        rule: "case_first_step_navigation",
        message: `测试用例首步骤不符合页面入口契约，禁止交付给用户验收。\n预期: ${config.first_step_expected}, e.g. ${config.first_step_example}.\n实际: ${actual}`,
      });
    }
    lintDatasourceSql(file, item, config, violations);
  }

  for (const [category, matches] of forbiddenByCategory) {
    violations.push({
      rule: "case_forbidden_term",
      message: `测试用例内容包含不可执行、含糊或过程残留表达，必须完整重写后重新 lint，严禁将修复责任转交用户。\n规则类别: ${category}\n实际: ${[...matches].join("、")}`,
    });
  }
  return violations;
}
