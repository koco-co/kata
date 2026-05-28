import { describe, expect, mock, test } from "bun:test";
import type { DtStackClientLike } from "../../../src/core/http/client";
import { AssetsApi } from "../../../src/core/platform/assets";

describe("AssetsApi", () => {
  test("findImportedDatasource returns matching record", async () => {
    const post = mock(async () => ({
      code: 1,
      data: {
        records: [{ id: 1, dataSourceName: "doris-test", dtCenterSourceName: "doris-test" }],
      },
    }));
    const api = new AssetsApi({ post } as unknown as DtStackClientLike);
    const result = await api.findImportedDatasource("doris-test");
    expect(result?.id).toBe(1);
  });

  test("queryDataMap returns matched record by exact tableName", async () => {
    const post = mock(async (_path: string, _body: unknown) => ({
      code: 1,
      data: {
        records: [
          { id: 10, tableName: "json_partition_other" },
          { id: 11, tableName: "json_partition_test" },
        ],
      },
    }));
    const api = new AssetsApi({ post } as unknown as DtStackClientLike);
    const result = await api.queryDataMap("json_partition_test");
    expect(result?.id).toBe(11);
    expect(post.mock.calls[0]?.[0]).toBe("/dassets/v1/datamap/queryDetail");
    expect(post.mock.calls[0]?.[1]).toMatchObject({
      metaType: 1,
      search: "json_partition_test",
    });
  });

  test("queryDataMap returns null when no records match exactly", async () => {
    const post = mock(async () => ({
      code: 1,
      data: { records: [{ id: 1, tableName: "other_table" }] },
    }));
    const api = new AssetsApi({ post } as unknown as DtStackClientLike);
    expect(await api.queryDataMap("missing_table")).toBeNull();
  });

  test("queryDataMap tolerates contentList shape and empty data", async () => {
    const postContent = mock(async () => ({
      code: 1,
      data: { contentList: [{ id: 7, tableName: "t1" }] },
    }));
    const apiContent = new AssetsApi({ post: postContent } as unknown as DtStackClientLike);
    expect((await apiContent.queryDataMap("t1"))?.id).toBe(7);

    const postEmpty = mock(async () => ({ code: 1, data: null }));
    const apiEmpty = new AssetsApi({ post: postEmpty } as unknown as DtStackClientLike);
    expect(await apiEmpty.queryDataMap("t1")).toBeNull();
  });

  test("addSyncTask posts expected payload", async () => {
    const post = mock(async () => ({ code: 1, data: true }));
    const api = new AssetsApi({ post } as unknown as DtStackClientLike);
    await api.addSyncTask({
      dataSourceId: 547,
      dataSourceType: 45,
      dbName: "pw_test",
      tableNames: ["json_partition_test"],
    });
    expect(post.mock.calls[0]?.[0]).toBe("/dmetadata/v1/syncTask/add");
    expect(post.mock.calls[0]?.[1]).toEqual({
      dataSourceId: "547",
      dataSourceType: 45,
      dbList: ["pw_test"],
      tableList: [{ dbName: "pw_test", tableName: "json_partition_test" }],
      syncFilterTermConfigDTO: { syncMetaContent: 0, pastConfiguration: 1 },
      taskType: 0,
    });
  });

  test("findMetadataDatasource prefers configured datasource id", async () => {
    const post = mock(async () => ({
      code: 1,
      data: [
        { dataSourceId: 1, dataSourceName: "other", dataSourceType: 45 },
        { dataSourceId: 547, dataSourceName: "renamed-source", dataSourceType: 45 },
      ],
    }));
    const api = new AssetsApi({ post } as unknown as DtStackClientLike);
    const result = await api.findMetadataDatasource("pw_test_HADOOP", { id: 547 });
    expect(result?.dataSourceName).toBe("renamed-source");
  });

  test("findMetadataDatasource surfaces authentication failures", async () => {
    const post = mock(async () => ({ code: 5, message: "无此用户", data: null }));
    const api = new AssetsApi({ post } as unknown as DtStackClientLike);
    await expect(api.findMetadataDatasource("pw_test_HADOOP")).rejects.toThrow(
      /code=5 message=无此用户/,
    );
  });

  test("addSyncTask is a no-op when tableNames is empty", async () => {
    const post = mock(async () => ({ code: 1, data: true }));
    const api = new AssetsApi({ post } as unknown as DtStackClientLike);
    await api.addSyncTask({
      dataSourceId: 1,
      dataSourceType: 45,
      dbName: "pw_test",
      tableNames: [],
    });
    expect(post.mock.calls.length).toBe(0);
  });

  test("addSyncTask throws on non-1 code", async () => {
    const post = mock(async () => ({ code: 0, message: "fail", data: null }));
    const api = new AssetsApi({ post } as unknown as DtStackClientLike);
    expect(
      api.addSyncTask({
        dataSourceId: 1,
        dataSourceType: 45,
        dbName: "pw_test",
        tableNames: ["t1"],
      }),
    ).rejects.toThrow(/Add sync task failed/);
  });

  test("pollDataMapTables resolves once all tables appear", async () => {
    let callCount = 0;
    const post = mock(async (_path: string, body: { search: string }) => {
      callCount++;
      // First sweep (calls 1-2): nothing found yet
      if (callCount <= 2) return { code: 1, data: { records: [] } };
      // Second sweep (calls 3+): table now visible
      return {
        code: 1,
        data: { records: [{ tableName: body.search }] },
      };
    });
    const api = new AssetsApi({ post } as unknown as DtStackClientLike);
    // Timeout > one poll interval (5s) so second sweep gets a chance
    const ok = await api.pollDataMapTables(["t1", "t2"], 6_000);
    expect(ok).toBe(true);
  }, 10_000);

  test("pollDataMapTables returns true immediately when no tables expected", async () => {
    const post = mock(async () => ({ code: 1, data: { records: [] } }));
    const api = new AssetsApi({ post } as unknown as DtStackClientLike);
    expect(await api.pollDataMapTables([], 1_000)).toBe(true);
    expect(post.mock.calls.length).toBe(0);
  });

  test("pollDataMapTables throws on timeout with missing names", async () => {
    const post = mock(async () => ({ code: 1, data: { records: [] } }));
    const api = new AssetsApi({ post } as unknown as DtStackClientLike);
    await expect(api.pollDataMapTables(["never"], 100)).rejects.toThrow(
      /Data map sync timed out.*never/,
    );
  });
});
