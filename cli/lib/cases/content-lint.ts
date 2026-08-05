import { readFileSync } from "node:fs";
import { isMap, isScalar, isSeq, parse, parseDocument } from "yaml";
import { lintSql } from "../automation/sql.ts";
import { casesLintPath } from "../config-paths.ts";
import type { CaseItem, CasesFile } from "./types.ts";

export interface CasesLintConfig {
  forbidden_terms: Record<string, string[]>;
  forbidden_expectations: Record<string, string>;
  first_step_pattern: string;
  first_step_expected: string;
  first_step_example: string;
  first_step_result: string;
  bulk_row_threshold: number;
  partition_case_terms: string[];
  default_datasource_type: string;
  datasource_types: string[];
  table_roles: string[];
  empty_table_markers: string[];
  environment_placeholders: {
    project: string;
    datasource: string;
    schema: string;
  };
  environment_context_terms: {
    project: string[];
    datasource: string[];
    schema: string[];
  };
}

export interface CaseContentViolation {
  rule: string;
  message: string;
}

interface DatasourceBlock {
  letter: string;
  text: string;
  type?: string;
  schemas: string[];
}

const SQL_STATEMENT_RE =
  /\b(?:CREATE\s+TABLE|INSERT\s+INTO|DROP\s+TABLE|ALTER\s+TABLE|MERGE\s+INTO|UPDATE\s+|DELETE\s+FROM)\b/i;
/** 数据准备 SQL 块：编号条目的标题行含「建表语句/创建数据表/初始化」语义且 SQL 位于缩进行。 */
const DATA_PREP_HEADING_RE =
  /^\d+\)\s+[^\n]*(?:建表语句|创建数据表|建表|初始化|创建表|数据准备|准备数据|表结构如下|建表SQL)[：:（(]?\s*$/m;
const BLOCK_SQL_RE =
  /^\s{2,}(?:\b(?:CREATE\s+TABLE|INSERT\s+INTO|DROP\s+TABLE|ALTER\s+TABLE|MERGE\s+INTO|UPDATE\s+|DELETE\s+FROM)\b)/im;
const DATASOURCE_RE = /\$\{DataSource([A-Z])\}/g;
const SCHEMA_RE = /\$\{Schema([A-Z])\d*\}/g;
const RUN_SUFFIX_RE = /\$\{RunSuffix\}/;
// 2026-08-04: 标题统一单公式「验证【模块】-【功能点】<操作>，<可观测结果>(条件)」。
// 对象最多两级，链式【】；操作不得省略；结果必须是可观测断言；条件可选写在末尾半角括号内。
// 禁止「在…时」从句、下划线拼接、通用断言词与括号内嵌套【】。
const CASE_TITLE_RE =
  /^验证【[^】]+】(?:-【[^】]+】)?[^【，()_]+，[^【，()_]+(?:\([^()【】_]+\))?$/;
// 标题末尾括号必须是可判断的条件表达式：必须含比较/算术操作符（= ≠ ≥ ≤ > < + - * ÷）、
// 逻辑连接（且、或）或状态断言（为空、非空、非已…等否定式）；纯数字、层级标签、功能点不算条件。
const TITLE_CONDITION_OPERATOR_RE =
  /[=≠≥≤><+*÷-]|且|或|为空|非空|未配置|非(?:已|未|启|失效|发布|空)/;
const NUMBERED_LINE_RE = /^(\d+)\)\s+\S/;
const GENERATOR_COMMAND_RE = /^\s*(?:mysql|psql|sqlplus|beeline|spark-sql|hive|curl|wget|ssh)\b/im;

function strings(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string" && item.length > 0);
}

function stringRecord(value: unknown): value is Record<string, string> {
  return (
    Boolean(value) &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.values(value as Record<string, unknown>).every(
      (item) => typeof item === "string" && item.length > 0,
    )
  );
}

function stringArrayRecord(value: unknown): value is Record<string, string[]> {
  return (
    Boolean(value) &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.values(value as Record<string, unknown>).every((item) => strings(item))
  );
}

/** Load the executable global authored-case policy. It deliberately has no schema/version marker. */
export function loadCasesLintConfig(repoRoot: string): CasesLintConfig {
  const path = casesLintPath(repoRoot);
  const value = parse(readFileSync(path, "utf8")) as Partial<CasesLintConfig> | null;
  if (!value || typeof value !== "object") throw new Error(`用例内容 lint 配置无效: ${path}`);
  if (
    !value.forbidden_terms ||
    Object.values(value.forbidden_terms).some((terms) => !strings(terms)) ||
    !stringRecord(value.forbidden_expectations) ||
    Object.keys(value.forbidden_terms).some(
      (category) => !value.forbidden_expectations?.[category],
    ) ||
    typeof value.first_step_pattern !== "string" ||
    typeof value.first_step_expected !== "string" ||
    typeof value.first_step_example !== "string" ||
    typeof value.first_step_result !== "string" ||
    !Number.isInteger(value.bulk_row_threshold) ||
    (value.bulk_row_threshold ?? 0) < 1 ||
    !strings(value.partition_case_terms) ||
    typeof value.default_datasource_type !== "string" ||
    !strings(value.datasource_types) ||
    !strings(value.table_roles) ||
    !strings(value.empty_table_markers) ||
    !stringRecord(value.environment_placeholders) ||
    !(["project", "datasource", "schema"] as const).every(
      (key) => typeof value.environment_placeholders?.[key] === "string",
    ) ||
    !stringArrayRecord(value.environment_context_terms) ||
    !(["project", "datasource", "schema"] as const).every((key) =>
      strings(value.environment_context_terms?.[key]),
    )
  ) {
    throw new Error(`用例内容 lint 配置缺少可执行规则: ${path}`);
  }
  if (!value.datasource_types.includes(value.default_datasource_type)) {
    throw new Error(`默认数据源类型未注册: ${value.default_datasource_type}`);
  }
  try {
    new RegExp(value.first_step_pattern);
    new RegExp(value.environment_placeholders.project);
    new RegExp(value.environment_placeholders.datasource);
    new RegExp(value.environment_placeholders.schema);
  } catch (error) {
    throw new Error(`用例内容正则无效: ${(error as Error).message}`);
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

function compactActual(value: string): string {
  const compact = value.replace(/\s*\n\s*/g, " ↵ ").trim();
  return compact.length > 500 ? `${compact.slice(0, 497)}...` : compact || "<空>";
}

function makeViolation(
  rule: string,
  expected: string,
  actual: string,
  fix?: string,
): CaseContentViolation {
  return {
    rule,
    message: `标题: YAML用例存在违规内容，必须整改.\n预期：${expected}\n实际：${compactActual(actual)}\n修复：${compactActual(fix ?? `按预期改写当前内容：${expected}`)}\n要求：语义级重写全部同类内容后重新执行 lint；未通过前不得交由用户验收!`,
  };
}

/** Block semicolon-packed preconditions before parse-time normalization hides the source defect. */
export function lintCaseYamlSource(yamlText: string): CaseContentViolation[] {
  const document = parseDocument(yamlText);
  if (document.errors.length > 0) return [];
  const cases = document.getIn(["cases"], true);
  if (!isSeq(cases)) return [];

  const violations: CaseContentViolation[] = [];
  for (const item of cases.items) {
    if (!isMap(item)) continue;
    const precondition = item.get("precondition", true);
    if (!isScalar(precondition) || typeof precondition.value !== "string") continue;

    const packedLine = precondition.value.split("\n").find((line) => {
      if (!/[；;]/.test(line)) return false;
      if (/^\s+/.test(line)) return false;
      const structuralLine = line.replace(
        /(「[^」]*」|“[^”]*”|‘[^’]*’|"[^"]*"|'[^']*'|`[^`]*`)/g,
        (quoted) => quoted.replace(/[；;]/g, " "),
      );
      return structuralLine
        .split(/[；;]/)
        .map((part) => part.trim())
        .filter(Boolean)
        .some((part) => !/^\d+\)\s+/.test(part));
    });
    if (packedLine) {
      violations.push(
        makeViolation(
          "case_precondition_semicolon",
          "前置条件含分号时，每个独立条件必须单独换行并使用连续编号；未编号的分号串必须阻断",
          packedLine,
          "将分号分隔的独立条件拆到多行，并按 1)、2)、3) 连续编号；引号内作为测试数据的分号无需拆分",
        ),
      );
    }
  }
  return violations;
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
  const headings = [
    ...precondition.matchAll(
      /^\d+\)\s+授权数据源(?:\s+([A-Z]))?[：:]\s*(\$\{DataSource([A-Z])\})\s*$/gm,
    ),
  ];
  return headings.map((heading, index) => {
    const letter = heading[1] || heading[3] || "";
    const start = heading.index ?? 0;
    const end = headings[index + 1]?.index ?? precondition.length;
    const text = precondition.slice(start, end).trim();
    const explicitType = text.match(
      new RegExp(`^\\d+\\)\\s+数据源\\s+${letter}\\s+类型[：:]\\s*([^\\n]+?)\\s*$`, "m"),
    )?.[1];
    const unletteredType = text.match(/^\d+\)\s+数据源类型[：:]\s*([^\n]+?)\s*$/m)?.[1];
    const schemaLine = text.match(
      new RegExp(`^\\d+\\)\\s+(?:数据源\\s+${letter}\\s+)?存在数据库[：:]\\s*([^\\n]+?)\\s*$`, "m"),
    )?.[1];
    const schemas = schemaLine
      ? [...schemaLine.matchAll(new RegExp(`\\$\\{Schema${letter}\\d*\\}`, "g"))].map(
          (match) => match[0],
        )
      : [];
    return {
      letter,
      text,
      type: explicitType ?? unletteredType,
      schemas: [...new Set(schemas)],
    };
  });
}

