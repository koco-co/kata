import { waitForUiSettled } from "../../../../../../_shared/helpers/index";
import type { Page } from "@playwright/test";
import type { DtStackClientLike, DtStackResponse } from "dtstack-sdk";
import { setupPreconditions } from "../../../../../../_shared/helpers/preconditions";
import {
  applyRuntimeCookies,
  normalizeDataAssetsBaseUrl,
  uniqueName,
} from "../../../../../../_shared/helpers/test-setup";
import { getEnvConfig } from "../../../../../../_shared/runtime/env-profile";
import { loadPlaywrightAutomationConfig } from "../../../../../../../../lib/automation/playwright-config";
import {
  clearCurrentDatasource as clearLegacyDatasource,
  setCurrentDatasource as setLegacyDatasource,
} from "../../../../../v6.4.7/【v647】【数据质量】有效性多规则且或关系/automation/tests/fixtures/test-data";

// env profile 惰性解析：用例收集（discovery）阶段无 KATA_DATAASSETS_RESOLVED，顶层不得触 env
let envCache: ReturnType<typeof getEnvConfig> | undefined;
function envProfile(): ReturnType<typeof getEnvConfig> {
  return (envCache ??= getEnvConfig());
}

/** discovery 收集用例时 env 不可用，返回 undefined 让调用方退回默认展开；live 运行由 kata env run 注入 env */
function tryEnvProfile(): ReturnType<typeof getEnvConfig> | undefined {
  try {
    return envProfile();
  } catch {
    return undefined;
  }
}

export interface DatasourceConfig {
  readonly id: "sparkthrift2.x" | "doris3.x";
  readonly cacheKey: "sparkthrift2_x" | "doris3_x";
  readonly reportName: "sparkthrift2.x" | "doris";
  readonly preconditionType: "SparkThrift" | "Doris";
  readonly optionPattern: RegExp;
  readonly sourceTypePattern: RegExp;
  readonly database: string;
  readonly metadataDataSourceId: number;
  readonly metadataDataSourceType: number;
  readonly primaryFieldType: "string" | "json";
}

type DatasourceSqlMap = Readonly<Record<DatasourceConfig["id"], string>>;

type TableDefinition = {
  readonly name: string;
  readonly sqlByDatasource: DatasourceSqlMap;
};

const PRECONDITION_REQUEST_TIMEOUT_MS =
  loadPlaywrightAutomationConfig().preconditionRequestTimeoutMs;
const PRECONDITION_RETRYABLE_HTTP_STATUS = new Set([502, 503, 504]);
const sleep = (ms: number) => new Promise((resolveSleep) => setTimeout(resolveSleep, ms));

function buildApiUrl(path: string): string {
  if (/^https?:\/\//.test(path)) {
    return path;
  }
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return new URL(normalizedPath, new URL(normalizeDataAssetsBaseUrl()).origin).toString();
}

function isRetryableRequestError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return (
    /Timeout \d+ms exceeded/.test(message) ||
    /apiRequestContext\.post/.test(message) ||
    /net::ERR_/.test(message) ||
    /ETIMEDOUT/.test(message)
  );
}

