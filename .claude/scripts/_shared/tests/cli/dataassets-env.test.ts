import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  addDataAssetsEnv,
  assertDataAssetsEnvName,
  buildDataAssetsChildEnv,
  type DataAssetsEnvConfig,
  diagnoseDataAssetsEnv,
  discoverDataAssetsEnv,
  listDataAssetsEnvs,
  migrateDataAssetsEnvs,
  readDataAssetsEnvConfig,
  resolveDataAssetsEnv,
  runDataAssetsCommand,
  setDataAssetsCookie,
  showDataAssetsEnv,
} from "@shared/lib/dataassets-env.ts";
import { parse, stringify } from "yaml";

let root: string;

const secretCookie = "dt_tenant_name=pw_test; dt_tenant_id=10481; sid=secret-value";

function config(cookie = secretCookie): DataAssetsEnvConfig {
  return {
    schema_version: 2,
    url: "https://platform.example.test",
    auth: { cookie },
    guard: { expected_tenant: "pw_test" },
    projects: { quality: "quality-project", offline: "offline-project" },
    datasources: {
      sparkthrift: { name: "spark-ui", database: "test_db" },
    },
    defaults: { datasource: "sparkthrift" },
    safety: { allow_write: false },
  };
}

function writeConfig(name = "ci63", value = config()): string {
  const dir = join(root, "config", "env");
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  chmodSync(dir, 0o700);
  const path = join(dir, `${name}.yaml`);
  writeFileSync(path, stringify(value), { mode: 0o600 });
  chmodSync(path, 0o600);
  return path;
}

function response(data: unknown, code = 1, status = 200): Response {
  return new Response(JSON.stringify({ code, data }), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function platformFetch(
  overrides: { duplicateQuality?: boolean; fail?: boolean } = {},
): typeof fetch {
  return (async (input: string | URL | Request) => {
    if (overrides.fail) throw new Error("network secret should not leak");
    const path = new URL(typeof input === "string" || input instanceof URL ? input : input.url)
      .pathname;
    if (path === "/dassets/v1/valid/project/getProjects") {
      return response([
        { id: 92, name: "quality-project" },
        ...(overrides.duplicateQuality ? [{ id: 93, name: "quality-project" }] : []),
      ]);
    }
    if (path === "/api/rdos/common/project/getProjects") {
      return response([{ id: 69, projectName: "offline-project" }]);
    }
    if (path === "/dassets/v1/dataSource/pageQuery") {
      return response({
        records: [
          {
            id: 547,
            dataSourceName: "spark-ui",
            dtCenterSourceName: "offline-project_HADOOP",
            dataSourceType: 45,
          },
        ],
      });
    }
    if (path === "/dmetadata/v1/dataSource/listMetadataDataSource") {
      return response([{ dataSourceId: 547, dataSourceName: "spark-ui", dataSourceType: 45 }]);
    }
    if (path === "/api/rdos/batch/batchDataSource/list") {
      return response([{ id: 9, dataName: "offline-project_HADOOP", dataSourceType: 45 }]);
    }
    return response(null, 0);
  }) as typeof fetch;
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "kata-dataassets-env-v2-"));
});

afterEach(() => rmSync(root, { recursive: true, force: true }));

