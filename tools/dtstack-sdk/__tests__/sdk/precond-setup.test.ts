import { describe, expect, mock, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { DtStackClientLike } from "../../src/core/http/client";
import { precondSetup } from "../../src/sdk/precond-setup";

function makeClient(routes: Record<string, unknown>): DtStackClientLike {
  return {
    post: mock(async (path: string) => ({ code: 1, data: routes[path] ?? null })),
    postWithProjectId: mock(async (path: string) => ({ code: 1, data: routes[path] ?? null })),
  } as unknown as DtStackClientLike;
}

describe("precondSetup", () => {
  test("loads tables from yaml when tablesFromFile provided", async () => {
    const dir = mkdtempSync(join(tmpdir(), "dtcli-pc-"));
    const file = join(dir, "tables.yaml");
    writeFileSync(file, "tables:\n  - name: t1\n    sql: 'CREATE TABLE t1 (id int)'\n");
    try {
      const client = makeClient({
        "/api/rdos/common/project/getProjects": [{ id: 1, projectName: "p1" }],
        "/api/rdos/batch/batchDataSource/list": [
          { id: 9, dataName: "doris-x", dataSourceType: 119, schemaName: "s" },
        ],
      });
      const result = await precondSetup({
        client,
        project: "p1",
        datasource: "Doris",
        tablesFromFile: file,
        skipSync: true,
      });
      expect(result.tablesCreated).toEqual(["t1"]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("inline tables option works without file", async () => {
    const client = makeClient({
      "/api/rdos/common/project/getProjects": [{ id: 1, projectName: "p1" }],
      "/api/rdos/batch/batchDataSource/list": [
        { id: 9, dataName: "doris-x", dataSourceType: 119, schemaName: "s" },
      ],
    });
    const result = await precondSetup({
      client,
      project: "p1",
      datasource: "Doris",
      tables: [{ name: "t1", sql: "CREATE TABLE t1 (id int)" }],
      skipSync: true,
    });
    expect(result.tablesCreated).toEqual(["t1"]);
  });

  test("falls back to project name when configured projectId is stale", async () => {
    const client = makeClient({
      "/api/rdos/common/project/getProjects": [{ id: 202, projectName: "p1" }],
      "/api/rdos/batch/batchDataSource/list": [
        { id: 9, dataName: "doris-x", dataSourceType: 119, schemaName: "s" },
      ],
    });
    const result = await precondSetup({
      client,
      project: "p1",
      projectId: 69,
      datasource: "Doris",
      tables: [{ name: "t1", sql: "CREATE TABLE t1 (id int)" }],
      skipSync: true,
    });

    expect(result.projectId).toBe(202);
    expect(result.tablesCreated).toEqual(["t1"]);
    expect(client.postWithProjectId).toHaveBeenCalledWith(
      "/api/rdos/batch/batchDataSource/list",
      { projectId: 202, syncTask: true },
      202,
    );
  });

  test("syncs missing tables via addSyncTask + pollDataMapTables", async () => {
    let dataMapHits = 0;
    const post = mock(async (path: string) => {
      switch (path) {
        case "/api/rdos/common/project/getProjects":
          return { code: 1, data: [{ id: 1, projectName: "pw_test" }] };
        case "/dassets/v1/dataSource/pageQuery":
          // Already imported — skip the import branch
          return { code: 1, data: { records: [{ id: 99, dataSourceName: "spark-x" }] } };
        case "/dassets/v1/datamap/queryDetail":
          dataMapHits += 1;
          // First check: missing. After addSyncTask: visible.
          return dataMapHits === 1
            ? { code: 1, data: { records: [] } }
            : { code: 1, data: { records: [{ id: 1, tableName: "t1" }] } };
        case "/dmetadata/v1/dataSource/listMetadataDataSource":
          return {
            code: 1,
            data: [{ dataSourceId: 547, dataSourceName: "renamed-spark-x", dataSourceType: 45 }],
          };
        case "/dmetadata/v1/syncTask/add":
          return { code: 1, data: true };
        default:
          return { code: 1, data: null };
      }
    });
    const postWithProjectId = mock(async (path: string) => {
      if (path === "/api/rdos/batch/batchDataSource/list") {
        return {
          code: 1,
          data: [{ id: 9, dataName: "spark-x", dataSourceType: 45, schemaName: "pw_test" }],
        };
      }
      return { code: 1, data: null };
    });
    const client = { post, postWithProjectId } as unknown as DtStackClientLike;

    const result = await precondSetup({
      client,
      project: "pw_test",
      datasource: "SparkThrift",
      datasourceProfile: { metadata: { id: 547, name: "pw_test_HADOOP", typeId: 45 } },
      tables: [{ name: "t1", sql: "CREATE TABLE t1 (id int)" }],
      syncTimeoutMs: 10_000,
    });

    expect(result.syncComplete).toBe(true);
    expect(result.tablesCreated).toEqual(["t1"]);

    const syncCall = post.mock.calls.find((c) => c[0] === "/dmetadata/v1/syncTask/add");
    expect(syncCall?.[1]).toMatchObject({
      dataSourceId: "547",
      dataSourceType: 45,
      dbList: ["pw_test"],
      tableList: [{ dbName: "pw_test", tableName: "t1" }],
      taskType: 0,
    });
  }, 15_000);

  test("returns syncComplete=true without adding task when table already in data map", async () => {
    const post = mock(async (path: string) => {
      switch (path) {
        case "/api/rdos/common/project/getProjects":
          return { code: 1, data: [{ id: 1, projectName: "pw_test" }] };
        case "/dassets/v1/dataSource/pageQuery":
          return { code: 1, data: { records: [{ id: 99, dataSourceName: "spark-x" }] } };
        case "/dassets/v1/datamap/queryDetail":
          return { code: 1, data: { records: [{ id: 1, tableName: "t1" }] } };
        default:
          return { code: 1, data: null };
      }
    });
    const postWithProjectId = mock(async (path: string) => {
      if (path === "/api/rdos/batch/batchDataSource/list") {
        return {
          code: 1,
          data: [{ id: 9, dataName: "spark-x", dataSourceType: 45, schemaName: "pw_test" }],
        };
      }
      return { code: 1, data: null };
    });
    const client = { post, postWithProjectId } as unknown as DtStackClientLike;

    const result = await precondSetup({
      client,
      project: "pw_test",
      datasource: "SparkThrift",
      tables: [{ name: "t1", sql: "CREATE TABLE t1 (id int)" }],
    });

    expect(result.syncComplete).toBe(true);
    const syncCalled = post.mock.calls.some((c) => c[0] === "/dmetadata/v1/syncTask/add");
    expect(syncCalled).toBe(false);
  });
});
