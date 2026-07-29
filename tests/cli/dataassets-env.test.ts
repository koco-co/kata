import { describe, expect, test } from "bun:test";
import { type DataAssetsEnvConfig, resolveDataAssetsEnv } from "../../cli/lib/dataassets-env.ts";

function response(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

function config(): DataAssetsEnvConfig {
  return {
    schema_version: 2,
    url: "https://platform.example.test",
    auth: { cookie: "dt_tenant_name=tenant-a; sid=test-only" },
    guard: { expected_tenant: "tenant-a" },
    projects: { quality: "quality-a" },
    datasources: {
      sparkthrift: {
        name: "spark-a",
        database: "database-a",
        requires_offline: false,
      },
    },
    defaults: { datasource: "sparkthrift" },
    safety: { allow_write: false },
  };
}

describe("DataAssets environment datasource inventory compatibility", () => {
  test("falls back to exact metadata sources for the known server class-loading failure", async () => {
    const paths: string[] = [];
    const fetchImpl: typeof fetch = async (input) => {
      const path = new URL(String(input)).pathname;
      paths.push(path);
      switch (path) {
        case "/dassets/v1/valid/project/getProjects":
          return response({ code: 1, data: [{ id: 92, name: "quality-a" }] });
        case "/api/rdos/common/project/getProjects":
          return response({ code: 1, data: [] });
        case "/dmetadata/v1/dataSource/listMetadataDataSource":
          return response({
            code: 1,
            data: [{ dataSourceId: 547, dataSourceName: "spark-a", dataSourceType: 45 }],
          });
        case "/dassets/v1/dataSource/pageQuery":
          return response({
            code: 1011,
            data: null,
            message:
              "Handler dispatch failed; nested exception is java.lang.NoClassDefFoundError: com/dtstack/metadata/controller/data/DataSourceController$1",
          });
        default:
          throw new Error(`unexpected test endpoint: ${path}`);
      }
    };

    const resolved = await resolveDataAssetsEnv("fixture", {
      config: config(),
      fetchImpl,
    });

    expect(resolved.datasources.sparkthrift.assets).toEqual({
      id: 547,
      name: "spark-a",
      typeId: 45,
    });
    expect(resolved.datasources.sparkthrift.metadata.id).toBe(547);
    expect(resolved.warnings).toEqual(["assets_datasource_inventory_fallback"]);
    expect(paths).toContain("/dassets/v1/dataSource/pageQuery");
  });

  test("keeps exact datasource matching when the fallback inventory is used", async () => {
    const fetchImpl: typeof fetch = async (input) => {
      const path = new URL(String(input)).pathname;
      switch (path) {
        case "/dassets/v1/valid/project/getProjects":
          return response({ code: 1, data: [{ id: 92, name: "quality-a" }] });
        case "/api/rdos/common/project/getProjects":
          return response({ code: 1, data: [] });
        case "/dmetadata/v1/dataSource/listMetadataDataSource":
          return response({
            code: 1,
            data: [{ dataSourceId: 547, dataSourceName: "different-source", dataSourceType: 45 }],
          });
        case "/dassets/v1/dataSource/pageQuery":
          return response({
            code: 1011,
            data: null,
            message:
              "NoClassDefFoundError: com/dtstack/metadata/controller/data/DataSourceController$1",
          });
        default:
          throw new Error(`unexpected test endpoint: ${path}`);
      }
    };

    await expect(resolveDataAssetsEnv("fixture", { config: config(), fetchImpl })).rejects.toThrow(
      "datasource_sparkthrift_assets_not_found",
    );
  });
});
