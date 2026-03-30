import { describe, expect, mock, test } from "bun:test";
import type { DtStackClientLike } from "../../../src/core/http/client";
import { BatchApi } from "../../../src/core/platform/batch";

function makeClient(handler: (path: string, body: unknown) => unknown): DtStackClientLike {
  return {
    post: mock(async (path: string, body?: unknown) => ({ code: 1, data: handler(path, body) })),
    postWithProjectId: mock(async (path: string, body: unknown) => ({
      code: 1,
      data: handler(path, body),
    })),
  } as unknown as DtStackClientLike;
}

describe("BatchApi.executeDDL", () => {
  test("CREATE statement is sent base64-encoded via ddlCreateTableEncryption", async () => {
    let calledPath = "";
    let calledBody: { sql: string } | undefined;
    const client = {
      post: mock(async () => ({ code: 1, data: null })),
      postWithProjectId: mock(async (path: string, body: unknown) => {
        calledPath = path;
        calledBody = body as { sql: string };
        return { code: 1, data: null };
      }),
    } as unknown as DtStackClientLike;

    const api = new BatchApi(client);
    await api.executeDDL(
      99,
      { id: 1, dataName: "doris-x", dataSourceType: 119, schemaName: "s" },
      "CREATE TABLE t (id int)",
    );

    expect(calledPath).toBe("/api/rdos/batch/batchTableInfo/ddlCreateTableEncryption");
    expect(Buffer.from(calledBody?.sql, "base64").toString("utf-8")).toBe(
      "CREATE TABLE t (id int)",
    );
  });

  test("INSERT statement runs via batchScript flow (catalogue → addOrUpdate → startSql → poll)", async () => {
    const calls: string[] = [];
    const responder = (path: string): unknown => {
      calls.push(path);
      if (path.endsWith("/batchCatalogue/getCatalogue")) {
        return {
          code: 1,
          data: {
            id: 0,
            type: "folder",
            children: [
              { id: 5687, type: "folder", catalogueType: "ScriptManager", name: "临时查询" },
            ],
          },
        };
      }
      if (path.endsWith("/batchScript/addOrUpdateScriptEncryption")) {
        return { code: 1, data: { id: 140 } };
      }
      if (path.endsWith("/batchScript/startSqlImmediatelyEncryption")) {
        return { code: 1, data: { jobId: "job-1" } };
      }
      if (path.endsWith("/batchSelectSql/selectStatus")) {
        return { code: 1, data: { status: 5 } };
      }
      return { code: 1, data: null };
    };
    const client = {
      post: mock(async () => ({ code: 1, data: null })),
      postWithProjectId: mock(async (path: string) => responder(path)),
    } as unknown as DtStackClientLike;

    const api = new BatchApi(client, `test-insert-${Date.now()}`);
    await api.executeDDL(
      99,
      { id: 1, dataName: "doris-x", dataSourceType: 119, schemaName: "s" },
      "INSERT INTO t VALUES (1)",
    );

    expect(calls).toContain("/api/rdos/batch/batchCatalogue/getCatalogue");
    expect(calls).toContain("/api/rdos/batch/batchScript/addOrUpdateScriptEncryption");
    expect(calls).toContain("/api/rdos/batch/batchScript/startSqlImmediatelyEncryption");
    expect(calls).toContain("/api/rdos/batch/batchSelectSql/selectStatus");
  });

  test("INSERT failure (job FAILED) throws error instead of silent skip", async () => {
    const responder = (path: string): unknown => {
      if (path.endsWith("/batchCatalogue/getCatalogue")) {
        return {
          code: 1,
          data: {
            id: 0,
            type: "folder",
            children: [{ id: 5687, type: "folder", catalogueType: "ScriptManager" }],
          },
        };
      }
      if (path.endsWith("/batchScript/addOrUpdateScriptEncryption"))
        return { code: 1, data: { id: 140 } };
      if (path.endsWith("/batchScript/startSqlImmediatelyEncryption"))
        return { code: 1, data: { jobId: "j" } };
      if (path.endsWith("/batchSelectSql/selectStatus"))
        return { code: 1, data: { status: 8, msg: "boom" } };
      return { code: 1, data: null };
    };
    const client = {
      post: mock(async () => ({ code: 1, data: null })),
      postWithProjectId: mock(async (path: string) => responder(path)),
    } as unknown as DtStackClientLike;

    const api = new BatchApi(client, `test-fail-${Date.now()}`);
    await expect(
      api.executeDDL(
        99,
        { id: 1, dataName: "x", dataSourceType: 45, schemaName: "s" },
        "INSERT INTO t VALUES (1)",
      ),
    ).rejects.toThrow(/SQL execution failed/);
  });

  test("findProject returns matching project", async () => {
    const client = makeClient(() => [{ id: 7, projectName: "pw_test" }]);
    const api = new BatchApi(client);
    expect(await api.findProject("pw_test")).toEqual({ id: 7, projectName: "pw_test" });
  });
});
