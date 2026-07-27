import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadDataAssetsEnvProfile } from "../../../../../../_shared/runtime/env-profile";

const preparedPreconditionGroups = new Set<string>();

type SparkThriftPreconditionProfile = {
  env: string;
  cookie: string;
  baseUrl: string;
  projectId: number;
  projectName: string;
  datasourceId: number;
  datasourceName: string;
  datasourceTypeId: number;
  datasourceAliases: readonly string[];
  metadataDatasourceId?: number;
  metadataDatasourceName?: string;
  metadataDatasourceTypeId?: number;
  database: string;
  schema: string;
  preconditionType: string;
};

type PrecondTableFixture = {
  name: string;
  sql: string;
};

export function ensureDtstackPreconditionFile(
  groupKey: string,
  tablesFile: string,
  sourceRef: string,
): void {
  if (process.env.KATA_DQ_SKIP_PRECONDITIONS === "1") return;
  if (preparedPreconditionGroups.has(groupKey)) return;

  runDtstackPreconditionSetup(tablesFile, sourceRef);
  preparedPreconditionGroups.add(groupKey);
}

export function ensureSelectedDtstackPreconditionTables(
  groupKey: string,
  tablesFile: string,
  tableNames: readonly string[],
  sourceRef: string,
): void {
  if (process.env.KATA_DQ_SKIP_PRECONDITIONS === "1") return;
  if (preparedPreconditionGroups.has(groupKey)) return;

  const allTables = parsePreconditionTables(readFileSync(tablesFile, "utf8"));
  const selectedTables = tableNames.map((tableName) => {
    const table = allTables.find((item) => item.name === tableName);
    if (!table) {
      throw new Error(`${sourceRef}: 前置表 fixture 缺少 ${tableName}`);
    }
    return table;
  });

  const tempDir = mkdtempSync(join(tmpdir(), "lt-dq-precond-"));
  const tempFile = join(tempDir, "tables.yaml");
  writeFileSync(tempFile, serializePreconditionTables(selectedTables));
  try {
    runDtstackPreconditionSetup(tempFile, sourceRef);
    preparedPreconditionGroups.add(groupKey);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

function parsePreconditionTables(content: string): PrecondTableFixture[] {
  const tables: PrecondTableFixture[] = [];
  let current: PrecondTableFixture | null = null;
  let inSqlBlock = false;

  for (const line of content.split(/\r?\n/)) {
    const tableMatch = line.match(/^  - name: (.+)$/);
    if (tableMatch) {
      if (current) tables.push(current);
      current = { name: tableMatch[1].trim(), sql: "" };
      inSqlBlock = false;
      continue;
    }

    if (!current) continue;
    if (/^    sql: \|$/.test(line)) {
      inSqlBlock = true;
      continue;
    }
    if (!inSqlBlock) continue;

    const sqlLine = line.startsWith("      ") ? line.slice(6) : line.trim() === "" ? "" : line;
    current.sql += `${sqlLine}\n`;
  }

  if (current) tables.push(current);
  return tables.map((table) => ({ ...table, sql: table.sql.trimEnd() }));
}

function serializePreconditionTables(tables: readonly PrecondTableFixture[]): string {
  const chunks = ["tables:"];
  for (const table of tables) {
    chunks.push(`  - name: ${table.name}`, "    sql: |");
    for (const line of table.sql.split("\n")) {
      chunks.push(`      ${line}`);
    }
  }
  return `${chunks.join("\n")}\n`;
}

function loadSparkThriftPreconditionProfile(): SparkThriftPreconditionProfile {
  const profile = loadDataAssetsEnvProfile();
  const datasource =
    Object.values(profile.datasources).find(
      (item) => item.preconditionType.toLowerCase() === "sparkthrift",
    ) ?? profile.datasources.sparkthrift;
  if (!datasource) {
    throw new Error(`${profile.env}: 未配置 SparkThrift 前置数据源`);
  }
  const batch = datasource.batch;
  if (!batch) {
    throw new Error(`${profile.env}: SparkThrift 前置数据源缺少 batch 配置`);
  }
  const projectName = profile.auth.tenantName ?? profile.projects.offline.name;
  const projectId =
    projectName === profile.projects.quality.name
      ? profile.projects.quality.id
      : profile.projects.offline.id;
  return {
    env: profile.env,
    cookie: profile.auth.cookie,
    baseUrl: profile.urls.baseUrl,
    projectId,
    projectName,
    datasourceId: batch.id,
    datasourceName: batch.name,
    datasourceTypeId: batch.typeId,
    datasourceAliases: datasource.aliases,
    metadataDatasourceId: datasource.metadata?.id,
    metadataDatasourceName: datasource.metadata?.name,
    metadataDatasourceTypeId: datasource.metadata?.typeId,
    database: batch.database ?? datasource.sql.database,
    schema: batch.schema ?? datasource.sql.schema,
    preconditionType: datasource.preconditionType,
  };
}

function runDtstackPreconditionSetup(tablesFile: string, sourceRef: string): void {
  const preconditionProfile = loadSparkThriftPreconditionProfile();
  const cookie = preconditionProfile.cookie.trim();
  if (!cookie) {
    throw new Error(
      `${sourceRef}: Cookie 缺失，请通过 kata env cookie set ${preconditionProfile.env} --stdin 更新`,
    );
  }
  assertCookieFresh(cookie, preconditionProfile.env, sourceRef);

  const localBin = "./node_modules/.bin/dtstack-cli";
  const command = existsSync(localBin) ? localBin : "bun";
  const args = [
    ...(existsSync(localBin) ? [] : ["cli/integrations/dtstack/src/cli.ts"]),
    "precond",
    "setup",
    "--env",
    "ltqc",
    "--project",
    preconditionProfile.projectName,
    "--project-id",
    String(preconditionProfile.projectId),
    "--datasource",
    preconditionProfile.preconditionType,
    "--datasource-id",
    String(preconditionProfile.datasourceId),
    "--datasource-name",
    preconditionProfile.datasourceName,
    "--datasource-type-id",
    String(preconditionProfile.datasourceTypeId),
    "--datasource-aliases",
    preconditionProfile.datasourceAliases.join(","),
    ...(preconditionProfile.metadataDatasourceId
      ? ["--metadata-datasource-id", String(preconditionProfile.metadataDatasourceId)]
      : []),
    ...(preconditionProfile.metadataDatasourceName
      ? ["--metadata-datasource-name", preconditionProfile.metadataDatasourceName]
      : []),
    ...(preconditionProfile.metadataDatasourceTypeId
      ? ["--metadata-datasource-type-id", String(preconditionProfile.metadataDatasourceTypeId)]
      : []),
    "--database",
    preconditionProfile.database,
    "--schema",
    preconditionProfile.schema,
    "--tables-from",
    tablesFile,
    "--sync-timeout",
    process.env.KATA_DQ_PRECOND_SYNC_TIMEOUT_SEC ?? "300",
  ];

  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    env: {
      ...process.env,
      DTSTACK_COOKIE: cookie,
      LTQC_BASE_URL: preconditionProfile.baseUrl,
    },
    encoding: "utf8",
    timeout: Number(process.env.KATA_DQ_PRECOND_TIMEOUT_MS ?? 1_800_000),
  });

  if (result.status !== 0) {
    throw new Error(
      [
        `${sourceRef}: dtstack-cli precond setup 失败，exit=${result.status ?? "null"}, signal=${result.signal ?? "none"}`,
        `stdout=${result.stdout.trim()}`,
        `stderr=${result.stderr.trim()}`,
        result.error ? `error=${result.error.message}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
    );
  }
}

function assertCookieFresh(cookie: string, env: string, sourceRef: string): void {
  const token = cookie
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith("dt_token="))
    ?.slice("dt_token=".length);
  if (!token) return;

  const payload = parseJwtPayload(token);
  if (!payload?.exp) return;

  const expiresAtMs = payload.exp * 1000;
  if (Date.now() < expiresAtMs) return;

  throw new Error(
    [
      `${sourceRef}: Cookie 已过期，请通过 kata env cookie set ${env} --stdin 更新`,
      `dt_token exp=${formatShanghaiTime(expiresAtMs)}`,
      `now=${formatShanghaiTime(Date.now())}`,
    ].join("\n"),
  );
}

function parseJwtPayload(token: string): { exp?: number } | null {
  const payload = token.split(".")[1];
  if (!payload) return null;
  try {
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    return JSON.parse(Buffer.from(padded, "base64").toString("utf8")) as { exp?: number };
  } catch {
    return null;
  }
}

function formatShanghaiTime(ms: number): string {
  return `${new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date(ms))} CST`;
}
