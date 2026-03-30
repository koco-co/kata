import { readFileSync } from "node:fs";
import { parse } from "yaml";
import type { DtStackClientLike } from "../core/http/client";
import { AssetsApi } from "../core/platform/assets";
import { BatchApi, resolveSchemaName } from "../core/platform/batch";
import { ProjectApi } from "../core/platform/project";

export interface PrecondTable {
  readonly name: string;
  readonly sql: string;
}

export interface PrecondDatasourceProfile {
  readonly id?: number;
  readonly name?: string;
  readonly typeId?: number;
  readonly aliases?: readonly string[];
  readonly database?: string;
  readonly schema?: string;
  readonly metadata?: { readonly id?: number; readonly name?: string; readonly typeId?: number };
  readonly assets?: { readonly id?: number; readonly name?: string };
}

export interface PrecondSetupOptions {
  readonly client: DtStackClientLike;
  readonly project: string;
  readonly projectId?: number;
  readonly datasource: string;
  readonly datasourceProfile?: PrecondDatasourceProfile;
  readonly database?: string;
  readonly tables?: ReadonlyArray<PrecondTable>;
  readonly tablesFromFile?: string;
  readonly skipSync?: boolean;
  /**
   * 数据地图同步轮询超时，单位**毫秒**。默认 180_000（3 分钟）。
   * 历史 syncTimeout 字段单位曾被误用为秒，统一改名 syncTimeoutMs 强调单位。
   */
  readonly syncTimeoutMs?: number;
  readonly autoCreate?: boolean;
}

export interface PrecondSetupResult {
  readonly projectId: number;
  readonly projectName: string;
  readonly datasourceId: number;
  readonly tablesCreated: ReadonlyArray<string>;
  readonly syncComplete: boolean;
}

function loadTablesFromFile(file: string): ReadonlyArray<PrecondTable> {
  const raw = parse(readFileSync(file, "utf-8")) as { tables?: PrecondTable[] };
  if (!raw.tables) throw new Error(`${file} missing 'tables' top-level key`);
  return raw.tables;
}

function log(msg: string): void {
  process.stderr.write(`[precond] ${msg}\n`);
}

export async function precondSetup(opts: PrecondSetupOptions): Promise<PrecondSetupResult> {
  const tables =
    opts.tables ?? (opts.tablesFromFile ? loadTablesFromFile(opts.tablesFromFile) : []);
  if (tables.length === 0) {
    throw new Error("no tables provided (use 'tables' or 'tablesFromFile')");
  }

  const projects = new ProjectApi(opts.client);
  const batch = new BatchApi(opts.client);
  const assets = new AssetsApi(opts.client);

  log(`ensure project: ${opts.project}`);
  let project;
  if (opts.projectId) {
    // 直接通过项目 ID 查找
    const allProjects = await projects.list();
    log(`available projects: ${allProjects.map((p) => `${p.id}:${p.projectName}`).join(", ")}`);
    project = allProjects.find((p) => p.id === opts.projectId) ?? null;
    if (!project) {
      throw new Error(`project with ID ${opts.projectId} not found`);
    }
  } else {
    project =
      opts.autoCreate !== false
        ? await projects.ensureProject({ name: opts.project })
        : ((await projects.findByName(opts.project)) ??
          (() => {
            throw new Error(`project not found: ${opts.project}`);
          })());
  }

  log(`find datasource: ${opts.datasource}`);
  const ds = await batch.getProjectDatasource(project.id, opts.datasource, opts.datasourceProfile);
  if (!ds) {
    throw new Error(`datasource ${opts.datasource} not found in project ${opts.project}`);
  }

  const tablesCreated: string[] = [];
  for (const t of tables) {
    log(`DDL: ${t.name}`);
    await batch.executeDDL(project.id, ds, t.sql);
    tablesCreated.push(t.name);
  }

  if (opts.skipSync) {
    return {
      projectId: project.id,
      projectName: project.projectName,
      datasourceId: ds.id,
      tablesCreated,
      syncComplete: false,
    };
  }

  log("import datasource if needed");
  const imported = await assets.findImportedDatasource(ds.dataName);
  if (!imported) {
    const candidates = await assets.listUnusedDatasources(ds.dataName);
    const target = candidates.find((c) =>
      (c.dtCenterSourceName ?? c.dataSourceName ?? c.name ?? "")
        .toLowerCase()
        .includes(ds.dataName.toLowerCase()),
    );
    if (target) {
      await assets.importDatasource(target.dtCenterSourceId ?? target.id);
    }
  }

  log("check tables in data map");
  const expected = tables.map((t) => t.name);
  const missing: string[] = [];
  for (const name of expected) {
    const found = await assets.queryDataMap(name);
    if (!found) missing.push(name);
  }

  if (missing.length === 0) {
    log("all tables already visible in data map");
    return {
      projectId: project.id,
      projectName: project.projectName,
      datasourceId: ds.id,
      tablesCreated,
      syncComplete: true,
    };
  }

  log(`missing in data map, will sync: ${missing.join(", ")}`);
  const metaSrc = await assets.findMetadataDatasource(ds.dataName);
  if (!metaSrc) {
    throw new Error(`metadata datasource not found for ${ds.dataName}; cannot trigger sync`);
  }

  const dbName = opts.database ?? opts.datasourceProfile?.database ?? resolveSchemaName(ds);
  if (!dbName) {
    throw new Error(
      `cannot resolve schemaName for datasource ${ds.dataName}; sync task requires dbName`,
    );
  }

  await assets.addSyncTask({
    dataSourceId: metaSrc.dataSourceId,
    dataSourceType: metaSrc.dataSourceType,
    dbName,
    tableNames: missing,
  });

  log(`wait for tables to appear in data map`);
  const syncComplete = await assets.pollDataMapTables(missing, opts.syncTimeoutMs ?? 180_000);

  return {
    projectId: project.id,
    projectName: project.projectName,
    datasourceId: ds.id,
    tablesCreated,
    syncComplete,
  };
}
