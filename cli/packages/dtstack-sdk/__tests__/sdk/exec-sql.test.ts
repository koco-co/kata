import { describe, expect, mock, test } from "bun:test";
import type { DtStackClientLike } from "../../src/core/http/client";
import { execSql } from "../../src/sdk/exec-sql";

describe("execSql platform mode", () => {
  test("requires --project and --datasource", async () => {
    expect(execSql({ mode: "platform", sql: "SELECT 1" } as never)).rejects.toThrow(/project/i);
  });

  test("delegates to BatchApi.executeDDL with resolved datasource", async () => {
    const calls: string[] = [];
    const client = {
      post: mock(async (path: string) => {
        calls.push(path);
        if (path === "/api/rdos/common/project/getProjects")
          return { code: 1, data: [{ id: 5, projectName: "p1" }] };
        return { code: 1, data: null };
      }),
      postWithProjectId: mock(async (path: string) => {
        calls.push(path);
        if (path === "/api/rdos/batch/batchDataSource/list") {
          return {
            code: 1,
            data: [{ id: 9, dataName: "doris-x", dataSourceType: 119, schemaName: "s" }],
          };
        }
        return { code: 1, data: null };
      }),
    } as unknown as DtStackClientLike;
    await execSql({
      mode: "platform",
      project: "p1",
      datasource: "Doris",
      sql: "CREATE TABLE t (id int)",
      client,
    });
    expect(calls).toContain("/api/rdos/batch/batchTableInfo/ddlCreateTableEncryption");
  });

  function makeAlreadyExistsClient(): DtStackClientLike {
    return {
      post: mock(async (path: string) => {
        if (path === "/api/rdos/common/project/getProjects")
          return { code: 1, data: [{ id: 5, projectName: "p1" }] };
        return { code: 1, data: null };
      }),
      postWithProjectId: mock(async (path: string) => {
        if (path === "/api/rdos/batch/batchDataSource/list") {
          return {
            code: 1,
            data: [{ id: 9, dataName: "doris-x", dataSourceType: 119, schemaName: "s" }],
          };
        }
        if (path === "/api/rdos/batch/batchTableInfo/ddlCreateTableEncryption") {
          return { code: 0, data: null, message: "Table s.t already exists" };
        }
        // fallback customSQL path also reports already-exists
        return { code: 0, data: null, message: "Table s.t already exists" };
      }),
    } as unknown as DtStackClientLike;
  }

  test("already-exists error is a warning by default", async () => {
    await expect(
      execSql({
        mode: "platform",
        project: "p1",
        datasource: "Doris",
        sql: "CREATE TABLE t (id int)",
        client: makeAlreadyExistsClient(),
      }),
    ).resolves.toEqual([]);
  });

  test("onExists fail turns already-exists error into a thrown error", async () => {
    await expect(
      execSql({
        mode: "platform",
        project: "p1",
        datasource: "Doris",
        sql: "CREATE TABLE t (id int)",
        onExists: "fail",
        client: makeAlreadyExistsClient(),
      }),
    ).rejects.toThrow(/already exists/i);
  });
});
