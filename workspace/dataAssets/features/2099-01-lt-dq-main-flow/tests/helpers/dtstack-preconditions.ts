import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const DEFAULT_SESSION_PATH = "workspace/dataAssets/.kata/auth/dataAssets/session-ltqc-local.json";
const DEFAULT_LTQC_BASE_URL = "http://shuzhan63-test-ltqc.k8s.dtstack.cn";
const preparedPreconditionGroups = new Set<string>();

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

function runDtstackPreconditionSetup(tablesFile: string, sourceRef: string): void {
  const sessionPath = process.env.UI_AUTOTEST_SESSION_PATH ?? DEFAULT_SESSION_PATH;
  const state = JSON.parse(readFileSync(sessionPath, "utf8")) as {
    cookies?: Array<{ name: string; value: string }>;
  };
  const cookie = (state.cookies ?? []).map((item) => `${item.name}=${item.value}`).join("; ");
  if (!cookie) {
    throw new Error(`${sourceRef}: 无法从 ${sessionPath} 读取 dtstack-cli 所需 cookie`);
  }

  const localBin = "./node_modules/.bin/dtstack-cli";
  const command = existsSync(localBin) ? localBin : "bun";
  const args = [
    ...(existsSync(localBin) ? [] : ["tools/dtstack-sdk/src/cli.ts"]),
    "precond",
    "setup",
    "--env",
    "ltqc",
    "--project",
    "pw_test",
    "--datasource",
    "SparkThrift",
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
      LTQC_BASE_URL: process.env.LTQC_BASE_URL ?? DEFAULT_LTQC_BASE_URL,
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