describe("DataAssets v2 environment store", () => {
  test("creates 0700/0600 files, lists them, and always redacts Cookie", () => {
    const created = addDataAssetsEnv("demo", "https://platform.example.test", { repoRoot: root });
    expect(statSync(join(root, "config/env")).mode & 0o777).toBe(0o700);
    expect(statSync(created.path).mode & 0o777).toBe(0o600);
    expect(listDataAssetsEnvs({ repoRoot: root })).toEqual([
      {
        name: "demo",
        url: "https://platform.example.test",
        cookieConfigured: false,
        valid: true,
      },
    ]);
    const shown = showDataAssetsEnv("demo", { repoRoot: root });
    expect((shown.auth as { cookie: string }).cookie).toBe("");
  });

  test("rejects path traversal, module URLs, unknown keys, and redundant schema", () => {
    expect(() => assertDataAssetsEnvName("../ci63")).toThrow(/invalid environment name/);
    expect(() =>
      addDataAssetsEnv("demo", "https://example.test/dataAssets", { repoRoot: root }),
    ).toThrow(/platform root/);
    const invalid = { ...config(), project: "legacy" } as DataAssetsEnvConfig;
    writeConfig("ci63", invalid);
    expect(() => readDataAssetsEnvConfig("ci63", { repoRoot: root })).toThrow(/unsupported keys/);
    writeConfig("ci63", {
      ...config(),
      datasources: { sparkthrift: { name: "spark-ui", database: "test_db", schema: "test_db" } },
    });
    expect(() => readDataAssetsEnvConfig("ci63", { repoRoot: root })).toThrow(/must be omitted/);
  });

  test("resolves projects and all product datasource IDs by exact names", async () => {
    writeConfig();
    const resolved = await resolveDataAssetsEnv("ci63", {
      repoRoot: root,
      fetchImpl: platformFetch(),
    });
    expect(resolved.urls).toEqual({
      baseUrl: "https://platform.example.test",
      dataAssetsBaseUrl: "https://platform.example.test/dataAssets",
      offlineBaseUrl: "https://platform.example.test/batch",
      portalBaseUrl: "https://platform.example.test/portal",
    });
    expect(resolved.projects.quality.id).toBe(92);
    expect(resolved.datasources.sparkthrift).toMatchObject({
      batch: { id: 9, typeId: 45 },
      metadata: { id: 547, typeId: 45 },
      assets: { id: 547, typeId: 45 },
    });
    expect(JSON.stringify(resolved)).not.toContain("secret-value");
  });

  test("fails closed for tenant mismatch and duplicate exact matches", async () => {
    writeConfig("ci63", {
      ...config("dt_tenant_name=wrong; sid=secret-value"),
    });
    await expect(
      resolveDataAssetsEnv("ci63", { repoRoot: root, fetchImpl: platformFetch() }),
    ).rejects.toThrow("tenant_mismatch");

    writeConfig();
    await expect(
      resolveDataAssetsEnv("ci63", {
        repoRoot: root,
        fetchImpl: platformFetch({ duplicateQuality: true }),
      }),
    ).rejects.toThrow("quality_project_ambiguous");
  });

  test("doctor reports cookie, permission, placeholder, and tracked-file findings", async () => {
    writeConfig("ci63", config(""));
    chmodSync(join(root, "config/env/ci63.yaml"), 0o644);
    let result = await diagnoseDataAssetsEnv("ci63", { repoRoot: root, offline: true });
    expect(result.findings.map((item) => item.code)).toContain("env_file_permissions");
    expect(result.findings.map((item) => item.code)).toContain("cookie_missing");

    chmodSync(join(root, "config/env/ci63.yaml"), 0o600);
    execFileSync("git", ["init", "-q"], { cwd: root });
    execFileSync("git", ["add", "config/env/ci63.yaml"], { cwd: root });
    result = await diagnoseDataAssetsEnv("ci63", { repoRoot: root, offline: true });
    expect(result.findings.map((item) => item.code)).toContain("env_file_tracked");

    rmSync(join(root, ".git"), { recursive: true, force: true });
    rmSync(join(root, "config"), { recursive: true, force: true });
    addDataAssetsEnv("demo", "https://platform.example.test", { repoRoot: root });
    result = await diagnoseDataAssetsEnv("demo", { repoRoot: root, offline: true });
    expect(result.findings.map((item) => item.code)).toContain("placeholder_value");
  });

  test("validates a new Cookie before atomic replacement without returning it", async () => {
    writeConfig("ci63", config("dt_tenant_name=pw_test; sid=old"));
    const result = await setDataAssetsCookie("ci63", secretCookie, {
      repoRoot: root,
      fetchImpl: platformFetch(),
    });
    expect(JSON.stringify(result)).not.toContain("secret-value");
    expect(readDataAssetsEnvConfig("ci63", { repoRoot: root }).auth.cookie).toBe(secretCookie);

    await expect(
      setDataAssetsCookie("ci63", "dt_tenant_name=pw_test; sid=unverified-secret", {
        repoRoot: root,
        fetchImpl: platformFetch({ fail: true }),
      }),
    ).rejects.toThrow(/platform_unreachable/);
    expect(readDataAssetsEnvConfig("ci63", { repoRoot: root }).auth.cookie).toBe(secretCookie);
  });

  test("discover returns only non-secret project and datasource choices", async () => {
    writeConfig();
    const result = await discoverDataAssetsEnv("ci63", {
      repoRoot: root,
      fetchImpl: platformFetch(),
    });
    expect(JSON.stringify(result)).toContain("offline-project_HADOOP");
    expect(JSON.stringify(result)).not.toContain("secret-value");
  });

  test("migrates seven profiles and deletes legacy Cookie only after online verification", async () => {
    const legacyDir = join(root, "workspace/dataAssets/_shared/env");
    mkdirSync(join(legacyDir, ".local"), { recursive: true });
    for (const name of [
      "ci63",
      "ltqc-dev",
      "ltqc-local",
      "ltqc-prod",
      "ltqc-sy-test",
      "ltqc-test",
      "zszq-test",
    ]) {
      writeFileSync(
        join(legacyDir, `${name}.yaml`),
        stringify({
          schema_version: 1,
          urls: { base_url: "https://platform.example.test" },
          auth: { cookie: "", tenant_name: "pw_test" },
          projects: {
            quality: { id: 1, name: "quality-project" },
            offline: { id: 2, name: "offline-project" },
          },
          datasources: {
            sparkthrift: {
              batch: { id: 9, name: "offline-project_HADOOP", database: "test_db" },
              metadata: { id: 547, name: "spark-ui" },
              assets: { id: 547, name: "spark-ui" },
              sql: { database: "test_db", schema: "test_db" },
            },
          },
          runtime: { default_datasource: "sparkthrift", allow_write: false },
        }),
      );
    }
    const legacyCookie = join(legacyDir, ".local/ci63.yaml");
    writeFileSync(legacyCookie, stringify({ auth: { cookie: secretCookie } }), { mode: 0o600 });

    const preview = await migrateDataAssetsEnvs({ repoRoot: root });
    expect(preview.applied).toBe(false);
    expect(preview.ok).toBe(true);
    expect(preview.profiles).toHaveLength(7);
    expect(preview.profiles.find((item) => item.name === "ci63")?.cookiePreserved).toBe(true);
    expect(existsSync(join(root, "config/env/ci63.yaml"))).toBe(false);

    const applied = await migrateDataAssetsEnvs({
      repoRoot: root,
      apply: true,
      fetchImpl: platformFetch(),
    });
    expect(applied.ok).toBe(true);
    expect(applied.profiles).toHaveLength(7);
    expect(applied.profiles.find((item) => item.name === "ci63")).toMatchObject({
      cookieConfigured: true,
      cookiePreserved: true,
    });
    expect(existsSync(legacyCookie)).toBe(false);
    expect(readDataAssetsEnvConfig("ci63", { repoRoot: root }).auth.cookie).toBe(secretCookie);
    expect(readDataAssetsEnvConfig("ltqc-local", { repoRoot: root }).auth.cookie).toBe("");
  });

  test("retains the legacy Cookie when online migration validation fails", async () => {
    const legacyDir = join(root, "workspace/dataAssets/_shared/env");
    mkdirSync(join(legacyDir, ".local"), { recursive: true });
    writeFileSync(
      join(legacyDir, "ci63.yaml"),
      stringify({
        urls: { base_url: "https://platform.example.test" },
        auth: { tenant_name: "pw_test", cookie: "" },
        projects: {
          quality: { name: "quality-project" },
          offline: { name: "offline-project" },
        },
        datasources: {
          sparkthrift: {
            batch: { name: "offline-project_HADOOP", database: "test_db" },
            assets: { name: "spark-ui" },
            sql: { database: "test_db" },
          },
        },
        runtime: { default_datasource: "sparkthrift" },
      }),
    );
    const legacyCookie = join(legacyDir, ".local/ci63.yaml");
    writeFileSync(legacyCookie, stringify({ auth: { cookie: secretCookie } }), { mode: 0o600 });
    const result = await migrateDataAssetsEnvs({
      repoRoot: root,
      apply: true,
      fetchImpl: platformFetch({ fail: true }),
    });
    expect(result.ok).toBe(false);
    expect(existsSync(legacyCookie)).toBe(true);
    expect(result.retainedLegacyCookieFiles).toEqual([legacyCookie]);
  });

  test("injects secret-free resolved JSON and preserves the child exit code", async () => {
    writeConfig();
    const resolved = await resolveDataAssetsEnv("ci63", {
      repoRoot: root,
      fetchImpl: platformFetch(),
    });
    const env = buildDataAssetsChildEnv("ci63", resolved, { repoRoot: root }, {});
    expect(env.KATA_DATAASSETS_CONFIG).toBe(join(root, "config/env/ci63.yaml"));
    expect(env.KATA_DATAASSETS_RESOLVED).not.toContain("secret-value");
    const code = await runDataAssetsCommand("ci63", [process.execPath, "-e", "process.exit(7)"], {
      repoRoot: root,
      fetchImpl: platformFetch(),
    });
    expect(code).toBe(7);
  });

  test("never exposes Cookie through serialized public results", async () => {
    writeConfig();
    const publicResults = [
      listDataAssetsEnvs({ repoRoot: root }),
      showDataAssetsEnv("ci63", { repoRoot: root }),
      await diagnoseDataAssetsEnv("ci63", { repoRoot: root, offline: true }),
    ];
    expect(JSON.stringify(publicResults)).not.toContain("secret-value");
    expect(
      (parse(readFileSync(join(root, "config/env/ci63.yaml"), "utf8")) as DataAssetsEnvConfig).auth
        .cookie,
    ).toContain("secret-value");
  });
});
