import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { stringify } from "yaml";
import {
  cookieHeaderToPlaywrightState,
  loadPlatformEnvProfile,
  loadNamedDataAssetsAuthState,
  resolvePlatformEnvName,
  resolveDataAssetsRuntime,
} from "./env-profile";
import type { ResolvedPlatformEnv } from "../../../../../cli/lib/platform-env";

let root: string;

const resolved: ResolvedPlatformEnv = {
  schemaVersion: 2,
  env: "ltqc-local",
  urls: {
    baseUrl: "http://example.test",
    assetsBaseUrl: "http://example.test/dataAssets",
    offlineBaseUrl: "http://example.test/batch",
    portalBaseUrl: "http://example.test/portal",
  },
  tenant: { name: "pw_test", id: 10481, userId: 1, username: "admin" },
  projects: {
    quality: { id: 92, name: "pw_test" },
    offline: { id: 69, name: "pw_test" },
  },
  datasources: {
    sparkthrift: {
      name: "pw_test_HADOOP",
      batch: { id: 9, name: "pw_test_HADOOP", typeId: 45 },
      metadata: { id: 547, name: "pw_test_HADOOP", typeId: 45 },
      assets: { id: 547, name: "pw_test_HADOOP", typeId: 45 },
      database: "pw_test",
      schema: "pw_test",
      requiresOffline: false,
    },
  },
  defaults: { datasource: "sparkthrift" },
  safety: { allowWrite: false },
};

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "dataassets-env-v2-runtime-"));
  const dir = join(root, "config", "private", "environments");
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  chmodSync(dir, 0o700);
  writeFileSync(
    join(dir, "ltqc-local.yaml"),
    stringify({
      schema_version: 2,
      url: "http://example.test",
      auth: { cookie: "dt_tenant_name=pw_test; sid=test-cookie" },
      guard: { expected_tenant: "pw_test" },
      projects: { quality: "pw_test", offline: "pw_test" },
      datasources: { sparkthrift: { name: "pw_test_HADOOP", database: "pw_test" } },
      defaults: { datasource: "sparkthrift" },
      safety: { allow_write: false },
    }),
    { mode: 0o600 },
  );
  writeFileSync(
    join(dir, "ltqc-limited.yaml"),
    stringify({
      schema_version: 2,
      url: "http://example.test",
      auth: { cookie: "dt_tenant_name=pw_test; sid=limited-cookie" },
      guard: { expected_tenant: "pw_test" },
      projects: { quality: "pw_test", offline: "pw_test" },
      datasources: { sparkthrift: { name: "pw_test_HADOOP", database: "pw_test" } },
      defaults: { datasource: "sparkthrift" },
      safety: { allow_write: false },
    }),
    { mode: 0o600 },
  );
  writeFileSync(
    join(dir, "ltqc-wrong-cookie.yaml"),
    stringify({
      schema_version: 2,
      url: "http://example.test",
      auth: { cookie: "dt_tenant_name=other_tenant; sid=wrong-cookie" },
      guard: { expected_tenant: "pw_test" },
      projects: { quality: "pw_test", offline: "pw_test" },
      datasources: { sparkthrift: { name: "pw_test_HADOOP", database: "pw_test" } },
      defaults: { datasource: "sparkthrift" },
      safety: { allow_write: false },
    }),
    { mode: 0o600 },
  );
});

afterEach(() => rmSync(root, { recursive: true, force: true }));

describe("DataAssets v2 runtime profile", () => {
  test("requires kata env run instead of an implicit default", () => {
    expect(() => resolvePlatformEnvName({})).toThrow(/kata env run/);
    expect(() => resolvePlatformEnvName({ KATA_ACTIVE_ENV: "ltqc-local" })).toThrow(
      /kata env run/,
    );
    expect(() => loadPlatformEnvProfile("ltqc-local", { repoRoot: root, env: {} })).toThrow(
      /kata env run/,
    );
  });

  test("loads the private YAML cookie and synchronous resolved IDs", () => {
    const profile = loadPlatformEnvProfile("ltqc-local", { repoRoot: root, resolved });
    expect(profile.schemaVersion).toBe(2);
    expect(profile.urls.assetsBaseUrl).toBe("http://example.test/dataAssets");
    expect(profile.auth.cookie).toContain("sid=test-cookie");
    expect(profile.projects.quality).toEqual({ id: 92, name: "pw_test" });
    expect(profile.datasources.sparkthrift.metadata.id).toBe(547);
    expect(profile.runtime.defaultDatasource).toBe("sparkthrift");
    expect(profile.runtime.allowWrite).toBe(false);
  });

  test("resolves the name from secret-free child JSON", () => {
    const serialized = JSON.stringify(resolved);
    expect(serialized).not.toContain("test-cookie");
    expect(resolvePlatformEnvName({ KATA_ACTIVE_ENV_RESOLVED: serialized })).toBe("ltqc-local");
    const profile = resolveDataAssetsRuntime(
      {
        KATA_ACTIVE_ENV_RESOLVED: serialized,
        KATA_ACTIVE_ENV_CONFIG: join(root, "config/private/environments/ltqc-local.yaml"),
      },
      { repoRoot: root },
    );
    expect(profile.auth.tenantName).toBe("pw_test");
  });

  test("rejects a config path that does not match the selected environment", () => {
    expect(() =>
      resolveDataAssetsRuntime(
        {
          KATA_ACTIVE_ENV_RESOLVED: JSON.stringify(resolved),
          KATA_ACTIVE_ENV_CONFIG: join(root, "config/private/environments/other.yaml"),
        },
        { repoRoot: root },
      ),
    ).toThrow(/does not match/);
  });

  test("converts the Cookie header into in-memory Playwright state", () => {
    const state = cookieHeaderToPlaywrightState(
      "https://example.test",
      "sid=test-cookie; token=value=with-equals; invalid",
    );
    expect(state.cookies.map(({ name, value }) => ({ name, value }))).toEqual([
      { name: "sid", value: "test-cookie" },
      { name: "token", value: "value=with-equals" },
    ]);
  });

  test("loads a named same-platform account into memory without a session file", () => {
    const state = loadNamedDataAssetsAuthState(
      "ltqc-limited",
      { baseUrl: "http://example.test", tenantName: "pw_test" },
      { repoRoot: root },
    );
    expect(state.cookies).toContainEqual(
      expect.objectContaining({ name: "sid", value: "limited-cookie" }),
    );
    expect(() =>
      loadNamedDataAssetsAuthState(
        "ltqc-limited",
        { baseUrl: "http://other.test", tenantName: "pw_test" },
        { repoRoot: root },
      ),
    ).toThrow(/different platform URL/);
    expect(() =>
      loadNamedDataAssetsAuthState(
        "ltqc-wrong-cookie",
        { baseUrl: "http://example.test", tenantName: "pw_test" },
        { repoRoot: root },
      ),
    ).toThrow(/tenant_mismatch/);
  });
});
