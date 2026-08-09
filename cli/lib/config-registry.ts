/**
 * Central config registry: the single source of truth for every config/ family.
 *
 * Each family declares its canonical files, example templates, privacy, role and
 * validators. `kata config list/show/validate/docs` and the README generated
 * region derive entirely from this table — adding a family means adding one
 * entry here and a validator, nothing else.
 *
 * Runtime modules keep their focused typed loaders; this registry owns discovery,
 * documentation and validation orchestration rather than acting as a universal loader.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { parse } from "yaml";
import { loadZentaoCreateConfig } from "../integrations/zentao/create.ts";
import { loadSqlProfilesFile } from "./automation/sql.ts";
import { loadCasesLintConfig } from "./cases/content-lint.ts";
import {
  privateRoot as configPrivateRoot,
  effectivePrivatePath,
  privateInstanceFiles,
  sharedPrivateRoot,
} from "./config-paths.ts";
import { loadSourceRepos } from "./git-source.ts";
import { readInfraConfig } from "./infra-config.ts";
import { readPlatformEnvConfig } from "./platform-env.ts";
import { loadLanhuConfig, loadNotifyConfig, loadZentaoConfig } from "./plugin-config.ts";
import { readPolicy } from "./repository-policy.ts";
import { repoRoot as defaultRepoRoot } from "./workspace-locator.ts";
import { loadXmindMappingFile } from "./xmind-rules.ts";

export type ConfigRole = "contract" | "runtime" | "secret";
export type ConfigFamilyName =
  | "environments"
  | "integrations"
  | "infrastructure"
  | "repositories"
  | "repo-policy"
  | "cases-lint"
  | "sql-profiles"
  | "xmind-mapping";

export interface ConfigTemplateMapping {
  /** 模板复制后的目标路径；多实例族使用 <name> 占位。 */
  target: string;
  /** tracked 脱敏模板路径。 */
  example: string;
}

export interface ConfigFamilyEntry {
  name: ConfigFamilyName;
  /** 职责：契约（框架强制）、运行时行为、私密配置 */
  role: ConfigRole;
  /** 是否私密（位于 config/private/ 下，整体 gitignored） */
  private: boolean;
  /** 一句话职责说明（进入 `config list` 与 README 生成区） */
  docs: string;
  /** 固定文件（相对 repoRoot）；多实例族的实例文件由 instancesDir 给出 */
  files: string[];
  /** 多实例目录（相对 repoRoot），如 environments 的 config/private/environments */
  instancesDir?: string;
  /** 目标配置与 example 的精确一对一映射（相对 repoRoot，example 全部 tracked） */
  templates: ConfigTemplateMapping[];
  /** 单文件深度加载：加载并校验一个配置文件，失败抛带路径的错误 */
  loadFile: (path: string, root: string) => unknown;
  /** 单文件校验：解析 + 结构 + 未知字段检查，失败抛带路径的错误 */
  validateFile: (path: string, root: string) => void;
  /** example 校验：解析 + 结构 + 未知字段检查 */
  validateExample: (path: string) => void;
}

function readYaml(path: string): unknown {
  return parse(readFileSync(path, "utf8"));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

/** 未知字段守卫：顶层键超出允许列表即报错（旧字段/旧格式在此被驱逐）。 */
export function assertKnownKeys(
  record: Record<string, unknown>,
  allowed: string[],
  path: string,
): void {
  const unknown = Object.keys(record).filter((key) => !allowed.includes(key));
  if (unknown.length > 0) {
    throw new Error(`${path} 包含未知字段: ${unknown.join(", ")}`);
  }
}

/** 深脱敏：命中敏感键名的字符串值替换为占位符，其余原样返回。 */
export function redactSecrets(value: unknown): unknown {
  const SECRET_KEY = /(cookie|password|pass|secret|token|webhook|sign)/i;
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(redactSecrets);
  if (isRecord(value)) {
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) {
      out[key] = SECRET_KEY.test(key) ? "<redacted>" : redactSecrets(item);
    }
    return out;
  }
  return value;
}

