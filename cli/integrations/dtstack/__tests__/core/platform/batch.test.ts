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
  test("CREATE statement is sent base64-encoded via ddlCreateTableEncryption with schema-qualified target", async () => {
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
      "CREATE TABLE s.t (id int)",
    );
  });

  test("INSERT statement runs via batchScript flow with schema-qualified target", async () => {
    const calls: string[] = [];
    let startSqlBody:
      | { sql?: string; sourceId?: number; targetSchema?: string; syncTask?: boolean }
      | undefined;
    const responder = (path: string, body: unknown): unknown => {
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
        startSqlBody = body as {
          sql?: string;
          sourceId?: number;
          targetSchema?: string;
          syncTask?: boolean;
        };
        return { code: 1, data: { jobId: "job-1" } };
      }
      if (path.endsWith("/batchSelectSql/selectStatus")) {
        return { code: 1, data: { status: 5 } };
      }
      return { code: 1, data: null };
    };
    const client = {
      post: mock(async () => ({ code: 1, data: null })),
      postWithProjectId: mock(async (path: string, body: unknown) => responder(path, body)),
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
    expect(Buffer.from(startSqlBody?.sql ?? "", "base64").toString("utf-8")).toBe(
      "INSERT INTO s.t VALUES (1)",
    );
    expect(startSqlBody?.sourceId).toBe(1);
    expect(startSqlBody?.targetSchema).toBe("s");
    expect(startSqlBody?.syncTask).toBe(true);
  });

  test("INSERT statement infers execution schema from an already qualified target", async () => {
    let startSqlBody:
      | { sql?: string; sourceId?: number; targetSchema?: string; syncTask?: boolean }
      | undefined;
    const responder = (path: string, body: unknown): unknown => {
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
        return { code: 1, data: { id: 142 } };
      }
      if (path.endsWith("/batchScript/startSqlImmediatelyEncryption")) {
        startSqlBody = body as {
          sql?: string;
          sourceId?: number;
          targetSchema?: string;
          syncTask?: boolean;
        };
        return { code: 1, data: { jobId: "job-2" } };
      }
      if (path.endsWith("/batchSelectSql/selectStatus")) {
        return { code: 1, data: { status: 5 } };
      }
      return { code: 1, data: null };
    };
    const client = {
      post: mock(async () => ({ code: 1, data: null })),
      postWithProjectId: mock(async (path: string, body: unknown) => responder(path, body)),
    } as unknown as DtStackClientLike;

    const api = new BatchApi(client, `test-insert-qualified-${Date.now()}`);
    await api.executeDDL(
      99,
      { id: 1, dataName: "spark-x", dataSourceType: 45 },
      "INSERT INTO pw_test.t VALUES (1)",
    );

    expect(Buffer.from(startSqlBody?.sql ?? "", "base64").toString("utf-8")).toBe(
      "INSERT INTO pw_test.t VALUES (1)",
    );
    expect(startSqlBody?.sourceId).toBe(1);
    expect(startSqlBody?.targetSchema).toBe("pw_test");
    expect(startSqlBody?.syncTask).toBe(true);
  });

  test("INSERT status 16 keeps polling until the SQL job reaches a final status", async () => {
    let statusCalls = 0;
    const responder = (path: string): unknown => {
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
        return { code: 1, data: { id: 143 } };
      }
      if (path.endsWith("/batchScript/startSqlImmediatelyEncryption")) {
        return { code: 1, data: { jobId: "job-16" } };
      }
      if (path.endsWith("/batchSelectSql/selectStatus")) {
        statusCalls += 1;
        return { code: 1, data: { status: [16, 4, 5][statusCalls - 1] } };
      }
      return { code: 1, data: null };
    };
    const client = {
      post: mock(async () => ({ code: 1, data: null })),
      postWithProjectId: mock(async (path: string) => responder(path)),
    } as unknown as DtStackClientLike;

    const api = new BatchApi(client, `test-insert-status-16-${Date.now()}`);
    await api.executeDDL(
      99,
      { id: 1, dataName: "spark-x", dataSourceType: 45, schemaName: "s" },
      "INSERT INTO t VALUES (1)",
    );

    expect(statusCalls).toBe(3);
  }, 10_000);

  test("DROP statement runs via batchScript flow with schema-qualified target", async () => {
    let startSqlBody: { sql?: string } | undefined;
    const responder = (path: string, body: unknown): unknown => {
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
        return { code: 1, data: { id: 141 } };
      }
      if (path.endsWith("/batchScript/startSqlImmediatelyEncryption")) {
        startSqlBody = body as { sql?: string };
        return { code: 1, data: { status: 5 } };
      }
      return { code: 1, data: null };
    };
    const client = {
      post: mock(async () => ({ code: 1, data: null })),
      postWithProjectId: mock(async (path: string, body: unknown) => responder(path, body)),
    } as unknown as DtStackClientLike;

    const api = new BatchApi(client, `test-drop-${Date.now()}`);
    await api.executeDDL(
      99,
      { id: 1, dataName: "doris-x", dataSourceType: 119, schemaName: "s" },
      "DROP TABLE IF EXISTS t",
    );

    expect(Buffer.from(startSqlBody?.sql ?? "", "base64").toString("utf-8")).toBe(
      "DROP TABLE IF EXISTS s.t",
    );
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
        return { code: 1, data: { status: 8, msg: "", engineMessage: "executor failed" } };
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
    ).rejects.toThrow(/SQL execution failed.*engineMessage.*executor failed/);
  }, 30_000);

  test("findProject returns matching project", async () => {
    const client = makeClient(() => [{ id: 7, projectName: "pw_test" }]);
    const api = new BatchApi(client);
    expect(await api.findProject("pw_test")).toEqual({ id: 7, projectName: "pw_test" });
  });
});