function createPreconditionClient(page: Page): DtStackClientLike {
  const post = async <T = unknown>(
    path: string,
    data?: unknown,
    extraHeaders?: Record<string, string>,
  ): Promise<DtStackResponse<T>> => {
    const url = buildApiUrl(path);
    let lastError: Error | null = null;
    for (let attempt = 1; attempt <= 4; attempt += 1) {
      try {
        const response = await page.context().request.post(url, {
          data,
          failOnStatusCode: false,
          headers: {
            "content-type": "application/json;charset=UTF-8",
            "Accept-Language": "zh-CN",
            ...extraHeaders,
          },
          timeout: PRECONDITION_REQUEST_TIMEOUT_MS,
        });
        const text = await response.text();
        if (response.ok()) {
          return text.trim()
            ? (JSON.parse(text) as DtStackResponse<T>)
            : ({} as DtStackResponse<T>);
        }
        lastError = new Error(`HTTP ${response.status()} ${response.statusText()}: ${text}`);
        if (!PRECONDITION_RETRYABLE_HTTP_STATUS.has(response.status()) || attempt === 4) {
          throw lastError;
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        if (!isRetryableRequestError(error) || attempt === 4) {
          throw lastError;
        }
      }
      await sleep(2000 * attempt);
    }
    throw lastError ?? new Error(`request failed: ${url}`);
  };

  return {
    post,
    postWithProjectId: <T = unknown>(path: string, data: unknown, projectId: number) =>
      post<T>(path, data, { "X-Project-Id": String(projectId) }),
  };
}

// 表名使用 MD 用例中的表名作为 uniqueName 前缀，确保代码与归档用例可交叉引用。
// 前缀 = MD 概念表名（如 test_json_key_range），后缀 = 时间戳（保证 worker 隔离）。
// platform "规则名称" 字段限 50 字符，前缀+时间戳需控制在 36 字符内。
export const MAIN_TABLE_NAME = uniqueName("test_json_key_range");
export const METHOD_SWITCH_TABLE_NAME = uniqueName("test_json_key_range_ms");
export const PASS_TABLE_NAME = uniqueName("test_json_key_range_pass");
export const NOT_INCLUDE_TABLE_NAME = uniqueName("test_json_key_range_ni");

// JSON keys 使用 MD 用例中的 key 名作为前缀（key1/key2/key11/key22 等），
// 加时间戳唯一化防止跨 suite 干扰，同时便于关联 MD 用例。
export const KEY_NAMES = {
  k1: uniqueName("key1"),
  k2: uniqueName("key2"),
  k3: uniqueName("key3"),
  k11: uniqueName("key11"),
  k22: uniqueName("key22"),
  k33: uniqueName("key33"),
  kDeletedRef: uniqueName("keyDel"),
} as const;

const TEST_JSON_KEY_RANGE_SQL: DatasourceSqlMap = {
  // 用 CTAS（CREATE TABLE AS SELECT）替代 CREATE + INSERT——
  // 平台 customSQL endpoint 拒绝 INSERT（code 11），但 DDL endpoint 接受 CTAS。
  // 参考：${kata}/workspace/dataAssets/tests/202604/【内置规则丰富】有效性,json中key对应的value值格式校验/json-fixture-sql.ts
  "sparkthrift2.x": `
DROP TABLE IF EXISTS ${MAIN_TABLE_NAME};
CREATE TABLE ${MAIN_TABLE_NAME} STORED AS PARQUET AS
SELECT 1 AS id, '{"${KEY_NAMES.k1}":"张三","${KEY_NAMES.k2}":25,"${KEY_NAMES.k11}":"广东","${KEY_NAMES.k22}":"深圳"}' AS info, '{"${KEY_NAMES.k1}":"张三","${KEY_NAMES.k2}":"ok"}' AS extra_info, 25 AS age, CAST('2026-04-01' AS DATE) AS create_date, CAST(1001 AS BIGINT) AS user_id
UNION ALL
SELECT 2, '{"${KEY_NAMES.k1}":"李四"}', '{"${KEY_NAMES.k1}":"李四"}', 30, CAST('2026-04-02' AS DATE), 1002
UNION ALL
SELECT 3, '{"${KEY_NAMES.k2}":30,"${KEY_NAMES.k11}":"北京","${KEY_NAMES.k22}":"朝阳"}', '{"${KEY_NAMES.k2}":30}', 40, CAST('2026-04-03' AS DATE), 1003;
`.trim(),
  "doris3.x": `
DROP TABLE IF EXISTS ${MAIN_TABLE_NAME};
CREATE TABLE ${MAIN_TABLE_NAME} (
  id INT,
  info JSON,
  extra_info VARCHAR(500),
  age INT,
  create_date DATE,
  user_id BIGINT
) DISTRIBUTED BY HASH(id) BUCKETS 3 PROPERTIES("replication_num"="1");
INSERT INTO ${MAIN_TABLE_NAME} VALUES
  (1, '{"${KEY_NAMES.k1}":"张三","${KEY_NAMES.k2}":25,"${KEY_NAMES.k11}":"广东","${KEY_NAMES.k22}":"深圳"}', '{"${KEY_NAMES.k1}":"张三","${KEY_NAMES.k2}":"ok"}', 25, '2026-04-01', 1001),
  (2, '{"${KEY_NAMES.k1}":"李四"}', '{"${KEY_NAMES.k1}":"李四"}', 30, '2026-04-02', 1002),
  (3, '{"${KEY_NAMES.k2}":30,"${KEY_NAMES.k11}":"北京","${KEY_NAMES.k22}":"朝阳"}', '{"${KEY_NAMES.k2}":30}', 40, '2026-04-03', 1003);
`.trim(),
};

const TEST_JSON_METHOD_SWITCH_SQL: DatasourceSqlMap = {
  "sparkthrift2.x": `
DROP TABLE IF EXISTS ${METHOD_SWITCH_TABLE_NAME};
CREATE TABLE ${METHOD_SWITCH_TABLE_NAME} STORED AS PARQUET AS
SELECT 1 AS id, '{"${KEY_NAMES.k1}":"张三","${KEY_NAMES.k2}":25}' AS info
UNION ALL
SELECT 2, '{"${KEY_NAMES.k1}":"李四"}';
`.trim(),
  "doris3.x": `
DROP TABLE IF EXISTS ${METHOD_SWITCH_TABLE_NAME};
CREATE TABLE ${METHOD_SWITCH_TABLE_NAME} (
  id INT,
  info JSON
) DISTRIBUTED BY HASH(id) BUCKETS 3 PROPERTIES("replication_num"="1");
INSERT INTO ${METHOD_SWITCH_TABLE_NAME} VALUES
  (1, '{"${KEY_NAMES.k1}":"张三","${KEY_NAMES.k2}":25}'),
  (2, '{"${KEY_NAMES.k1}":"李四"}');
`.trim(),
};

const TEST_JSON_KEY_RANGE_PASS_SQL: DatasourceSqlMap = {
  "sparkthrift2.x": `
DROP TABLE IF EXISTS ${PASS_TABLE_NAME};
CREATE TABLE ${PASS_TABLE_NAME} STORED AS PARQUET AS
SELECT 20 AS id, '{"${KEY_NAMES.k1}":"赵六","${KEY_NAMES.k2}":35}' AS info, '{"${KEY_NAMES.k1}":"赵六","${KEY_NAMES.k2}":"ok"}' AS extra_info;
`.trim(),
  "doris3.x": `
DROP TABLE IF EXISTS ${PASS_TABLE_NAME};
CREATE TABLE ${PASS_TABLE_NAME} (
  id INT,
  info JSON,
  extra_info VARCHAR(500)
) DISTRIBUTED BY HASH(id) BUCKETS 3 PROPERTIES("replication_num"="1");
INSERT INTO ${PASS_TABLE_NAME} VALUES
  (20, '{"${KEY_NAMES.k1}":"赵六","${KEY_NAMES.k2}":35}', '{"${KEY_NAMES.k1}":"赵六","${KEY_NAMES.k2}":"ok"}');
`.trim(),
};

const TEST_JSON_NOT_INCLUDE_SQL: DatasourceSqlMap = {
  "sparkthrift2.x": `
DROP TABLE IF EXISTS ${NOT_INCLUDE_TABLE_NAME};
CREATE TABLE ${NOT_INCLUDE_TABLE_NAME} STORED AS PARQUET AS
SELECT 31 AS id, '{"${KEY_NAMES.k3}":"通过"}' AS info
UNION ALL
SELECT 32, '{"${KEY_NAMES.k1}":"命中","${KEY_NAMES.k2}":"命中"}';
`.trim(),
  "doris3.x": `
DROP TABLE IF EXISTS ${NOT_INCLUDE_TABLE_NAME};
CREATE TABLE ${NOT_INCLUDE_TABLE_NAME} (
  id INT,
  info JSON
) DISTRIBUTED BY HASH(id) BUCKETS 3 PROPERTIES("replication_num"="1");
INSERT INTO ${NOT_INCLUDE_TABLE_NAME} VALUES
  (31, '{"${KEY_NAMES.k3}":"通过"}'),
  (32, '{"${KEY_NAMES.k1}":"命中","${KEY_NAMES.k2}":"命中"}');
`.trim(),
};

const TABLE_DEFINITIONS: readonly TableDefinition[] = [
  { name: MAIN_TABLE_NAME, sqlByDatasource: TEST_JSON_KEY_RANGE_SQL },
  { name: METHOD_SWITCH_TABLE_NAME, sqlByDatasource: TEST_JSON_METHOD_SWITCH_SQL },
  { name: PASS_TABLE_NAME, sqlByDatasource: TEST_JSON_KEY_RANGE_PASS_SQL },
  { name: NOT_INCLUDE_TABLE_NAME, sqlByDatasource: TEST_JSON_NOT_INCLUDE_SQL },
] as const;

const DEFAULT_DATASOURCES: readonly DatasourceConfig[] = [
  {
    id: "sparkthrift2.x",
    cacheKey: "sparkthrift2_x",
    reportName: "sparkthrift2.x",
    preconditionType: "SparkThrift",
    optionPattern: /(sparkthrift|hadoop)/i,
    sourceTypePattern: /sparkthrift/i,
    // env 派生字段用 getter 惰性求值：收集（discovery）阶段构造本数组时不得触 env
    get database() {
      return envProfile().datasources.sparkthrift.sql.database;
    },
    get metadataDataSourceId() {
      return envProfile().datasources.sparkthrift.metadata.id;
    },
    get metadataDataSourceType() {
      return envProfile().datasources.sparkthrift.metadata.typeId;
    },
    primaryFieldType: "string",
  },
  {
    id: "doris3.x",
    cacheKey: "doris3_x",
    reportName: "doris",
    preconditionType: "Doris",
    optionPattern: /doris/i,
    sourceTypePattern: /doris/i,
    get database() {
      return envProfile().datasources.doris.sql.database;
    },
    get metadataDataSourceId() {
      return envProfile().datasources.doris.metadata.id;
    },
    get metadataDataSourceType() {
      return envProfile().datasources.doris.metadata.typeId;
    },
    primaryFieldType: "json",
  },
];

const DATASOURCE_BY_ID = new Map(DEFAULT_DATASOURCES.map((item) => [item.id, item] as const));
const DEFAULT_ACTIVE_DATASOURCE_IDS: readonly DatasourceConfig["id"][] = ["sparkthrift2.x"];

/** Map from env-profile datasource keys to internal DatasourceConfig ids */
const PROFILE_KEY_TO_DATASOURCE_ID: Record<string, DatasourceConfig["id"]> = {
  sparkthrift: "sparkthrift2.x",
  doris: "doris3.x",
};

function loadActiveDatasources(): readonly DatasourceConfig[] {
  const activeProfileKeys = tryEnvProfile()?.runtime.activeDatasources ?? [];
  if (activeProfileKeys.length === 0) {
    return DEFAULT_ACTIVE_DATASOURCE_IDS.map((id) => DATASOURCE_BY_ID.get(id)!);
  }
  return activeProfileKeys.map((key) => {
    const configId = PROFILE_KEY_TO_DATASOURCE_ID[key];
    const config = configId ? DATASOURCE_BY_ID.get(configId) : undefined;
    if (!config) {
      throw new Error(`Unsupported activeDatasources key: ${key}`);
    }
    return config;
  });
}

export const ACTIVE_DATASOURCES = loadActiveDatasources();
export const ALL_TABLES = TABLE_DEFINITIONS.map((table) => table.name) as readonly string[];
// env 派生标量改为惰性函数导出：收集期不触 env，调用点在运行时执行（live 时 env 已由 kata env run 注入）
export const QUALITY_PROJECT_ID = (): number => envProfile().projects.quality.id;
export const QUALITY_PROJECT_NAME = (): string => envProfile().projects.quality.name;
export const TARGET_ENV = (): string => envProfile().env;
export const SUITE_KEYS = [
  KEY_NAMES.k1,
  KEY_NAMES.k2,
  KEY_NAMES.k3,
  KEY_NAMES.k11,
  KEY_NAMES.k22,
  KEY_NAMES.k33,
] as const;

let currentDatasource = ACTIVE_DATASOURCES[0] ?? DEFAULT_DATASOURCES[0];
// 初始化时同步 legacy datasource，确保 rule-editor-helpers 的 getCurrentDatasource 返回相同值
setLegacyDatasource(currentDatasource as never);

export function setCurrentDatasource(datasource: DatasourceConfig): void {
  currentDatasource = datasource;
  setLegacyDatasource(datasource as never);
}

export function clearCurrentDatasource(): void {
  currentDatasource = ACTIVE_DATASOURCES[0] ?? DEFAULT_DATASOURCES[0];
  clearLegacyDatasource();
  setLegacyDatasource(currentDatasource as never);
}

export function getCurrentDatasource(): DatasourceConfig {
  return currentDatasource;
}

export function resolveVariantName(baseName: string, datasource = getCurrentDatasource()): string {
  return `${baseName}_${datasource.cacheKey}`;
}

// 惰性求值：收集期不触 env（见 QUALITY_PROJECT_NAME 注释）
function batchProjectCandidates(): string[] {
  const qualityProjectName = QUALITY_PROJECT_NAME();
  return [qualityProjectName, qualityProjectName.replace(/_test$/, "")].filter(
    (value, index, array) => value && array.indexOf(value) === index,
  );
}
const preconditionsReady = new Set<string>();

export async function runPreconditions(
  page: Page,
  datasource = getCurrentDatasource(),
): Promise<void> {
  if (loadPlaywrightAutomationConfig().skipPreconditionSetup) {
    return;
  }
  if (preconditionsReady.has(datasource.cacheKey)) {
    return;
  }
  await applyRuntimeCookies(page);

  process.stderr.write(`[preconditions] Preparing ${datasource.reportName} tables...\n`);

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    let lastAttemptError: Error | null = null;
    for (const candidateProjectName of batchProjectCandidates()) {
      try {
        await setupPreconditions({
          client: createPreconditionClient(page),
          project: candidateProjectName,
          datasource: datasource.preconditionType,
          tables: TABLE_DEFINITIONS.map((table) => ({
            name: table.name,
            sql: table.sqlByDatasource[datasource.id],
          })),
          syncTimeoutMs: 300_000,
        });
        process.stderr.write(
          `[preconditions] ${datasource.reportName} preconditions complete (project="${candidateProjectName}").\n`,
        );
        preconditionsReady.add(datasource.cacheKey);
        return;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        // CLAUDE.md「测试数据唯一性」硬规则：sync 超时不再静默 return——
        // 表没建出来 UI 就会跑残留旧表，必须抛错让用例真实失败。
        if (message.includes("Metadata sync timed out")) {
          throw new Error(
            `[preconditions] ${datasource.reportName} metadata sync timed out (project="${candidateProjectName}"). ` +
              `Cannot continue with potentially stale tables. Original error: ${message}`,
          );
        }
        const retryableError =
          /HTTP (402|502|503|504)\b/.test(message) ||
          /Timeout \d+ms exceeded/.test(message) ||
          /sync timed out/i.test(message) ||
          /net::ERR_/.test(message) ||
          /ETIMEDOUT/.test(message) ||
          /not found in offline development/.test(message) ||
          /Datasource type .* not found in project/.test(message) ||
          /项目标识在当前集群下已存在/.test(message);
        if (!retryableError) {
          throw error;
        }
        lastAttemptError = error instanceof Error ? error : new Error(message);
        process.stderr.write(
          `[preconditions] ${datasource.reportName} project="${candidateProjectName}" hit error: ${message.slice(0, 1000)}\n`,
        );
      }
    }
    if (attempt === 3) {
      throw new Error(
        `[preconditions] ${datasource.reportName} setup failed after 3 attempts. ` +
          `Cannot continue with potentially stale tables. Last error: ${lastAttemptError?.message ?? "unknown"}`,
      );
    }
    process.stderr.write(
      `[preconditions] ${datasource.reportName} hit transient error, retrying setup (${attempt}/3)...\n`,
    );
    await waitForUiSettled(page);
  }
}