/**
 * 私密族的 show 投影：整族内容都是私密拓扑（仓库名/分支/客户/URL/数据源/JDBC 等），
 * 值一律隐藏为占位符，仅保留空串以区分「已配置」与「未填写」。非私密族原样展示。
 */
function projectForShow(family: ConfigFamilyEntry, value: unknown): unknown {
  if (!family.private) return value;
  return value === undefined ? undefined : "<redacted>";
}

const EXAMPLES_ROOT = "config/examples";

function validateTopLevel(path: string, allowed: string[]): Record<string, unknown> {
  const doc = readYaml(path);
  if (!isRecord(doc)) throw new Error(`${path} 必须是对象`);
  assertKnownKeys(doc, allowed, path);
  return doc;
}

function integrationValidate(path: string): void {
  const name = basename(path)
    .replace(/\.example\.yaml$/, "")
    .replace(/\.yaml$/, "");
  if (!["lanhu", "zentao", "notify"].includes(name)) {
    throw new Error(`${path} 不是受支持的集成配置名`);
  }
  const allowed =
    name === "notify"
      ? ["enabled", "enabled_events", "dingtalk", "feishu", "wecom", "smtp"]
      : name === "zentao"
        ? ["base_url", "cookie", "username", "password", "create"]
        : ["base_url", "cookie", "username", "password"];
  const doc = validateTopLevel(path, allowed);
  if (name === "notify") {
    const nestedAllowed: Record<string, string[]> = {
      dingtalk: ["enabled", "webhook_url", "keyword", "sign_secret"],
      feishu: ["enabled", "webhook_url"],
      wecom: ["enabled", "webhook_url"],
      smtp: ["enabled", "host", "port", "user", "password", "from", "to", "secure"],
    };
    for (const [section, fields] of Object.entries(nestedAllowed)) {
      const value = doc[section];
      if (value === undefined) continue;
      if (!isRecord(value)) throw new Error(`${path} 的 ${section} 必须是对象`);
      assertKnownKeys(value, fields, `${path}:${section}`);
    }
  }
  if (name === "zentao" && doc.create !== undefined) loadZentaoCreateConfig(path);
}

const INFRA_KINDS = ["hosts", "data_sources", "credentials"] as const;

function infraValidate(path: string, root: string): void {
  const kind = basename(path, ".yaml").replace(/\.example$/, "");
  if (!INFRA_KINDS.includes(kind as (typeof INFRA_KINDS)[number])) {
    throw new Error(`${path} 不是受支持的基础设施配置名`);
  }
  const doc = validateTopLevel(path, [...INFRA_KINDS]);
  const key = kind === "hosts" ? "hosts" : kind === "data_sources" ? "data_sources" : "credentials";
  if (!isRecord(doc[key])) throw new Error(`${path} 缺 ${key} 对象`);
  // 私密三件套齐备时做深度校验
  if (
    kind !== "credentials" &&
    INFRA_KINDS.every((k) => existsSync(effectivePrivatePath(`infrastructure/${k}.yaml`, root)))
  ) {
    readInfraConfig(root);
  }
}