function validateNumberedBlock(text: string): string | undefined {
  if (text === "无") return undefined;
  const lines = text.split("\n").filter((line) => line.trim());
  if (!NUMBERED_LINE_RE.test(lines[0] ?? "")) {
    return "非空前置条件未从 1) 开始";
  }
  const numbered = lines
    .map((line) => line.match(NUMBERED_LINE_RE)?.[1])
    .filter((value): value is string => Boolean(value))
    .map(Number);
  const invalidTopLevel = lines
    .slice(1)
    .find((line) => !/^\s/.test(line) && !NUMBERED_LINE_RE.test(line));
  if (invalidTopLevel) return `未编号的顶层内容: ${invalidTopLevel}`;
  for (const [index, value] of numbered.entries()) {
    if (value !== index + 1) return `编号序列为 ${numbered.join("、")}`;
  }
  return undefined;
}

// 表单字段编号(1) 字段名: 值)是单次表单填写的一部分，不算独立操作阶段
const FORM_FIELD_LINE_RE = /^\d+\)\s+[^:：\n]+[:：]/;
function numberedActionItemCount(action: string): number {
  return action
    .split("\n")
    .filter(
      (line) =>
        NUMBERED_LINE_RE.test(line.trimStart()) && !FORM_FIELD_LINE_RE.test(line.trimStart()),
    ).length;
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

function stableTableTokens(text: string): string[] {
  return [
    ...text.matchAll(
      /\btest_table_\d+_c\d{4}(?:_(?:source|target|comparison|dimension)(?:_\d{2,})?)?\b/g,
    ),
  ].map((match) => match[0]);
}

function validateTableNames(
  file: CasesFile,
  item: CaseItem,
  precondition: string,
  datasourceLetters: Set<string>,
  config: CasesLintConfig,
): CaseContentViolation[] {
  const requirementId = item.requirement_id ?? file.meta.requirement_id;
  if (!requirementId) {
    return [
      makeViolation(
        "case_sql_table_name",
        '涉及建表 SQL 的用例必须声明数字 requirement_id 或 "none"，以生成稳定表名',
        "缺少 requirement_id",
      ),
    ];
  }
  const base = `test_table_${requirementId}_${item.id.toLowerCase()}`;
  const generated = /使用以下\s+(?:Shell|Python)\s+脚本生成\s+\S+\.sql/.test(precondition);
  const references = tableReferences(precondition).filter((name) => !(generated && name === "%s"));
  const invalidReferences = references.filter((name) => {
    const match = name.match(/^\$\{Schema([A-Z])\d*\}\.(.+)$/);
    return !match || !datasourceLetters.has(match[1] ?? "");
  });
  const violations: CaseContentViolation[] = [];
  if (invalidReferences.length > 0) {
    violations.push(
      makeViolation(
        "case_sql_table_name",
        `SQL 表必须使用同数据源的 \${SchemaX}.test_table_<requirement_id>_<case_id> 完整限定数据库`,
        `未按数据库占位符限定的表名: ${invalidReferences.join("、")}`,
      ),
    );
  }
  const directNames = createdTables(precondition)
    .map((name) => name.match(/^\$\{Schema[A-Z]\d*\}\.(.+)$/)?.[1])
    .filter((name): name is string => Boolean(name));
  const names = [
    ...new Set(directNames.length > 0 ? directNames : stableTableTokens(precondition)),
  ];
  const roleAlternation = config.table_roles.join("|");
  const single = new RegExp(`^${base}$`);
  const multi = new RegExp(`^${base}_(${roleAlternation})(?:_(\\d{2,}))?$`);
  if (names.length === 1 && !single.test(names[0] ?? "")) {
    violations.push(
      makeViolation("case_sql_table_name", `单表用例必须命名为 ${base}`, `建表名称: ${names[0]}`),
    );
  }
  if (names.length > 1) {
    const invalid = names.filter((name) => !multi.test(name));
    if (invalid.length > 0) {
      violations.push(
        makeViolation(
          "case_sql_table_name",
          `多表用例必须命名为 ${base}_<${config.table_roles.join("|")}>[_两位序号]`,
          `建表名称: ${names.join("、")}`,
        ),
      );
    } else {
      const roleCounts = new Map<string, string[]>();
      for (const name of names) {
        const match = name.match(multi);
        if (!match?.[1]) continue;
        roleCounts.set(match[1], [...(roleCounts.get(match[1]) ?? []), name]);
      }
      const missingOrdinal = [...roleCounts.values()].flatMap((entries) =>
        entries.length > 1 ? entries.filter((name) => !/_\d{2,}$/.test(name)) : [],
      );
      if (missingOrdinal.length > 0) {
        violations.push(
          makeViolation(
            "case_sql_table_name",
            "同一角色存在两张及以上表时，每张表都追加至少两位序号，例如 source_01、source_02；超大集合可使用 source_00001",
            `缺少至少两位序号: ${missingOrdinal.join("、")}`,
          ),
        );
      }
    }
  }
  return violations;
}

/** 统计 INSERT 中 VALUES 顶层 row tuple 数量：跳过字符串/注释内的括号与嵌套函数参数。 */
function countValuesRows(text: string): number {
  let maximum = 0;
  for (const match of text.matchAll(/\bINSERT\s+INTO[\s\S]*?\bVALUES\b([\s\S]*?);/gi)) {
    const body = match[1] ?? "";
    let depth = 0;
    let rows = 0;
    let quote: string | undefined;
    let inLineComment = false;
    for (let index = 0; index < body.length; index += 1) {
      const char = body[index] ?? "";
      const next = body[index + 1] ?? "";
      if (inLineComment) {
        if (char === "\n") inLineComment = false;
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
      if (char === "-" && next === "-") {
        inLineComment = true;
        index += 1;
        continue;
      }
      if (char === "'" || char === '"' || char === "`") {
        quote = char;
        continue;
      }
      if (char === "(") {
        if (depth === 0) rows += 1;
        depth += 1;
        continue;
      }
      if (char === ")") depth = Math.max(0, depth - 1);
    }
    maximum = Math.max(maximum, rows);
  }
  return maximum;
}

function generatorViolation(precondition: string): CaseContentViolation | undefined {
  const generator = precondition.match(
    /使用以下\s+(Shell|Python)\s+脚本生成\s+(\S+\.(?:sql|csv|xlsx))/,
  );
  if (!generator) return undefined;
  const [, language, filename] = generator;
  const shellComplete =
    language !== "Shell" ||
    (/#!\/usr\/bin\/env bash/.test(precondition) &&
      /set -euo pipefail/.test(precondition) &&
      /output_file=/.test(precondition));
  const pythonComplete =
    language !== "Python" ||
    (/from openpyxl import Workbook/.test(precondition) && /workbook\.save\(/.test(precondition));
  if (!shellComplete || !pythonComplete) {
    return makeViolation(
      "case_generator_scope",
      "在前置条件中给出可直接复制的完整生成脚本；Shell 包含解释器、严格模式和输出文件，XLSX Python 包含 openpyxl 创建与保存逻辑",
      `文件生成脚本不完整: ${filename}`,
    );
  }
  if (GENERATOR_COMMAND_RE.test(precondition)) {
    return makeViolation(
      "case_generator_scope",
      "生成脚本只生成 SQL、CSV 或 XLSX 文件，不连接、不登录且不执行平台或数据库",
      "生成脚本包含外部系统执行命令",
    );
  }
  if (
    filename?.endsWith(".sql") &&
    !/复制\s+\S+\.sql\s+的内容，在\s+\$\{DataSource[A-Z]\}\s+对应平台或底层执行/.test(precondition)
  ) {
    return makeViolation(
      "case_generator_scope",
      "SQL 生成脚本后明确写明复制 SQL 文件内容并在对应数据源平台或底层执行",
      "缺少 SQL 文件的人工执行说明",
    );
  }
  return undefined;
}

type EnvironmentKind = "project" | "datasource" | "schema";

interface BusinessFixtureRule {
  label: string;
  placeholderPrefix: string;
  patterns: RegExp[];
}

const ENVIRONMENT_VALUE =
  "(?:「([^」]*)」|“([^”]*)”|‘([^’]*)’|\"([^\"]*)\"|'([^']*)'|`([^`]*)`|([^\\s，,。；;、]+))";
const ENVIRONMENT_QUOTED_VALUE =
  "(?:「([^」]*)」|“([^”]*)”|‘([^’]*)’|\"([^\"]*)\"|'([^']*)'|`([^`]*)`)";
const SQL_TABLE_CONTEXT =
  /\b(?:DROP\s+TABLE(?:\s+IF\s+EXISTS)?|CREATE\s+TABLE(?:\s+IF\s+NOT\s+EXISTS)?|INSERT\s+INTO(?:\s+TABLE)?|ALTER\s+TABLE|MERGE\s+INTO|UPDATE|DELETE\s+FROM|FROM|JOIN)\s+([^\s(),;]+)/gi;
const STABLE_TABLE_TOKEN_RE =
  /\btest_table_\d+_c\d{4}(?:_(?:source|target|comparison|dimension)(?:_\d{2,})?)?\b/gi;
const FILE_TOKEN_RE = /\b[^\s，,。；;、]+\.(?:csv|xlsx|xls|sql)\b/gi;
/** 数据质量模块下的同级别平级菜单（岚图 ltqc 侧边栏）；tags 中只允许保留一个平级模块。 */
const FLAT_DQ_MODULES = [
  "规则库配置",
  "规则集管理",
  "规则任务管理",
  "校验结果查询",
  "数据质量报告",
];
const BUSINESS_VALUE =
  "(?:\\s*(?:[：:][^\\S\\n]*)?(?:「([^」\\n]+)」|“([^”\\n]+)”|‘([^’\\n]+)’|\"([^\"\\n]+)\"|'([^'\\n]+)'|`([^`\\n]+)`)|(?:[：:][^\\S\\n]*|\\s+)([A-Za-z][A-Za-z0-9_-]*))";

function businessPattern(context: string): RegExp {
  return new RegExp(`${context}(?:为|输入)?${BUSINESS_VALUE}`, "g");
}

const BUSINESS_FIXTURE_RULES: BusinessFixtureRule[] = [
  {
    label: "租户",
    placeholderPrefix: "Tenant",
    patterns: [businessPattern("租户(?:名称)?")],
  },
  {
    label: "用户",
    placeholderPrefix: "User",
    patterns: [
      businessPattern("(?:账号|用户|管理员)(?:名称)?"),
      /使用[^\n]*?\s([A-Za-z][A-Za-z0-9_-]*)\s+登录/g,
    ],
  },
  {
    label: "用户组",
    placeholderPrefix: "UserGroup",
    patterns: [businessPattern("用户组(?:名称)?")],
  },
  {
    label: "标准编号",
    placeholderPrefix: "StandardCode",
    patterns: [businessPattern("标准编号")],
  },
  {
    label: "标准目录",
    placeholderPrefix: "Catalog",
    patterns: [businessPattern("(?:末级)?(?:标准)?目录(?:名称)?")],
  },
  {
    label: "标准",
    placeholderPrefix: "Standard",
    patterns: [
      businessPattern("标准(?:中文名称|英文名称|名称)?"),
      businessPattern("标准(?:中文|英文)?名称搜索框"),
    ],
  },
  {
    label: "规则集",
    placeholderPrefix: "RuleSet",
    patterns: [businessPattern("规则集(?:名称)?")],
  },
  {
    label: "规则",
    placeholderPrefix: "Rule",
    patterns: [businessPattern("规则(?:名称)?")],
  },
  {
    label: "任务",
    placeholderPrefix: "Task",
    patterns: [businessPattern("任务(?:名称)?")],
  },
  {
    label: "报告",
    placeholderPrefix: "Report",
    patterns: [businessPattern("报告(?:名称)?")],
  },
];

function placeholderName(prefix: string, index: number): string {
  const letter = String.fromCharCode("A".charCodeAt(0) + (index % 26));
  const cycle = Math.floor(index / 26);
  return `${prefix}${letter}${cycle > 0 ? cycle + 1 : ""}`;
}

function isBusinessPlaceholder(value: string, prefix: string): boolean {
  const placeholder = `${prefix}[A-Z](?:\\d+)?`;
  return new RegExp(`^(?:${placeholder}|\\$\\{${placeholder}\\})$`).test(value);
}

/** 常见配置选项、状态与字段标签值，不作为业务实例占位符要求。 */
const NON_INSTANCE_TERMS = new Set([
  "限制",
  "不限制",
  "启用",
  "禁用",
  "正常",
  "异常",
  "成功",
  "失败",
  "运行中",
  "全部覆盖",
  "部分覆盖",
  "已发布",
  "未发布",
  "是",
  "否",
  "有",
  "无",
  "空",
  "暂无",
  "姓名",
  "SQL",
  "sql",
  "JSON",
  "json",
  "schema",
  "Schema",
  "id",
  "ID",
  "category",
  "score",
  "转义脱敏",
  "算法脱敏",
]);

function firstCapturedValue(match: RegExpMatchArray): string | undefined {
  return match
    .slice(1)
    .find((value) => Boolean(value))
    ?.trim();
}

function placeholderRe(config: CasesLintConfig, kind: EnvironmentKind): RegExp {
  return new RegExp(config.environment_placeholders[kind]);
}

function addEnvironmentValue(
  values: Map<EnvironmentKind, Set<string>>,
  kind: EnvironmentKind,
  value: string | undefined,
  config: CasesLintConfig,
): void {
  if (!value || placeholderRe(config, kind).test(value)) return;
  if (/^\$\{[^}]+\}$/.test(value)) return;
  const clean = value.replace(/^['"`]|['"`]$/g, "").trim();
  if (!clean || clean.startsWith("${") || clean.includes("${")) return;
  if (/(?:\.csv|\.xlsx|\.xls|\.sql)$/i.test(clean)) return;
  if (
    kind === "schema" &&
    /^(?:information_schema|table_schema|pg_catalog|sys|public)$/i.test(clean)
  ) {
    return;
  }
  if (
    (kind === "project" &&
      /^(?:发布目标|目标项目|目标|源项目|本项目|当前项目|项目成员|项目列表)$/.test(clean)) ||
    (kind === "schema" && /^(?:空|唯一[）)]?|null|none)$/i.test(clean))
  ) {
    return;
  }
  if (
    kind === "datasource" &&
    config.datasource_types.some((type) => type.toLocaleLowerCase() === clean.toLocaleLowerCase())
  ) {
    return;
  }
  const entries = values.get(kind) ?? new Set<string>();
  entries.add(clean);
  values.set(kind, entries);
}

function collectMarkedEnvironmentValues(
  text: string,
  kind: EnvironmentKind,
  config: CasesLintConfig,
  values: Map<EnvironmentKind, Set<string>>,
): void {
  const configuredTerms = new Set(
    config.environment_context_terms[kind].map((term) => term.toLocaleLowerCase()),
  );
  const hasTerm = (...terms: string[]) =>
    terms.some((term) => configuredTerms.has(term.toLocaleLowerCase()));
  const terms =
    kind === "project"
      ? [
          hasTerm("项目") ? "项目(?:名称)?(?:\\s*[A-Z])?" : "",
          hasTerm("工程") ? "工程(?:名称)?" : "",
          hasTerm("project") ? "project(?:\\s+name)?(?:\\s*[A-Z])?" : "",
        ]
      : kind === "datasource"
        ? [
            hasTerm("数据源") ? "数据源(?!\\s*类型)(?:名称)?(?:\\s+[A-Z])?" : "",
            hasTerm("datasource") ? "datasource(?:\\s+name)?" : "",
          ]
        : [
            hasTerm("数据库") ? "数据库(?:名称)?" : "",
            hasTerm("源库") ? "源库" : "",
            hasTerm("目标库") ? "目标库" : "",
            hasTerm("schema") ? "schema(?:\\s+name)?" : "",
            hasTerm("database") ? "database(?:\\s+name)?" : "",
          ];
  const prefix = terms.filter(Boolean).join("|");
  if (!prefix) return;
  const patterns: RegExp[] = [];
  if (kind === "project") {
    patterns.push(
      new RegExp(`(?:${prefix})\\s*[：:为是]\\s*${ENVIRONMENT_VALUE}`, "gi"),
      new RegExp(`(?:${prefix})\\s*${ENVIRONMENT_QUOTED_VALUE}`, "gi"),
    );
  } else if (kind === "datasource") {
    patterns.push(
      new RegExp(`(?:${prefix})\\s*[：:为是]\\s*${ENVIRONMENT_VALUE}`, "gi"),
      new RegExp(`(?:${prefix})\\s*${ENVIRONMENT_QUOTED_VALUE}`, "gi"),
      new RegExp(
        `(?:名称|name)\\s*[：:为是]\\s*${ENVIRONMENT_QUOTED_VALUE}\\s*(?:的)?\\s*[^\\n：:，,。；;、]{0,16}数据源`,
        "gi",
      ),
    );
  } else {
    patterns.push(
      new RegExp(`(?:${prefix})\\s*[：:为是]\\s*${ENVIRONMENT_VALUE}`, "gi"),
      new RegExp(`(?:${prefix})\\s*${ENVIRONMENT_QUOTED_VALUE}`, "gi"),
    );
  }
  for (const pattern of patterns) {
    pattern.lastIndex = 0;
    for (const match of text.matchAll(pattern)) {
      const value = firstCapturedValue(match);
      // “数据源类型：SparkThrift2.x” is a dialect declaration, not a data source name.
      if (kind === "datasource" && /数据源类型|datasource\s*type/i.test(match[0])) continue;
      addEnvironmentValue(values, kind, value, config);
    }
  }
}

function collectQualifiedEnvironmentValues(
  text: string,
  config: CasesLintConfig,
  values: Map<EnvironmentKind, Set<string>>,
): void {
  const stableFreeText = text.replace(STABLE_TABLE_TOKEN_RE, " ");
  for (const match of stableFreeText.matchAll(SQL_TABLE_CONTEXT)) {
    const reference = (match[1] ?? "").replace(/[;'",]+$/, "");
    const parts = reference.split(".");
    if (parts.length < 2) continue;
    const table = parts.at(-1) ?? "";
    if (/^\$\{Schema[A-Z]\d*\}$/i.test(parts.at(-2) ?? "")) continue;
    if (
      /^\$\{DataSource[A-Z]\}$/i.test(parts[0] ?? "") &&
      /^\$\{Schema[A-Z]\d*\}$/i.test(parts[1] ?? "")
    ) {
      continue;
    }
    if (!table) continue;
    const qualifier = parts.slice(0, -1).join(".");
    const kind: EnvironmentKind = /^\$\{DataSource[A-Z]\}$/i.test(parts[0] ?? "")
      ? "schema"
      : "schema";
    addEnvironmentValue(values, kind, qualifier, config);
  }
}

function lintEnvironmentPlaceholders(
  item: CaseItem,
  config: CasesLintConfig,
): CaseContentViolation[] {
  const values = new Map<EnvironmentKind, Set<string>>();
  // Titles are intentionally excluded: historical titles are retained verbatim and are not
  // environment fixtures. Preconditions, actions, expected results and tags are authored data.
  const fields = [
    item.precondition ?? "",
    ...item.steps.flatMap((step) => [step.action, step.expected]),
    ...(item.tags ?? []),
  ];
  for (const text of fields) {
    collectMarkedEnvironmentValues(text, "project", config, values);
    collectMarkedEnvironmentValues(text, "datasource", config, values);
    collectMarkedEnvironmentValues(text, "schema", config, values);
    collectQualifiedEnvironmentValues(text, config, values);

    const withoutTables = text.replace(STABLE_TABLE_TOKEN_RE, " ");
    const withoutFiles = withoutTables.replace(/\b[\w.-]+\.(?:csv|xlsx|xls|sql)\b/gi, " ");
    const withoutStringLiterals = withoutFiles.replace(/(['"`])(?:\\.|(?!\1).)*\1/g, " ");
    for (const match of withoutStringLiterals.matchAll(
      /\b(?:offline|online|prod|dev|staging)[_-]\d+\b/gi,
    )) {
      addEnvironmentValue(values, "project", match[0], config);
    }
    for (const match of withoutStringLiterals.matchAll(/\b项目(?:[A-Z]|\d+)\b/g)) {
      addEnvironmentValue(values, "project", match[0], config);
    }
    for (const match of withoutStringLiterals.matchAll(
      /\b(?:test|prod|dev|staging|offline|online)?_?project[_-][A-Za-z0-9_-]+\b/gi,
    )) {
      addEnvironmentValue(values, "project", match[0], config);
    }
    // 自定义项目命名（如 quality_menu_legacy/order_new/xxx_demo）按项目名处理；排除表名与文件名
    const withoutProjectTables = withoutStringLiterals
      .replace(/\btest_table_(?:\d+|none)_\w*\b/gi, " ")
      .replace(/\b[\w.-]+\.(?:csv|xlsx|xls|sql)\b/gi, " ");
    for (const match of withoutProjectTables.matchAll(
      /\b[A-Za-z][A-Za-z0-9_-]*(?:_legacy|_new|_demo|_test|_prod|_dev|_stage)\b/gi,
    )) {
      addEnvironmentValue(values, "project", match[0], config);
    }
    // test_table_ 开头的表名不是 schema 实例
    const withoutSchemaLikeTables = withoutStringLiterals.replace(
      /\btest_table_(?:\d+|none)_c\d{4}(?:_(?:source|target|comparison|dimension)(?:_\d{2,})?)?\b/gi,
      " ",
    );
    for (const match of withoutSchemaLikeTables.matchAll(
      /(?<!\bAS\s)\b(?:[A-Za-z][\w-]*_(?:demo|db|schema|target)|schema_[A-Za-z0-9][\w-]*)\b/gi,
    )) {
      addEnvironmentValue(values, "schema", match[0], config);
    }
  }

  const actual = [...values.entries()]
    .flatMap(([kind, entries]) => [...entries].map((entry) => `${kind}=${entry}`))
    .join("；");
  if (!actual) return [];
  return [
    makeViolation(
      "case_environment_placeholders",
      `项目名使用 \${ProjectA}、\${ProjectB} 等占位符；数据源名使用 \${DataSourceA}、\${DataSourceB} 等占位符；数据库或 Schema 使用 \${SchemaA}、\${SchemaB} 等占位符；只有表名保留具体稳定名称`,
      actual,
      `将具体环境实例替换为：${[...values.entries()]
        .flatMap(([kind, entries]) => {
          const prefix =
            kind === "project" ? "Project" : kind === "datasource" ? "DataSource" : "Schema";
          return [...entries].map(
            (entry, index) => `${entry} → ${"${"}${placeholderName(prefix, index)}}`,
          );
        })
        .join("；")}`,
    ),
  ];
}

function lintBusinessPlaceholders(item: CaseItem): CaseContentViolation[] {
  const values = new Map<BusinessFixtureRule, Set<string>>();
  for (const text of semanticText(item)) {
    const fixtureText = text.replace(STABLE_TABLE_TOKEN_RE, " ").replace(FILE_TOKEN_RE, " ");
    for (const rule of BUSINESS_FIXTURE_RULES) {
      for (const pattern of rule.patterns) {
        pattern.lastIndex = 0;
        for (const match of fixtureText.matchAll(pattern)) {
          const value = firstCapturedValue(match);
          if (!value || isBusinessPlaceholder(value, rule.placeholderPrefix)) continue;
          if (value.length <= 1 || NON_INSTANCE_TERMS.has(value)) continue;
          const entries = values.get(rule) ?? new Set<string>();
          entries.add(value);
          values.set(rule, entries);
        }
      }
    }
  }
  if (values.size === 0) return [];

  const actual = [...values.entries()]
    .flatMap(([rule, entries]) => [...entries].map((entry) => `${rule.label}=${entry}`))
    .join("；");
  const replacements = [...values.entries()]
    .flatMap(([rule, entries]) =>
      [...entries].map(
        (entry, index) => `${entry} → ${placeholderName(rule.placeholderPrefix, index)}`,
      ),
    )
    .join("；");
  return [
    makeViolation(
      "case_business_placeholders",
      "除稳定表名和文件名外，租户、用户、用户组、目录、标准编号、标准、规则集、规则、任务、报告等业务实例均使用语义占位符",
      actual,
      `将具体业务实例替换为：${replacements}`,
    ),
  ];
}

/**
 * 平级模块校验：数据质量下的规则库配置/规则集管理/规则任务管理/校验结果查询/数据质量报告
 * 是同一级别的平级菜单（岚图 ltqc 侧边栏），tags 中只允许保留一个平级模块（用例核心操作模块）；
 * 不得把流程中经过的其他平级模块串成层级链（如 [数据质量, 规则集管理, 规则任务管理, 校验结果查询]）。
 * 其他平级模块可放入功能细节 tag，但必须与核心模块同层级、不形成 数据质量→A→B→C 链。
 */
function lintTagsFlatModules(item: CaseItem): CaseContentViolation[] {
  if (!item.tags || item.tags.length === 0) return [];
  const tagList = item.tags;
  // 找到连续出现的平级模块（中间无其他 tag 间隔即视为串链）
  const modulePositions = tagList
    .map((tag, index) => ({ tag, index }))
    .filter(({ tag }) => FLAT_DQ_MODULES.includes(tag));
  // 平级模块间若被非模块 tag 隔开则不构成串链（如 [规则集管理, 规则任务管理, 校验结果查询] 是串链，
  // [规则集管理, 明细查看, 校验结果查询] 是分散引用）。
  let chainFound = false;
  let chainStart = -1;
  let chainEnd = -1;
  for (let i = 0; i < modulePositions.length; i++) {
    const cur = modulePositions[i];
    const next = modulePositions[i + 1];
    if (!next) continue;
    // 相邻平级模块（中间无其他 tag）即构成同级别串链
    if (next.index === cur.index + 1) {
      chainFound = true;
      chainStart = chainStart === -1 ? cur.index : chainStart;
      chainEnd = next.index;
    }
  }
  if (!chainFound) return [];
  const chainTags = tagList.slice(chainStart, chainEnd + 1);
  return [
    makeViolation(
      "case_tags_flat_modules",
      "数据质量下 规则库配置/规则集管理/规则任务管理/校验结果查询/数据质量报告 是同一级别平级模块，tags 只保留一个核心模块；不得把平级模块串成层级链",
      `tags 平级模块串链：${chainTags.join("、")}`,
      `将 tags 改为 [数据质量, ${chainTags[0]}]（核心操作模块），或保留核心模块 + 平级功能细节（如 [数据质量, ${chainTags[0]}, ${chainTags[1]} 明细]）`,
    ),
  ];
}

function lintImportFixture(precondition: string, threshold: number): CaseContentViolation[] {
  if (!/\.(?:csv|xlsx)\b/i.test(precondition)) return [];
  const generated = /使用以下\s+(?:Shell|Python)\s+脚本生成\s+\S+\.(?:csv|xlsx)/i.test(
    precondition,
  );
  if (generated) return [];
  const isXlsx = /\.xlsx\b/i.test(precondition);
  const hasTitle = /^\s*Title:\s*\S/m.test(precondition);
  const lines = [...precondition.matchAll(/^\s*Line(\d+):\s*.+$/gm)].map((match) =>
    Number(match[1]),
  );
  const complete =
    hasTitle && lines.includes(1) && (!isXlsx || /^\s*Sheet:\s*\S/m.test(precondition));
  const violations: CaseContentViolation[] = [];
  if (!complete) {
    violations.push(
      makeViolation(
        "case_import_fixture",
        `CSV/XLSX 五行以内写出 Title 和至少 Line1；XLSX 另写 Sheet，空单元格使用相邻逗号保留`,
        "导入文件缺少可直接创建的表头、首条记录或工作表信息",
      ),
    );
  }
  if (lines.some((line) => line > threshold)) {
    violations.push(
      makeViolation(
        "case_import_fixture",
        `导入记录超过 ${threshold} 行时使用完整文件生成脚本；CSV 优先 Shell，XLSX 使用 Python + openpyxl`,
        `内联记录已写到 Line${Math.max(...lines)}`,
      ),
    );
  }
  return violations;
}

function lintDatasourceSql(
  file: CasesFile,
  item: CaseItem,
  config: CasesLintConfig,
): CaseContentViolation[] {
  const violations: CaseContentViolation[] = [];
  const allText = semanticText(item).join("\n");
  const precondition = item.precondition ?? "";
  const datasourceLetters = placeholderLetters(allText, DATASOURCE_RE);
  const schemaLetters = placeholderLetters(allText, SCHEMA_RE);
  const pairLetters = new Set([...datasourceLetters].filter((letter) => schemaLetters.has(letter)));
  if (RUN_SUFFIX_RE.test(allText)) {
    violations.push(
      makeViolation(
        "case_run_suffix",
        "功能用例只保存稳定表名；运行后缀仅由自动化运行时追加",
        `功能用例内容出现 \${RunSuffix}`,
      ),
    );
  }
  const orphanedSchemas = [...schemaLetters].filter((letter) => !datasourceLetters.has(letter));
  if (orphanedSchemas.length > 0) {
    violations.push(
      makeViolation(
        "case_datasource_pair",
        "数据库占位符必须与同字母的数据源占位符成对声明",
        `孤立数据库占位符: ${orphanedSchemas.map((letter) => `\${Schema${letter}}`).join("、")}`,
      ),
    );
  }
  // 数据准备 SQL（编号块标题含建表/初始化语义的缩进建表/写入语句）缺少配对占位符时，
  // 无法执行方言、表名与批量数据契约；任务配置、表解析语句、页面输入 SQL 不属于此列。
  const dataPrepHeading = DATA_PREP_HEADING_RE.test(precondition);
  const blockSqlLines = precondition.split("\n").filter((line) => BLOCK_SQL_RE.test(line));
  const hasBlockSql = dataPrepHeading && blockSqlLines.length > 0;
  if (pairLetters.size === 0 && hasBlockSql) {
    violations.push(
      makeViolation(
        "case_datasource_pair",
        "出现数据源初始化 SQL（缩进块的建表或写入语句）时必须同时声明同字母的授权数据源与数据库占位符配对；否则方言、表名与批量数据契约无法校验",
        `缩进 SQL 存在但未声明 \${DataSourceX}/\${SchemaX} 配对: ${compactActual(
          blockSqlLines[0] ?? "",
        )}`,
        "在数据源前置条件中按编号声明授权数据源、数据源类型、存在数据库与完整 SQL，并复用相同字母的 ${DataSourceX}/${SchemaX}",
      ),
    );
    violations.push(...validateTableNames(file, item, precondition, datasourceLetters, config));
    const explicitRows = countValuesRows(precondition);
    if (
      explicitRows > config.bulk_row_threshold &&
      !/\brange\s*\(/i.test(precondition) &&
      !/使用以下\s+(?:Shell|Python)\s+脚本生成/.test(precondition)
    ) {
      violations.push(
        makeViolation(
          "case_bulk_rows",
          `显式数据最多 ${config.bulk_row_threshold} 行；超过后使用当前方言的集合生成语句，方言不支持时在前置条件中给出完整文件生成脚本`,
          `VALUES 显式写入 ${explicitRows} 行`,
        ),
      );
    }
    return violations;
  }
  if (pairLetters.size === 0) return violations;

  const blocks = parseDatasourceBlocks(precondition);
  for (const letter of pairLetters) {
    const block = blocks.find((candidate) => candidate.letter === letter);
    const expectedDatasource = `\${DataSource${letter}}`;
    const expectedSchemas = [
      ...precondition.matchAll(new RegExp(`\\$\\{Schema${letter}\\d*\\}`, "g")),
    ].map((match) => match[0]);
    if (!block || block.schemas.length === 0 || !block.type) {
      violations.push(
        makeViolation(
          "case_datasource_block",
          `前置条件按编号分别声明授权数据源 ${expectedDatasource}、精确数据源类型、数据库 ${expectedSchemas[0] ?? `\${Schema${letter}}`} 和完整 SQL`,
          block?.text ?? `未找到 ${expectedDatasource} 的编号式数据源前置条件`,
        ),
      );
      continue;
    }
    if (!config.datasource_types.includes(block.type)) {
      const alias = config.datasource_types.find(
        (type) => type.toLocaleLowerCase() === block.type?.toLocaleLowerCase(),
      );
      violations.push(
        makeViolation(
          "case_datasource_type",
          `数据源类型精确使用已注册值: ${config.datasource_types.join("、")}`,
          alias ? `数据源类型“${block.type}”应写为“${alias}”` : `未注册数据源类型“${block.type}”`,
        ),
      );
      continue;
    }
    if (!SQL_STATEMENT_RE.test(block.text)) {
      violations.push(
        makeViolation(
          "case_datasource_sql",
          `同时出现 ${expectedDatasource} 与数据库占位符时，前置条件包含与 ${block.type} 匹配的完整可执行初始化 SQL`,
          "未识别到建表或写入 SQL",
        ),
      );
      continue;
    }
    const profile = lintSql(block.text, block.type);
    if (profile.errors.length > 0) {
      violations.push(
        makeViolation(
          "case_sql_profile",
          `${block.type} SQL 满足已注册方言规则`,
          profile.errors.join("；"),
        ),
      );
    }
    if (!/\bINSERT\s+INTO\b/i.test(block.text)) {
      const emptyDeclared = config.empty_table_markers.some((marker) =>
        block.text.includes(marker),
      );
      if (!emptyDeclared) {
        violations.push(
          makeViolation(
            "case_datasource_sql",
            "结果依赖行数据时写出明确 INSERT；空表场景明确声明该表为空表",
            "SQL 未包含 INSERT，前置条件也未声明空表",
          ),
        );
      }
    }
  }
  violations.push(...validateTableNames(file, item, precondition, datasourceLetters, config));
  const explicitRows = countValuesRows(precondition);
  if (
    explicitRows > config.bulk_row_threshold &&
    !/\brange\s*\(/i.test(precondition) &&
    !/使用以下\s+(?:Shell|Python)\s+脚本生成/.test(precondition)
  ) {
    violations.push(
      makeViolation(
        "case_bulk_rows",
        `显式数据最多 ${config.bulk_row_threshold} 行；超过后使用当前方言的集合生成语句，方言不支持时在前置条件中给出完整文件生成脚本`,
        `VALUES 显式写入 ${explicitRows} 行`,
      ),
    );
  }
  return violations;
}

function lintPartitionFixture(
  item: CaseItem,
  config: CasesLintConfig,
): CaseContentViolation | undefined {
  const text = semanticText(item).join("\n");
  if (!config.partition_case_terms.some((term) => text.includes(term))) return undefined;
  const precondition = item.precondition ?? "";
  const hasPartitionTable = /\bPARTITIONED\s+BY\b|\bPARTITION\s+BY\b/i.test(precondition);
  const hasPreviousDate =
    /date_(?:sub|add)\s*\(\s*current_date\s*\(\s*\)\s*,\s*-?1\s*\)/i.test(precondition) ||
    /current_date\s*-\s*interval\s+'1\s+day'/i.test(precondition);
  // 当日分区必须来自独立表达式；先剔除已被前一日表达式命中的片段，避免
  // date_sub(current_date(), 1) 里的 current_date 被误当成当日分区证据。
  const withoutPreviousDateExpr = precondition.replace(
    /date_(?:sub|add)\s*\(\s*current_date\s*\(\s*\)\s*,\s*-?1\s*\)|current_date\s*-\s*interval\s+'1\s+day'/gi,
    "",
  );
  const hasCurrentDate =
    /date_format\s*\(\s*current_date\s*\(\s*\)/i.test(withoutPreviousDateExpr) ||
    /\bcurrent_date\b(?!\s*-\s*interval)/i.test(withoutPreviousDateExpr);
  // 明确固定日期分区：前置写入至少两个不同的 YYYY-MM-DD 日期字面量作为分区值，
  // 与动态日期二选一即可（用例选择分区需写具体值 dt=YYYY-MM-DD）。
  const fixedPartitionDates = new Set(
    [...precondition.matchAll(/'(\d{4}-\d{2}-\d{2})'/g)].map((m) => m[1]),
  );
  const hasFixedTwoPartitions = fixedPartitionDates.size >= 2;
  const dynamicOk = hasPartitionTable && hasPreviousDate && hasCurrentDate;
  const fixedOk = hasPartitionTable && hasFixedTwoPartitions;
  if (dynamicOk || fixedOk) return undefined;
  return makeViolation(
    "case_partition_fixture",
    "分区、增量同步或分区扫描场景使用分区表，并写入至少两个分区（动态日期前一日+当日，或两个明确固定日期 YYYY-MM-DD）",
    `分区表=${hasPartitionTable ? "是" : "否"}，前一日动态分区=${hasPreviousDate ? "是" : "否"}，当日动态分区=${hasCurrentDate ? "是" : "否"}，固定日期分区数=${fixedPartitionDates.size}`,
  );
}

/**
 * 分区数据语义校验：新建监控任务选择分区时，选择分区必须写出分区字段=具体值
 * （如「选择已有分区(dt=2026-08-05)」），不得写「选择当日分区」「选择已有分区」这类无值占位；
 * 分区表用例的两个分区数据必须一正一异——一个分区全部可校验通过，
 * 另一个分区全部校验不通过，与用例预期结果（达标/通过 vs 校验不通过/失败）形成对照。
 */
function lintPartitionDataSplit(item: CaseItem): CaseContentViolation[] {
  const violations: CaseContentViolation[] = [];
  const precondition = item.precondition ?? "";
  if (!/\bPARTITIONED\s+BY\b|\bPARTITION\s+BY\b/i.test(precondition)) return violations;

  const allText = semanticText(item).join("\n");
  const selectPartitionSteps = item.steps.filter((s) => /选择分区[：:]/.test(s.action));

  // 选择分区必须写出分区字段=具体值，如 选择已有分区(dt=2026-08-05)
  for (const step of selectPartitionSteps) {
    const m = step.action.match(/选择分区[：:]\s*([^\n]+)/);
    if (!m) continue;
    const value = m[1].trim();
    const hasExplicitValue =
      /\([^()\n]*[A-Za-z_][A-Za-z0-9_]*\s*=\s*[^()\n]+\)/.test(value);
    if (!hasExplicitValue) {
      violations.push(
        makeViolation(
          "case_partition_data_split",
          "选择分区必须写出分区字段=具体值（如「选择已有分区(dt=2026-08-05)」），不得写「选择当日分区」「选择已有分区」等无值占位；分区值要与前置 SQL 写入的分区及用例预期结果一致（预期达标选正确数据分区，预期不通过选异常数据分区）",
          `选择分区：${value}`,
          `改为：选择分区：选择已有分区(dt=2026-08-05)（dt 为前置 SQL 实际写入的分区值）`,
        ),
      );
    }
  }

  // 监控任务选择分区场景：用例声明了预期结果时，两个分区数据必须一正一异
  if (selectPartitionSteps.length === 0) return violations;
  const hasExpectedPass =
    /校验(?:状态|结果)(?:为|是)?[「"']?(?:达标|通过|「达标」|「通过」)/.test(allText) ||
    /结果状态为「达标」/.test(allText);
  const hasExpectedFail =
    /校验(?:状态|结果)(?:为|是)?[「"']?(?:不通过|失败|异常)/.test(allText) ||
    /「校验不通过」|「校验失败」|「校验异常」/.test(allText);
  // 校验失败场景（如字段类型不支持导致运行失败）与数据正异无关，放行。
  if (/校验失败|「校验失败」|运行失败|字段类型[^\n]*(?:不支持|不匹配)/.test(allText)) return violations;
  if (!hasExpectedPass && !hasExpectedFail) return violations;

  const hasPassPartition =
    /正确(?:数据|分区)|通过(?:数据|分区)|(?:全部|均为)[^\n]*(?:单调递增|正确)/.test(allText) ||
    (hasExpectedPass && /符合规则单调递增/.test(allText));
  const hasFailPartition =
    /异常(?:数据|分区)|不通过(?:数据|分区)|违规(?:数据|分区)|(?:全部|均为)[^\n]*(?:不单调|违规)/.test(allText) ||
    (hasExpectedFail && /不符合规则单调递增/.test(allText));
  if (!hasPassPartition || !hasFailPartition) {
    violations.push(
      makeViolation(
        "case_partition_data_split",
        "分区表用例的两个分区数据必须一正一异：一个分区全部为可校验通过的正确数据，另一个分区全部为校验不通过的异常数据；步骤/前置中应声明分区数据对照（如「前一日分区为正确数据，当日分区为异常数据」）",
        `正确分区数据=${hasPassPartition ? "已声明" : "未声明"}，异常分区数据=${hasFailPartition ? "已声明" : "未声明"}`,
        "前置建表插入两个分区：一个分区全部写入单调递增正确数据（预期达标），另一个分区写入违反单调递增的异常数据（预期校验不通过）；并在前置或步骤中声明两个分区的数据对照",
      ),
    );
  }
  return violations;
}

function lintSqlExpected(item: CaseItem): CaseContentViolation[] {
  const violations: CaseContentViolation[] = [];
  for (const step of item.steps) {
    if (!/(?:SQL.*(?:校验|验证)|(?:校验|验证).*SQL|任务校验)/i.test(step.action)) continue;
    if (/\bSELECT\b[\s\S]*查询结果[：:]/i.test(step.expected)) continue;
    violations.push(
      makeViolation(
        "case_sql_expected",
        "SQL 任务校验预期同时写出可执行 SELECT 查询和确定的查询结果",
        step.expected,
      ),
    );
  }
  return violations;
}

/**
 * 规则集新建表单必须按前端顺序列出全部配置项：
 * *规则集名称、*选择数据源、*选择数据库、*选择数据表、规则集描述（可空但必须占位列出）。
 * 只检查 action 文本中含「新建规则集」语义的块。
 */
const RULE_SET_FORM_FIELDS: { label: string; required: boolean }[] = [
  { label: "规则集名称", required: true },
  { label: "选择数据源", required: true },
  { label: "选择数据库", required: true },
  { label: "选择数据表", required: true },
  { label: "规则集描述", required: true },
];

/** 监控对象表单配置项，顺序与前端一致；数据源/数据库/数据表必填且带 * 标志。 */
const MONITOR_OBJECT_FORM_FIELDS: { label: string; required: boolean }[] = [
  { label: "数据源", required: true },
  { label: "数据库", required: true },
  { label: "数据表", required: true },
];

/** 新建监控任务表单配置项，顺序与前端一致；规则名称/选择数据源/选择数据库/选择数据表必填带 *，选择分区/抽样检查设置可空但须占位。 */
const MONITOR_TASK_FORM_FIELDS: { label: string; required: boolean }[] = [
  { label: "规则名称", required: true },
  { label: "选择数据源", required: true },
  { label: "选择数据库", required: true },
  { label: "选择数据表", required: true },
  { label: "选择分区", required: false },
  { label: "抽样检查设置", required: false },
];

/** 引入规则包表单配置项，顺序与前端一致；规则包/规则类型必填带 *，点击「引入」并「确定」。 */
const RULE_PACKAGE_IMPORT_FIELDS: { label: string; required: boolean }[] = [
  { label: "规则包", required: true },
  { label: "规则类型", required: true },
];

function lintMonitorObjectForm(action: string): CaseContentViolation[] {
  const violations: CaseContentViolation[] = [];
  if (!/配置监控对象/.test(action)) return violations;

  const missing: string[] = [];
  const noStar: string[] = [];
  const order: string[] = [];
  for (const field of MONITOR_OBJECT_FORM_FIELDS) {
    if (!new RegExp(`(?:\\*\\s*)?${field.label}[：:]`).test(action)) {
      missing.push(field.label);
    } else {
      order.push(field.label);
      if (!new RegExp(`\\*\\s*${field.label}[：:]`).test(action)) noStar.push(field.label);
    }
  }
  const expectedOrder = MONITOR_OBJECT_FORM_FIELDS.map((field) => field.label);
  const ordered = order.every((label, index) => label === expectedOrder[index]);
  if (missing.length > 0 || noStar.length > 0 || !ordered) {
    violations.push(
      makeViolation(
        "case_monitor_object_form",
        "配置监控对象表单必填项必须带 * 标志并按前端顺序列出：*数据源、*数据库、*数据表",
        missing.length > 0
          ? `缺少配置项：${missing.join("、")}`
          : noStar.length > 0
            ? `缺少必填 * 标志：${noStar.join("、")}`
            : `配置项顺序错乱：${order.join(" → ")}`,
        `在「配置监控对象」action 中补齐并按顺序列出：\n* 数据源：${"${DataSourceA}"}\n* 数据库：${"${SchemaA}"}\n* 数据表：`,
      ),
    );
  }
  return violations;
}

/** 新建监控任务表单校验：规则名称/选择数据源/选择数据库/选择数据表必填带 *，选择分区/抽样检查设置可空占位。 */
function lintMonitorTaskForm(action: string): CaseContentViolation[] {
  const violations: CaseContentViolation[] = [];
  // 只拦含表单内容的 action；「点击「新建规则任务」」这类纯按钮步骤不含表单，跳过。
  if (!/新建规则任务|新建监控任务/.test(action)) return violations;
  if (!/(?:规则名称|选择数据源)[：:]/.test(action)) return violations;

  const missing: string[] = [];
  const noStar: string[] = [];
  const order: string[] = [];
  for (const field of MONITOR_TASK_FORM_FIELDS) {
    const present = new RegExp(`(?:\\*\\s*)?${field.label}[：:]`).test(action);
    if (present) {
      order.push(field.label);
      if (field.required && !new RegExp(`\\*\\s*${field.label}[：:]`).test(action)) {
        noStar.push(field.label);
      }
    } else if (field.required) {
      missing.push(field.label);
    }
  }
  const expectedOrder = MONITOR_TASK_FORM_FIELDS.map((field) => field.label);
  const ordered = order.every((label, index) => label === expectedOrder[index]);
  if (missing.length > 0 || noStar.length > 0 || !ordered) {
    violations.push(
      makeViolation(
        "case_monitor_task_form",
        "新建监控任务表单必须按前端顺序列出全部配置项：*规则名称、*选择数据源、*选择数据库、*选择数据表、选择分区、抽样检查设置（必填带 *，可空项也须占位列出）",
        missing.length > 0
          ? `缺少配置项：${missing.join("、")}`
          : noStar.length > 0
            ? `缺少必填 * 标志：${noStar.join("、")}`
            : `配置项顺序错乱：${order.join(" → ")}`,
        `在「新建监控任务」action 中补齐并按顺序列出：\n* 规则名称：\n* 选择数据源：${"${DataSourceA}"}\n* 选择数据库：${"${SchemaA}"}\n* 选择数据表：\n选择分区：\n抽样检查设置：`,
      ),
    );
  }
  return violations;
}

/** 引入规则包表单校验：规则包/规则类型必填带 *，点击「引入」并「确定」。 */
function lintRulePackageImportForm(action: string): CaseContentViolation[] {
  const violations: CaseContentViolation[] = [];
  if (!/引入规则包|「引入」/.test(action)) return violations;

  const missing: string[] = [];
  const noStar: string[] = [];
  const order: string[] = [];
  for (const field of RULE_PACKAGE_IMPORT_FIELDS) {
    const present = new RegExp(`(?:\\*\\s*)?${field.label}[：:]`).test(action);
    if (present) {
      order.push(field.label);
      if (field.required && !new RegExp(`\\*\\s*${field.label}[：:]`).test(action)) {
        noStar.push(field.label);
      }
    } else if (field.required) {
      missing.push(field.label);
    }
  }
  const expectedOrder = RULE_PACKAGE_IMPORT_FIELDS.map((field) => field.label);
  const ordered = order.every((label, index) => label === expectedOrder[index]);
  if (missing.length > 0 || noStar.length > 0 || !ordered) {
    violations.push(
      makeViolation(
        "case_rule_package_import",
        "引入规则包必须按前端顺序列出：*规则包（规则名称）、*规则类型，并点击「引入」并「确定」",
        missing.length > 0
          ? `缺少配置项：${missing.join("、")}`
          : noStar.length > 0
            ? `缺少必填 * 标志：${noStar.join("、")}`
            : `配置项顺序错乱：${order.join(" → ")}`,
        `在「引入规则包」action 中补齐并按顺序列出：\n* 规则包：\n* 规则类型：全部\n点击「引入」并「确定」`,
      ),
    );
  }
  return violations;
}

function lintRuleSetForm(action: string): CaseContentViolation[] {
  const violations: CaseContentViolation[] = [];
  if (!/新建规则集/.test(action)) return violations;

  const missing: string[] = [];
  const order: string[] = [];
  for (const field of RULE_SET_FORM_FIELDS) {
    if (new RegExp(field.label).test(action)) {
      order.push(field.label);
    } else if (field.required) {
      missing.push(field.label);
    }
  }
  // 校验配置项按前端顺序出现：缺失时按缺失项报；顺序错乱时单独报。
  const expectedOrder = RULE_SET_FORM_FIELDS.map((field) => field.label);
  const ordered = order.every((label, index) => label === expectedOrder[index]);
  if (missing.length > 0 || !ordered) {
    violations.push(
      makeViolation(
        "case_rule_set_form",
        "新建规则集表单必须按前端顺序列出全部配置项：*规则集名称、*选择数据源、*选择数据库、*选择数据表、规则集描述（可空也须占位列出）",
        missing.length > 0
          ? `缺少配置项：${missing.join("、")}`
          : `配置项顺序错乱：${order.join(" → ")}`,
        `在「新建规则集」action 中补齐全部配置项并按顺序列出：\n* 规则集名称：\n* 选择数据源：${"${DataSourceA}"}\n* 选择数据库：${"${SchemaA}"}\n* 选择数据表：\n规则集描述：`,
      ),
    );
  }
  return violations;
}

/** 调度属性表单配置项，顺序与前端一致；全部配置项都必须占位列出（可空项值为空/不限制/不勾选）。 */
const SCHEDULE_FORM_FIELDS: { label: string; required: boolean }[] = [
  { label: "调度周期", required: true },
  { label: "规则拼接包", required: true },
  { label: "资源组", required: true },
  { label: "超时时间", required: true },
  { label: "告警方式", required: true },
  { label: "无需生成报告", required: true },
  { label: "报告名称", required: true },
];

function lintScheduleForm(action: string): CaseContentViolation[] {
  const violations: CaseContentViolation[] = [];
  // 只拦数据质量规则任务的调度属性表单；落标检查的「调度配置」是检查周期，不在此列
  if (!/调度属性/.test(action)) return violations;

  const missing: string[] = [];
  const order: string[] = [];
  for (const field of SCHEDULE_FORM_FIELDS) {
    if (new RegExp(field.label).test(action)) {
      order.push(field.label);
    } else if (field.required) {
      missing.push(field.label);
    }
  }
  const expectedOrder = SCHEDULE_FORM_FIELDS.map((field) => field.label);
  const ordered = order.every((label, index) => label === expectedOrder[index]);
  if (missing.length > 0 || !ordered) {
    violations.push(
      makeViolation(
        "case_schedule_form",
        "调度属性表单必须按前端顺序列出全部配置项：*调度周期、*规则拼接包、*资源组、*超时时间、告警方式、无需生成报告、报告名称（可空项也须占位列出）",
        missing.length > 0
          ? `缺少配置项：${missing.join("、")}`
          : `配置项顺序错乱：${order.join(" → ")}`,
        `在「调度属性」action 中补齐全部配置项并按顺序列出：\n* 调度周期：手动触发\n* 规则拼接包：\n* 资源组：\n* 超时时间：不限制\n告警方式：\n无需生成报告：\n报告名称：`,
      ),
    );
  }
  return violations;
}

/**
 * 前置条件只声明环境与数据准备；任何面向业务对象的配置操作（配置规则/规则集/规则任务、
 * 点击、新建、保存、引入等）必须写进 steps[].action。仅检查非缩进编号行，
 * SQL/脚本/文件内容的缩进行不在此列。
 */
function lintPreconditionConfigAction(precondition: string): CaseContentViolation[] {
  const violations: CaseContentViolation[] = [];
  // 显式配置动词：操作必须写进 steps[].action
  const configVerb =
    /(配置|新建|创建(?:规则|任务|规则集)|点击|保存|引入|添加规则|勾选|填写|选择(?!数据源|数据库|数据表|分区)|设置(?!分区)|(?:立即|临时|手动)?执行(?:规则|任务|任务集|该规则|该任务)|删除|提交|下载)/;
  // 业务对象声明带配置明细：规则/规则集/规则任务的配置内容属于操作，不属于前置条件
  const objectWithDetail =
    /存在(?:规则集|规则任务|规则|任务|规则包|监控任务|数据质量任务)[^。]*?(?:校验字段|排序字段|校验方法|维度字段|统计函数|过滤条件|规则[：:]|其中包含规则|强弱规则|期望值)/;
  for (const line of precondition.split("\n")) {
    const trimmed = line.trimStart();
    if (!/^\d+\)\s+/.test(trimmed)) continue;
    const content = trimmed.replace(/^\d+\)\s+/, "");
    // 完成状态声明（已/已经…配置/创建/执行/引入）是环境事实，放行
    if (/已.{0,50}?(?:配置|创建|引入|执行|开启|设置|保存|生成|提交)/.test(content)) continue;
    if (configVerb.test(content) || objectWithDetail.test(content)) {
      violations.push(
        makeViolation(
          "case_precondition_config_action",
          "前置条件只声明环境与数据准备（数据源授权、建表、插数、账号、已存在对象），不写配置操作；" +
            "「配置监控对象/监控规则、新建规则集/规则任务、规则集内包含某规则配置、点击保存、引入规则包、立即执行」等必须写进 steps[].action",
          trimmed,
          "将配置操作改为 action 步骤：action 用块文本列出操作与字段配置，expected 写可观测结果",
        ),
      );
    }
  }
  return violations;
}

/** Lint authored case semantics only; metadata, requirements and evidence fields are out of scope. */
export function lintCaseContent(file: CasesFile, config: CasesLintConfig): CaseContentViolation[] {
  const violations: CaseContentViolation[] = [];
  const firstStep = new RegExp(config.first_step_pattern);
  const forbiddenByCategory = new Map<string, Set<string>>();

  for (const item of file.cases) {
    if (!CASE_TITLE_RE.test(item.title)) {
      violations.push(
        makeViolation(
          "case_title_format",
          "标题必须使用统一公式「验证【模块】-【功能点】<操作>，<可观测结果>(条件)」；" +
            "操作不得省略，结果必须是可观测断言，条件可选写在末尾半角括号内，" +
            "禁止「在…时」从句、下划线拼接与通用断言词",
          item.title,
        ),
      );
    }
    // 括号条件必须是可判断表达式：必须含比较/算术操作符、且或连接、为空/非空等判定词。
    // 不含判定词的一律拦截，不受黑名单限制（黑名单只用于错误信息里的参考）。
    const parenMatch = item.title.match(/\(([^()]+)\)$/);
    if (parenMatch) {
      const condition = parenMatch[1].trim();
      if (!TITLE_CONDITION_OPERATOR_RE.test(condition)) {
        violations.push(
          makeViolation(
            "case_title_condition",
            `标题末尾括号必须是可判断的条件表达式，必须含比较/算术操作符（= ≠ ≥ ≤ > < + - * ÷）、连接词（且、或）或状态断言（为空、非空）等判定关键字，如「行数 ≥ 10000」「期望值 ≠ 0」「数据源 = Hive2.x」「密码为空」；"${condition}" 不含判定关键字，无真条件时去掉括号，有用信息合并到标题正文`,
            condition,
          ),
        );
      }
    }
    const fields = semanticText(item);
    for (const [category, terms] of Object.entries(config.forbidden_terms)) {
      for (const term of terms) {
        const matched = fields.some((field) => field.includes(term));
        if (!matched) continue;
        const matches = forbiddenByCategory.get(category) ?? new Set<string>();
        matches.add(term);
        forbiddenByCategory.set(category, matches);
      }
    }

    const precondition = item.precondition?.trim() ?? "";
    const preconditionProblem = validateNumberedBlock(precondition);
    if (!precondition || preconditionProblem) {
      violations.push(
        makeViolation(
          "case_precondition_format",
          "无前置条件写“无”；一条或多条前置条件均从 1) 开始并使用连续半角编号，SQL、脚本和文件内容作为对应编号的缩进行",
          preconditionProblem ?? "前置条件为空",
        ),
      );
    }

    const emptyCells: string[] = [];
    for (const step of item.steps) {
      if (!step.action.trim()) emptyCells.push("action 为空");
      if (!step.expected.trim()) emptyCells.push("expected 为空");
    }
    if (emptyCells.length > 0) {
      violations.push(
        makeViolation(
          "case_step_empty",
          "每个步骤的 action 和 expected 都写明完整内容；历史空续行合并到相邻步骤",
          [...new Set(emptyCells)].join("、"),
        ),
      );
    }

    for (const step of item.steps) {
      if (numberedActionItemCount(step.action) < 2) continue;
      violations.push(
        makeViolation(
          "case_action_atomicity",
          "每个 action 只描述一个可独立验收的操作阶段；同一表单的多个字段可合并配置并一次提交，页面切换、提交、下载、核对、再次操作或状态变更必须拆成独立步骤",
          step.action,
        ),
      );
    }

    for (const step of item.steps) {
      violations.push(...lintRuleSetForm(step.action));
      violations.push(...lintScheduleForm(step.action));
      violations.push(...lintMonitorObjectForm(step.action));
      violations.push(...lintMonitorTaskForm(step.action));
      violations.push(...lintRulePackageImportForm(step.action));
    }

    const actual = item.steps[0]?.action.trim() || "<空步骤>";
    if (!firstStep.test(actual)) {
      violations.push(
        makeViolation(
          "case_first_step_navigation",
          `${config.first_step_expected}, e.g. ${config.first_step_example}.`,
          actual,
          `将首步骤 action 改为：${config.first_step_example}`,
        ),
      );
    }
    const firstExpected = item.steps[0]?.expected.trim() || "<空预期>";
    if (firstExpected !== config.first_step_result) {
      violations.push(
        makeViolation(
          "case_first_step_expected",
          `首步骤预期只写“${config.first_step_result}”`,
          firstExpected,
          `将首步骤 expected 改为：${config.first_step_result}`,
        ),
      );
    }
    violations.push(...lintDatasourceSql(file, item, config));
    violations.push(...lintEnvironmentPlaceholders(item, config));
    violations.push(...lintBusinessPlaceholders(item));
    violations.push(...lintTagsFlatModules(item));
    const generatorProblem = generatorViolation(precondition);
    if (generatorProblem) violations.push(generatorProblem);
    violations.push(...lintImportFixture(precondition, config.bulk_row_threshold));
    violations.push(...lintPreconditionConfigAction(precondition));
    const partitionProblem = lintPartitionFixture(item, config);
    if (partitionProblem) violations.push(partitionProblem);
    violations.push(...lintPartitionDataSplit(item));
    violations.push(...lintSqlExpected(item));
    if (item.automation?.executor === "api") {
      violations.push(
        makeViolation(
          "case_pure_api",
          "功能用例集只保留可由用户功能路径执行的用例；纯接口用例不纳入当前用例集",
          "存在 automation.executor: api",
        ),
      );
    }
  }

  for (const [category, matches] of forbiddenByCategory) {
    violations.push(
      makeViolation(
        "case_forbidden_term",
        config.forbidden_expectations[category] ?? "删除违规表达并改写为可执行、可观察内容",
        [...matches].join("、"),
      ),
    );
  }
  return violations;
}