export async function injectProjectContext(page: Page, projectId: number): Promise<void> {
  await page.evaluate((pid) => {
    sessionStorage.setItem("X-Valid-Project-ID", String(pid));
  }, projectId);
}

let cachedEffectiveQualityProjectId: number | null = null;

export async function resolveEffectiveQualityProjectId(page: Page): Promise<number> {
  if (cachedEffectiveQualityProjectId !== null) {
    return cachedEffectiveQualityProjectId;
  }

  try {
    const baseUrl = normalizeDataAssetsBaseUrl();
    const requestUrl = new URL("/dassets/v1/valid/project/getProjects", baseUrl).toString();

    const response = await page.context().request.post(requestUrl, {
      data: {},
      headers: {
        "content-type": "application/json;charset=UTF-8",
        "Accept-Language": "zh-CN",
      },
      timeout: 15_000,
    });

    if (response.ok()) {
      const text = await response.text();
      if (text.trim()) {
        const json = JSON.parse(text) as {
          data?: Array<{ id?: number | string; name?: string; projectName?: string }>;
        };
        const projects = json.data ?? [];
        const namedProject = projects.find((project) =>
          (project.name ?? project.projectName ?? "")
            .toLowerCase()
            .includes(QUALITY_PROJECT_NAME().toLowerCase()),
        );
        const resolvedId = namedProject?.id
          ? Number(namedProject.id)
          : projects[0]?.id
            ? Number(projects[0].id)
            : null;

        if (resolvedId !== null && Number.isFinite(resolvedId)) {
          cachedEffectiveQualityProjectId = resolvedId;
          return cachedEffectiveQualityProjectId;
        }
      }
    }
  } catch {
    // ignore and fall back to hardcoded id
  }

  cachedEffectiveQualityProjectId = QUALITY_PROJECT_ID();
  return cachedEffectiveQualityProjectId;
}