export const CONFIG_FAMILIES: ConfigFamilyEntry[] = [
  {
    name: "environments",
    role: "secret",
    private: true,
    docs: "平台 URL、Cookie、租户、项目、数据源与写入安全边界",
    files: [],
    instancesDir: "config/private/environments",
    templates: [
      {
        target: "config/private/environments/<name>.yaml",
        example: join(EXAMPLES_ROOT, "environments", "env.example.yaml"),
      },
    ],
    loadFile: (path, root) => readPlatformEnvConfig(basename(path, ".yaml"), { repoRoot: root }),
    validateFile: (path, root) => {
      validateTopLevel(path, [
        "schema_version",
        "url",
        "auth",
        "guard",
        "projects",
        "datasources",
        "defaults",
        "safety",
        "automation",
      ]);
      readPlatformEnvConfig(basename(path, ".yaml"), { repoRoot: root });
    },
    validateExample: (path) => {
      const doc = validateTopLevel(path, [
        "schema_version",
        "url",
        "auth",
        "guard",
        "projects",
        "datasources",
        "defaults",
        "safety",
      ]);
      if (doc.schema_version !== 2) throw new Error(`${path} schema_version 必须为 2`);
      if (!isRecord(doc.auth) || typeof doc.auth.cookie !== "string") {
        throw new Error(`${path} 缺 auth.cookie`);
      }
    },
  },
  {
    name: "integrations",
    role: "secret",
    private: true,
    docs: "Lanhu、ZenTao、通知（DingTalk/Feishu/WeCom/SMTP）集成配置",
    files: [
      "config/private/integrations/lanhu.yaml",
      "config/private/integrations/zentao.yaml",
      "config/private/integrations/notify.yaml",
    ],
    templates: [
      {
        target: "config/private/integrations/lanhu.yaml",
        example: join(EXAMPLES_ROOT, "integrations", "lanhu.example.yaml"),
      },
      {
        target: "config/private/integrations/zentao.yaml",
        example: join(EXAMPLES_ROOT, "integrations", "zentao.example.yaml"),
      },
      {
        target: "config/private/integrations/notify.yaml",
        example: join(EXAMPLES_ROOT, "integrations", "notify.example.yaml"),
      },
    ],
    loadFile: (path, root) => {
      integrationValidate(path);
      const name = basename(path, ".yaml");
      if (name === "lanhu") return loadLanhuConfig(root);
      if (name === "zentao") return loadZentaoConfig(root);
      if (name === "notify") return loadNotifyConfig(root);
      throw new Error(`${path} 不是受支持的集成配置名`);
    },
    validateFile: (path, root) => {
      integrationValidate(path);
      const name = basename(path, ".yaml");
      if (name === "lanhu") loadLanhuConfig(root);
      else if (name === "zentao") loadZentaoConfig(root);
      else if (name === "notify") loadNotifyConfig(root);
      else throw new Error(`${path} 不是受支持的集成配置名`);
    },
    validateExample: integrationValidate,
  },
  {
    name: "infrastructure",
    role: "secret",
    private: true,
    docs: "SSH 主机、数据源、凭据 profile 与已核验指纹",
    files: [
      "config/private/infrastructure/hosts.yaml",
      "config/private/infrastructure/data_sources.yaml",
      "config/private/infrastructure/credentials.yaml",
    ],
    templates: [
      {
        target: "config/private/infrastructure/hosts.yaml",
        example: join(EXAMPLES_ROOT, "infrastructure", "hosts.example.yaml"),
      },
      {
        target: "config/private/infrastructure/data_sources.yaml",
        example: join(EXAMPLES_ROOT, "infrastructure", "data_sources.example.yaml"),
      },
      {
        target: "config/private/infrastructure/credentials.yaml",
        example: join(EXAMPLES_ROOT, "infrastructure", "credentials.example.yaml"),
      },
    ],
    loadFile: (path, root) => {
      infraValidate(path, root);
      return readYaml(path);
    },
    validateFile: infraValidate,
    validateExample: (path) => {
      // 仅做结构校验；example 不与私密文件做深度关联检查。
      const kind = basename(path, ".example.yaml");
      if (!INFRA_KINDS.includes(kind as (typeof INFRA_KINDS)[number])) {
        throw new Error(`${path} 不是受支持的基础设施配置名`);
      }
      const doc = validateTopLevel(path, [...INFRA_KINDS]);
      const key =
        kind === "hosts" ? "hosts" : kind === "data_sources" ? "data_sources" : "credentials";
      if (!isRecord(doc[key])) throw new Error(`${path} 缺 ${key} 对象`);
    },
  },
  {
    name: "repositories",
    role: "secret",
    private: true,
    docs: "本机源码仓库路径、分支与筛选范围",
    files: ["config/private/repositories.yaml"],
    templates: [
      {
        target: "config/private/repositories.yaml",
        example: join(EXAMPLES_ROOT, "repositories.example.yaml"),
      },
    ],
    loadFile: (path, root) => {
      if (existsSync(join(root, "config", "private", "repositories.yaml"))) {
        return loadSourceRepos(root);
      }
      return readYaml(path);
    },
    validateFile: (path, root) => {
      validateTopLevel(path, ["repos"]);
      loadSourceRepos(root);
    },
    validateExample: (path) => {
      const doc = validateTopLevel(path, ["repos"]);
      if (!Array.isArray(doc.repos)) throw new Error(`${path} 缺 repos 数组`);
      doc.repos.forEach((entry, i) => {
        if (!isRecord(entry)) throw new Error(`${path} repos[${i}] 必须是对象`);
        for (const field of ["name", "project", "path", "branch"]) {
          if (typeof entry[field] !== "string" || !(entry[field] as string).trim()) {
            throw new Error(`${path} repos[${i}].${field} 缺失或不是字符串`);
          }
        }
      });
    },
  },
  {
    name: "repo-policy",
    role: "contract",
    private: false,
    docs: "仓库产物路由与命名契约（repo lint / bun run check 读取）",
    files: ["config/policies/repo-policy.yaml"],
    templates: [],
    loadFile: (path, root) => {
      readPolicy(root);
      return readYaml(path);
    },
    validateFile: (_path, root) => {
      readPolicy(root);
    },
    validateExample: (path) => {
      throw new Error(`${path} 不是 example 模板（契约文件无模板）`);
    },
  },
  {
    name: "cases-lint",
    role: "contract",
    private: false,
    docs: "用例内容硬闸（标题、前置条件、步骤、禁用词、数据与 SQL 契约）",
    files: ["config/policies/cases-lint.yaml"],
    templates: [],
    loadFile: (path, root) => {
      loadCasesLintConfig(root);
      return readYaml(path);
    },
    validateFile: (_path, root) => {
      loadCasesLintConfig(root);
    },
    validateExample: (path) => {
      throw new Error(`${path} 不是 example 模板（契约文件无模板）`);
    },
  },
  {
    name: "sql-profiles",
    role: "contract",
    private: false,
    docs: "SQL 方言契约（方言 profile、必需/禁用片段与占位符）",
    files: ["config/policies/sql-profiles.yaml"],
    templates: [],
    loadFile: (path) => {
      const doc = readYaml(path);
      if (!isRecord(doc) || !isRecord(doc.profiles)) throw new Error(`${path} 缺 profiles 对象`);
      return loadSqlProfilesFile(resolve(path, "..", "..", ".."));
    },
    validateFile: (path) => {
      const doc = validateTopLevel(path, ["profiles"]);
      if (!isRecord(doc.profiles)) throw new Error(`${path} 缺 profiles 对象`);
      // 深度校验：与运行时 lintSql 同一契约源（每个 profile 的结构/正则均校验）。
      loadSqlProfilesFile(resolve(path, "..", "..", ".."));
    },
    validateExample: (path) => {
      throw new Error(`${path} 不是 example 模板（契约文件无模板）`);
    },
  },
  {
    name: "xmind-mapping",
    role: "contract",
    private: false,
    docs: "XMind 根标题与 ZenTao 模块 ID 映射契约",
    files: ["config/policies/xmind-mapping.yaml"],
    templates: [],
    loadFile: (path, root) => {
      loadXmindMappingFile(root);
      return readYaml(path);
    },
    validateFile: (_path, root) => {
      loadXmindMappingFile(root);
    },
    validateExample: (path) => {
      throw new Error(`${path} 不是 example 模板（契约文件无模板）`);
    },
  },
];

