import { describe, expect, mock, test } from "bun:test";
import type { DtStackClientLike } from "../../../src/core/http/client";
import { ProjectApi } from "../../../src/core/platform/project";

describe("ProjectApi", () => {
  test("ensureProject returns existing project without creating", async () => {
    const post = mock(async (path: string) => {
      if (path === "/api/rdos/common/project/getProjects") {
        return { code: 1, data: [{ id: 5, projectName: "pw_test" }] };
      }
      throw new Error(`unexpected ${path}`);
    });
    const api = new ProjectApi({ post } as unknown as DtStackClientLike);
    const result = await api.ensureProject({ name: "pw_test" });
    expect(result.id).toBe(5);
    expect(post).toHaveBeenCalledTimes(1);
  });

  test("ensureProject creates when missing then refetches", async () => {
    let createCalled = false;
    let listCallCount = 0;
    const post = mock(async (path: string, body?: unknown) => {
      if (path === "/api/rdos/common/project/getProjects") {
        listCallCount += 1;
        return { code: 1, data: createCalled ? [{ id: 9, projectName: "newp" }] : [] };
      }
      if (path === "/api/rdos/common/project/createProject") {
        createCalled = true;
        const b = body as { projectName: string };
        expect(b.projectName).toBe("newp");
        return { code: 1, data: { id: 9 } };
      }
      throw new Error(`unexpected ${path}`);
    });
    const api = new ProjectApi({ post } as unknown as DtStackClientLike);
    const result = await api.ensureProject({ name: "newp", ownerId: 1, engines: ["doris3"] });
    expect(result.id).toBe(9);
    expect(createCalled).toBe(true);
    expect(listCallCount).toBe(2);
  });

  test("createProject builds projectEngineList from engines", async () => {
    const post = mock(async (path: string, body?: unknown) => {
      if (path === "/api/rdos/common/project/createProject") {
        const b = body as { projectEngineList: Array<{ identity: string }> };
        expect(b.projectEngineList).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ identity: "default" }),
            expect.objectContaining({ identity: "doris3" }),
          ]),
        );
        return { code: 1, data: { id: 1 } };
      }
      return { code: 1, data: [] };
    });
    const api = new ProjectApi({ post } as unknown as DtStackClientLike);
    await api.createProject({ name: "p", ownerId: 1, engines: ["doris3"] });
  });
});
