import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  bridgeLegacyDataAssetsEnv,
  loadDataAssetsEnvProfile,
  resolveDataAssetsEnvName,
  resolveDataAssetsRuntime,
} from "./env-profile";

let root: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "dataassets-env-"));
  mkdirSync(join(root, "_shared", "env"), { recursive: true });
  mkdirSync(join(root, ".auth", "dataAssets"), { recursive: true });
  writeFileSync(
    join(root, ".auth", "dataAssets", "session-ltqc-local.json"),
    JSON.stringify({
      cookies: [
        { name: "dt_tenant_id", value: "10481" },
        { name: "dt_tenant_name", value: "pw_test" },
        { name: "dt_user_id", value: "1" },
        { name: "dt_username", value: "admin" },
      ],
      origins: [],
    }),
  );
  writeFileSync(
    join(root, "_shared", "env", "ltqc-local.yaml"),
    `
schema_version: 1
project: dataAssets
env: ltqc-local
urls:
  base_url: http://example.test
  data_assets_base_url: http://example.test/dataAssets
  offline_base_url: http://example.test/batch
auth:
  session_path: .kata/auth/dataAssets/session-ltqc-local.json
  tenant_id: 10481
  tenant_name: pw_test
  derive_from_session: true
projects:
  quality: { id: 92, name: pw_test }
  offline: { id: 69, name: env_rebuild_test }
  owner: { id: 1 }
  engines: [default, doris3]
datasources:
  sparkthrift:
    enabled: true
    ui_label: SparkThrift2.x
    precondition_type: SparkThrift
    aliases: [sparkthrift, hadoop, pw_test_HADOOP]
    batch: { id: 9, name: pw_test_HADOOP, type_id: 45, database: pw_test, schema: pw_test }
    metadata: { id: 547, name: pw_test_HADOOP, type_id: 45 }
    assets: { id: 547, name: pw_test_HADOOP }
    sql: { database: pw_test, schema: pw_test, warehouse_uri: hdfs://ns1/dtInsight/hive/warehouse/pw_test.db }
  doris:
    enabled: true
    ui_label: Doris3.x
    precondition_type: Doris
    aliases: [doris, doris3]
    batch: { id: 10, name: env_rebuild_test_DORIS_doris, type_id: 119, database: pw_test, schema: pw_test, cluster_name: doris }
    metadata: { id: 548, name: env_rebuild_test_DORIS_doris, type_id: 119 }
    assets: { id: 548, name: env_rebuild_test_DORIS_doris }
    ui: { source_type_id: 129 }
    sql: { database: pw_test, schema: pw_test }
runtime:
  default_datasource: sparkthrift
  active_datasources: [sparkthrift]
  table_prefix: qa_auto
  skip_preconditions: false
  cleanup: true
  timeouts: { project_api_ms: 120000, precondition_request_ms: 120000, metadata_sync_ms: 180000 }
  playwright: { headless: true, workers: 1, fully_parallel: false, step_capture: all }
`,
  );
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe("dataAssets env profile", () => {
  test("resolves env name with KATA_DATAASSETS_ENV before ACTIVE_ENV", () => {
    expect(resolveDataAssetsEnvName({ KATA_DATAASSETS_ENV: "ltqc-prod", ACTIVE_ENV: "ltqc-local" })).toBe(
      "ltqc-prod",
    );
    expect(resolveDataAssetsEnvName({ ACTIVE_ENV: "ltqc-test" })).toBe("ltqc-test");
    expect(resolveDataAssetsEnvName({})).toBe("ltqc-local");
  });

  test("normalizes legacy env names after profile rename", () => {
    expect(resolveDataAssetsEnvName({ ACTIVE_ENV: "PROD" })).toBe("ltqc-prod");
    expect(resolveDataAssetsEnvName({ KATA_DATAASSETS_ENV: "ltqc" })).toBe("ltqc-local");
    expect(resolveDataAssetsEnvName({ KATA_DATAASSETS_ENV: "customltem" })).toBe("ltqc-test");
  });

  test("loads profile and derives auth facts from session", () => {
    const profile = loadDataAssetsEnvProfile("ltqc-local", { workspaceRoot: root, repoRoot: root });
    expect(profile.env).toBe("ltqc-local");
    expect(profile.urls.dataAssetsBaseUrl).toBe("http://example.test/dataAssets");
    expect(profile.auth.sessionPath).toBe(join(root, ".kata/auth/dataAssets/session-ltqc-local.json"));
    expect(profile.auth.tenantId).toBe(10481);
    expect(profile.projects.quality).toEqual({ id: 92, name: "pw_test" });
    expect(profile.datasources.sparkthrift.metadata.id).toBe(547);
    expect(profile.datasources.doris.ui?.sourceTypeId).toBe(129);
  });

  test("fails closed when required datasource is missing", () => {
    writeFileSync(join(root, "_shared", "env", "ltqc-local.yaml"), "schema_version: 1\nproject: dataAssets\nenv: ltqc-local\n");
    expect(() => loadDataAssetsEnvProfile("ltqc-local", { workspaceRoot: root })).toThrow(
      /urls\.base_url is required/,
    );
  });

  test("bridges legacy env variables for old helpers", () => {
    const profile = resolveDataAssetsRuntime(
      { KATA_DATAASSETS_ENV: "ltqc-local" },
      { workspaceRoot: root, repoRoot: root },
    );
    const target: Record<string, string | undefined> = {};
    bridgeLegacyDataAssetsEnv(profile, target);
    expect(target.UI_AUTOTEST_BASE_URL).toBe("http://example.test/dataAssets");
    expect(target.UI_AUTOTEST_SESSION_PATH).toBe(join(root, ".kata/auth/dataAssets/session-ltqc-local.json"));
    expect(target.DATASOURCE_MATRIX).toBeUndefined();
  });
});