export function familyByName(name: string): ConfigFamilyEntry {
  const family = CONFIG_FAMILIES.find((item) => item.name === name);
  if (!family) {
    throw new Error(
      `未知配置族: ${name};可用: ${CONFIG_FAMILIES.map((item) => item.name).join(" | ")}`,
    );
  }
  return family;
}

export interface ConfigIssue {
  level: "error" | "warning";
  path: string;
  message: string;
}

export interface ConfigValidateResult {
  ok: boolean;
  issues: ConfigIssue[];
}

function familyInstances(family: ConfigFamilyEntry, root: string): string[] {
  if (family.instancesDir) {
    if (family.private) {
      // linked worktree：本地 + 主工作树共享实例合并（文件名去重）
      const rel = family.instancesDir.replace(/^config\/private\//, "");
      return privateInstanceFiles(rel, root);
    }
    const dir = join(root, family.instancesDir);
    if (!existsSync(dir)) return [];
    return readdirSync(dir)
      .filter((file) => file.endsWith(".yaml"))
      .sort()
      .map((file) => join(dir, file));
  }
  if (family.private) {
    return family.files.map((file) => effectivePrivatePath(file, root));
  }
  return family.files.map((file) => join(root, file));
}

/** 校验全部族：私密文件存在则校验（干净克隆缺文件不算错），example 必须存在且可校验，契约文件必须存在。 */
export function validateAllConfig(root: string = defaultRepoRoot()): ConfigValidateResult {
  const issues: ConfigIssue[] = [];
  for (const family of CONFIG_FAMILIES) {
    const files = familyInstances(family, root);
    for (const path of files) {
      if (!existsSync(path)) {
        if (!family.private) {
          issues.push({ level: "error", path, message: "契约/运行时配置文件缺失" });
        }
        continue;
      }
      try {
        family.validateFile(path, root);
      } catch (error) {
        issues.push({ level: "error", path, message: (error as Error).message });
      }
      if (family.private && (statSync(path).mode & 0o777) !== 0o600) {
        issues.push({ level: "error", path, message: "私密文件权限必须为 0600" });
      }
    }
    for (const example of [...new Set(family.templates.map((template) => template.example))]) {
      const path = join(root, example);
      if (!existsSync(path)) {
        issues.push({ level: "error", path, message: "example 模板缺失" });
        continue;
      }
      try {
        family.validateExample(path);
      } catch (error) {
        issues.push({ level: "error", path, message: (error as Error).message });
      }
    }
  }
  // 本地 + 共享主工作树两个私密根都要做 0700 检查
  for (const privateRoot of [
    configPrivateRoot(root),
    ...(sharedPrivateRoot(root) ? [sharedPrivateRoot(root) as string] : []),
  ]) {
    if (existsSync(privateRoot) && (statSync(privateRoot).mode & 0o777) !== 0o700) {
      issues.push({ level: "error", path: privateRoot, message: "私密根目录权限必须为 0700" });
    }
  }
  issues.push(...scanLegacyConfigRefs(root));
  return { ok: !issues.some((issue) => issue.level === "error"), issues };
}

/** 旧布局目录名；动态拼接避免守卫自身源码被误扫为残留。 */
const LEGACY_CONFIG_DIRS = ["repos", "plugin", "infra", "env", "lint", "xmind"];
const LEGACY_CONFIG_PATTERNS = LEGACY_CONFIG_DIRS.map((dir) => `config/${dir}/`);

/**
 * 扫描已跟踪文件中出现的旧配置路径字面量。无 git 的临时根/非仓库直接跳过；
 * 干净仓库期望零命中，任何命中都是需修复的残留。
 */
export function scanLegacyConfigRefs(root: string = defaultRepoRoot()): ConfigIssue[] {
  let output: string;
  try {
    output = execFileSync(
      "git",
      ["-C", root, "grep", "-l", "-E", LEGACY_CONFIG_PATTERNS.join("|")],
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
    );
  } catch {
    // 无匹配（exit 1）或非 git 仓库（exit 128）：都视为无残留。
    return [];
  }
  return output
    .split("\n")
    .filter(Boolean)
    .map((file) => ({
      level: "error" as const,
      path: file,
      message: "旧配置路径残留，必须迁移到新布局（policies/private/examples）",
    }));
}

export interface FamilyShowResult {
  name: ConfigFamilyName;
  role: ConfigRole;
  private: boolean;
  configured: boolean;
  files: Array<{ path: string; exists: boolean; value: unknown }>;
  errors: string[];
}

/** 展示一族的有效配置；敏感字段一律脱敏。 */
export function showFamily(name: string, root: string = defaultRepoRoot()): FamilyShowResult {
  const family = familyByName(name);
  const files = familyInstances(family, root);
  const entries: FamilyShowResult["files"] = [];
  const errors: string[] = [];
  for (const path of files) {
    if (!existsSync(path)) {
      entries.push({ path, exists: false, value: undefined });
      continue;
    }
    try {
      entries.push({
        path,
        exists: true,
        value: projectForShow(family, family.loadFile(path, root)),
      });
    } catch (error) {
      const message = family.private
        ? `${family.name} 私密配置加载失败；请运行 kata config validate 获取本机诊断`
        : (error as Error).message;
      if (!errors.includes(message)) errors.push(message);
      entries.push({ path, exists: true, value: undefined });
    }
  }
  return {
    name: family.name,
    role: family.role,
    private: family.private,
    configured: files.some((path) => existsSync(path)),
    files: entries,
    errors,
  };
}

export interface FamilySummary {
  name: ConfigFamilyName;
  role: ConfigRole;
  private: boolean;
  docs: string;
  files: string[];
  instancesDir?: string;
  examples: string[];
}

export function listFamilies(): FamilySummary[] {
  return CONFIG_FAMILIES.map((family) => ({
    name: family.name,
    role: family.role,
    private: family.private,
    docs: family.docs,
    files: family.files,
    instancesDir: family.instancesDir,
    examples: [...new Set(family.templates.map((template) => template.example))],
  }));
}

// ─── README 生成区 ─────────────────────────────────────────────────────────

const DOCS_BEGIN = "<!-- BEGIN GENERATED -->";
const DOCS_END = "<!-- END GENERATED -->";

function tableRow(cells: string[]): string {
  return `| ${cells.join(" | ")} |`;
}

/** 由注册表派生 README 生成区内容。 */
export function renderConfigDocsSection(): string {
  const familyRows = CONFIG_FAMILIES.map((family) =>
    tableRow([
      `\`${family.name}\``,
      family.role,
      family.private ? "私密" : "跟踪",
      family.docs,
      family.templates.length > 0
        ? [...new Set(family.templates.map((template) => template.example))]
            .map((example) => `\`${example}\``)
            .join("<br>")
        : "—",
    ]),
  );
  // 私密族文件 ↔ 脱敏模板 对应表（由注册表派生，防手写区漂移）
  const privateFiles = CONFIG_FAMILIES.filter((family) => family.private).flatMap((family) =>
    family.templates.map((template) =>
      tableRow([`\`${template.target}\``, `\`${template.example}\``, family.docs]),
    ),
  );
  return [
    DOCS_BEGIN,
    "",
    "配置族一览（由 config 注册表派生，禁止手改）:",
    "",
    tableRow(["族", "职责", "私密性", "说明", "example 模板"]),
    tableRow(["---", "---", "---", "---", "---"]),
    ...familyRows,
    "",
    "私密配置与脱敏模板对应（由注册表派生，禁止手改）:",
    "",
    tableRow(["私密配置", "脱敏模板", "用途"]),
    tableRow(["---", "---", "---"]),
    ...privateFiles,
    "",
    DOCS_END,
  ].join("\n");
}

export function applyConfigDocs(
  readmePath: string,
  root: string = defaultRepoRoot(),
  options: { check?: boolean } = {},
): { ok: boolean; changed: boolean } {
  const path = resolve(root, readmePath);
  const current = readFileSync(path, "utf8");
  const generated = renderConfigDocsSection();
  const begin = current.indexOf(DOCS_BEGIN);
  const end = current.indexOf(DOCS_END);
  let next: string;
  if (begin === -1 || end === -1 || end <= begin) {
    next = `${current.trimEnd()}\n\n${generated}\n`;
  } else {
    next = `${current.slice(0, begin)}${generated}${current.slice(end + DOCS_END.length)}`;
  }
  const changed = next !== current;
  if (changed && !options.check) {
    writeFileSync(path, next);
  }
  return { ok: !changed, changed };
}
