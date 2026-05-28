import type { DtStackClientLike } from "../http/client";

export interface AssetsDatasource {
  readonly id: number;
  readonly dataSourceName?: string;
  readonly dtCenterSourceName?: string;
  readonly name?: string;
  readonly dtCenterSourceId?: number;
  readonly dataSourceType?: number;
}

export interface MetadataSource {
  readonly dataSourceId: number;
  readonly dataSourceName: string;
  readonly dataSourceType: number;
}

export interface MetadataDatasourceProfile {
  readonly id?: number;
  readonly name?: string;
  readonly typeId?: number;
}

export interface DataMapTable {
  readonly id?: number;
  readonly tableName: string;
  readonly dbName?: string;
  readonly dataSourceId?: number;
  readonly dataSourceType?: number;
}

export interface SyncedDb {
  readonly id: number;
  readonly dbName?: string;
  readonly name?: string;
}

export interface SyncedTable {
  readonly id?: number;
  readonly tableName: string;
}

export interface AddSyncTaskInput {
  readonly dataSourceId: number;
  readonly dataSourceType: number;
  readonly dbName: string;
  readonly tableNames: ReadonlyArray<string>;
}

interface AssetsPage<T> {
  readonly contentList?: T[];
  readonly records?: T[];
  readonly total?: number;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class AssetsApi {
  constructor(private readonly client: DtStackClientLike) {}

  async findImportedDatasource(name: string): Promise<AssetsDatasource | null> {
    const resp = await this.client.post<{ records: AssetsDatasource[] }>(
      "/dassets/v1/dataSource/pageQuery",
      { current: 1, size: 20, search: name },
    );
    if (resp.code !== 1 || !resp.data?.records) return null;
    return (
      resp.data.records.find((ds) =>
        (ds.dataSourceName ?? ds.name ?? "").toLowerCase().includes(name.toLowerCase()),
      ) ?? null
    );
  }

  async listUnusedDatasources(search: string): Promise<AssetsDatasource[]> {
    const resp = await this.client.post<AssetsDatasource[] | AssetsPage<AssetsDatasource>>(
      "/dassets/v1/dataSource/listUnusedCenterDataSource",
      {
        search,
        current: 1,
        size: 50,
      },
    );
    if (resp.code !== 1 || !resp.data) return [];
    if (Array.isArray(resp.data)) return resp.data;
    if (Array.isArray(resp.data.contentList)) return resp.data.contentList;
    if (Array.isArray(resp.data.records)) return resp.data.records;
    return [];
  }

  async importDatasource(centerSourceId: number): Promise<void> {
    try {
      await this.client.post("/dassets/v1/dataSource/checkSimilarDatasource", {
        dtCenterSourceIdList: [centerSourceId],
      });
    } catch {
      // checkSimilar may fail, non-blocking
    }

    const resp = await this.client.post<boolean>("/dassets/v1/dataSource/importDataSource", {
      dtCenterSourceIdList: [centerSourceId],
    });
    if (resp.code !== 1) {
      throw new Error(`Import datasource failed: ${resp.message ?? "unknown"}`);
    }
  }

  async findMetadataDatasource(
    name: string,
    profile?: MetadataDatasourceProfile,
  ): Promise<MetadataSource | null> {
    const resp = await this.client.post<MetadataSource[]>(
      "/dmetadata/v1/dataSource/listMetadataDataSource",
      { type: 0 },
    );
    if (resp.code !== 1) {
      throw new Error(
        `List metadata datasource failed: code=${resp.code} message=${resp.message ?? ""}`,
      );
    }
    if (!resp.data) return null;
    const exact = resp.data.find((ds) => {
      if (profile?.id !== undefined && ds.dataSourceId === profile.id) return true;
      if (profile?.name && ds.dataSourceName === profile.name) return true;
      return false;
    });
    if (exact) return exact;

    const profileName = profile?.name?.toLowerCase();
    const fallback = resp.data.find((ds) => {
      const dsName = ds.dataSourceName.toLowerCase();
      if (dsName.includes(name.toLowerCase())) return true;
      if (profileName && dsName.includes(profileName)) return true;
      if (profile?.typeId !== undefined && ds.dataSourceType === profile.typeId) return true;
      return false;
    });
    return fallback ?? null;
  }

  async queryDataMap(tableName: string): Promise<DataMapTable | null> {
    const resp = await this.client.post<AssetsPage<DataMapTable>>(
      "/dassets/v1/datamap/queryDetail",
      {
        current: 1,
        size: 10,
        metaType: 1,
        search: tableName,
        field: "hot",
        asc: false,
      },
    );
    if (resp.code !== 1 || !resp.data) return null;
    const records = resp.data.records ?? resp.data.contentList ?? [];
    return records.find((r) => r.tableName === tableName) ?? null;
  }

  async addSyncTask(input: AddSyncTaskInput): Promise<void> {
    if (input.tableNames.length === 0) return;
    const resp = await this.client.post("/dmetadata/v1/syncTask/add", {
      dataSourceId: String(input.dataSourceId),
      dataSourceType: input.dataSourceType,
      dbList: [input.dbName],
      tableList: input.tableNames.map((tableName) => ({
        dbName: input.dbName,
        tableName,
      })),
      syncFilterTermConfigDTO: {
        syncMetaContent: 0,
        pastConfiguration: 1,
      },
      taskType: 0,
    });
    if (resp.code !== 1) {
      throw new Error(`Add sync task failed: ${resp.message ?? "unknown"}`);
    }
  }

  async listSyncedDbs(dataSourceId: number): Promise<SyncedDb[]> {
    const resp = await this.client.post<SyncedDb[]>(
      "/dmetadata/v1/dataDb/listSyncedDbsByDataSourceId",
      { dataSourceId },
    );
    if (resp.code !== 1 || !resp.data) return [];
    return resp.data;
  }

  async listSyncedTables(dataSourceId: number, dbId: number): Promise<SyncedTable[]> {
    const resp = await this.client.post<{ records?: SyncedTable[] }>(
      "/dmetadata/v1/dataTable/listSyncTables",
      { current: 1, size: 200, dataSourceId, dbId },
    );
    if (resp.code !== 1 || !resp.data) return [];
    return resp.data.records ?? (resp.data as unknown as SyncedTable[]);
  }

  async pollSyncComplete(
    dataSourceId: number,
    expectedTables?: ReadonlyArray<string>,
    timeoutMs = 180_000,
  ): Promise<boolean> {
    if (expectedTables?.length === 0) return true;

    const pollInterval = 5_000;
    const startTime = Date.now();
    const remaining = new Set(expectedTables ?? []);

    while (Date.now() - startTime < timeoutMs) {
      const syncedTables = await this.listSyncedTables(dataSourceId, 0);
      for (const table of syncedTables) {
        remaining.delete(table.tableName);
      }
      if (remaining.size === 0) return true;

      const elapsed = Date.now() - startTime;
      if (elapsed >= timeoutMs) break;
      await sleep(Math.min(pollInterval, timeoutMs - elapsed));
    }

    const expected = expectedTables?.length ? expectedTables.join(", ") : "any synced table";
    throw new Error(`Metadata sync timed out after ${timeoutMs}ms while waiting for ${expected}.`);
  }

  async pollDataMapTables(
    tableNames: ReadonlyArray<string>,
    timeoutMs = 180_000,
  ): Promise<boolean> {
    if (tableNames.length === 0) return true;

    const pollInterval = 5_000;
    const startTime = Date.now();
    const remaining = new Set(tableNames);

    while (Date.now() - startTime < timeoutMs) {
      for (const name of [...remaining]) {
        const found = await this.queryDataMap(name);
        if (found) remaining.delete(name);
      }
      if (remaining.size === 0) return true;

      const elapsed = Date.now() - startTime;
      if (elapsed >= timeoutMs) break;
      await sleep(Math.min(pollInterval, timeoutMs - elapsed));
    }

    throw new Error(
      `Data map sync timed out after ${timeoutMs}ms. Missing tables: ${[...remaining].join(", ")}`,
    );
  }
}
