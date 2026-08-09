import { describe, expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  assertPlatformEnvTenantCookie,
  listPlatformEnvs,
  type PlatformEnvConfig,
  readPlatformEnvConfig,
  resolvePlatformEnv,
  setPlatformEnvCookie,
} from "../../cli/lib/platform-env.ts";

function fetchMock(
  implementation: (input: string | URL | Request) => Promise<Response>,
): typeof fetch {
  return Object.assign(implementation, {
    preconnect: (_url: string | URL, _options?: Parameters<typeof fetch.preconnect>[1]) => {},
  });
}

function response(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

function config(): PlatformEnvConfig {
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

function linkedEnvironmentRoot(): { main: string; linked: string; cleanup: () => void } {
  const container = mkdtempSync(join(tmpdir(), "kata-platform-env-worktree-"));
  const main = join(container, "main");
  const linked = join(container, "linked");
  mkdirSync(main);
  writeFileSync(join(main, "README.md"), "fixture\n");
  execFileSync("git", ["init", "-q", "-b", "main", main]);
  execFileSync("git", ["-C", main, "add", "README.md"]);
  execFileSync("git", [
    "-C",
    main,
    "-c",
    "user.name=Kata Test",
    "-c",
    "user.email=kata@example.invalid",
    "commit",
    "-q",
    "-m",
    "fixture",
  ]);
  execFileSync("git", ["-C", main, "worktree", "add", "-q", "--detach", linked, "HEAD"]);
  const envDir = join(main, "config", "private", "environments");
  mkdirSync(envDir, { recursive: true, mode: 0o700 });
  chmodSync(join(main, "config", "private"), 0o700);
  chmodSync(envDir, 0o700);
  return {
    main,
    linked,
    cleanup: () => {
      execFileSync("git", ["-C", main, "worktree", "remove", "--force", linked]);
      rmSync(container, { recursive: true, force: true });
    },
  };
}

describe("platform environment datasource inventory compatibility", () => {
  test("keeps the public environment example executor-neutral", () => {
    const example = readFileSync(
      join(import.meta.dir, "../../config/examples/environments/env.example.yaml"),
      "utf8",
    );

    expect(example).not.toMatch(/^\s*#?\s*automation:/m);
  });

  test("rejects the retired top-level automation tuning node", () => {
    const root = mkdtempSync(join(tmpdir(), "kata-platform-env-retired-automation-"));
    const envDir = join(root, "config", "private", "environments");
    mkdirSync(envDir, { recursive: true, mode: 0o700 });
    chmodSync(envDir, 0o700);
    const path = join(envDir, "fixture.yaml");
    writeFileSync(
      path,
      [
        "schema_version: 2",
        "url: https://platform.example.invalid",
        "auth:",
        '  cookie: ""',
        "guard:",
        "  expected_tenant: tenant-a",
        "projects:",
        "  quality: quality-a",
        "datasources:",
        "  sparkthrift:",
        "    name: spark-a",
        "    database: database-a",
        "defaults:",
        "  datasource: sparkthrift",
        "safety:",
        "  allow_write: false",
        "automation:",
        "  cases: C0001",
        "",
      ].join("\n"),
      { mode: 0o600 },
    );
    chmodSync(path, 0o600);

    try {
      expect(() => readPlatformEnvConfig("fixture", { repoRoot: root })).toThrow(
        "environment contains unsupported keys: automation",
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("rejects duplicate Cookie names before tenant validation without exposing the header", () => {
    const secret = "dt_tenant_name=tenant-a; sid=first; sid=never-report-this-cookie-fragment";
    let message = "";
    try {
      assertPlatformEnvTenantCookie({ ...config(), auth: { cookie: secret } });
    } catch (error) {
      message = error instanceof Error ? error.message : String(error);
    }

    expect(message).toContain("AUTH_COOKIE_INVALID");
    expect(message).not.toContain(secret);
    expect(message).not.toContain("never-report-this-cookie-fragment");
  });

  test("set rejects an invalid Cookie header before filesystem or network access", async () => {
    const root = mkdtempSync(join(tmpdir(), "kata-platform-env-invalid-cookie-"));
    try {
      const secret = "dt_tenant_name=tenant-a; sid=first; sid=never-report-this-cookie-fragment";
      let requests = 0;
      let message = "";
      try {
        await setPlatformEnvCookie("shared", secret, {
          repoRoot: root,
          fetchImpl: fetchMock(async () => {
            requests += 1;
            return response({ code: 1, data: [] });
          }),
        });
      } catch (error) {
        message = error instanceof Error ? error.message : String(error);
      }

      expect(message).toContain("AUTH_COOKIE_INVALID");
      expect(message).not.toContain(secret);
      expect(message).not.toContain("never-report-this-cookie-fragment");
      expect(requests).toBe(0);
      expect(existsSync(join(root, "config"))).toBe(false);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("reads and lists shared environments from a linked worktree", () => {
    const fixture = linkedEnvironmentRoot();
    try {
      const path = join(fixture.main, "config", "private", "environments", "shared.yaml");
      writeFileSync(
        path,
        [
          "schema_version: 2",
          "url: https://platform.example.invalid",
          "auth:",
          '  cookie: ""',
          "guard:",
          "  expected_tenant: tenant-a",
          "projects:",
          "  quality: quality-a",
          "datasources:",
          "  sparkthrift:",
          "    name: spark-a",
          "    database: database-a",
          "defaults:",
          "  datasource: sparkthrift",
          "safety:",
          "  allow_write: false",
          "",
        ].join("\n"),
        { mode: 0o600 },
      );
      chmodSync(path, 0o600);

      expect(readPlatformEnvConfig("shared", { repoRoot: fixture.linked }).url).toBe(
        "https://platform.example.invalid",
      );
      expect(listPlatformEnvs({ repoRoot: fixture.linked }).map((item) => item.name)).toEqual([
        "shared",
      ]);
    } finally {
      fixture.cleanup();
    }
  });

  test("rejects an invalid stored Cookie header without exposing it", () => {
    const fixture = linkedEnvironmentRoot();
    const secret = "dt_tenant_name=tenant-a; sid=first; sid=never-report-this-cookie-fragment";
    try {
      const path = join(fixture.main, "config", "private", "environments", "shared.yaml");
      writeFileSync(
        path,
        [
          "schema_version: 2",
          "url: https://platform.example.invalid",
          "auth:",
          `  cookie: ${JSON.stringify(secret)}`,
          "guard:",
          "  expected_tenant: tenant-a",
          "projects:",
          "  quality: quality-a",
          "datasources:",
          "  sparkthrift:",
          "    name: spark-a",
          "    database: database-a",
          "defaults:",
          "  datasource: sparkthrift",
          "safety:",
          "  allow_write: false",
          "",
        ].join("\n"),
        { mode: 0o600 },
      );
      chmodSync(path, 0o600);

      let message = "";
      try {
        readPlatformEnvConfig("shared", { repoRoot: fixture.linked });
      } catch (error) {
        message = error instanceof Error ? error.message : String(error);
      }
      expect(message).toContain("AUTH_COOKIE_INVALID");
      expect(message).not.toContain(secret);
      expect(message).not.toContain("never-report-this-cookie-fragment");
    } finally {
      fixture.cleanup();
    }
  });

  test("setPlatformEnvCookie writes a local override in linked worktrees", async () => {
    const fixture = linkedEnvironmentRoot();
    try {
      const sharedPath = join(fixture.main, "config", "private", "environments", "shared.yaml");
      writeFileSync(
        sharedPath,
        [
          "schema_version: 2",
          "url: https://platform.example.invalid",
          "auth:",
          '  cookie: "dt_tenant_name=tenant-a; sid=shared-only"',
          "guard:",
          "  expected_tenant: tenant-a",
          "projects:",
          "  quality: quality-a",
          "datasources:",
          "  sparkthrift:",
          "    name: spark-a",
          "    database: database-a",
          "    requires_offline: false",
          "defaults:",
          "  datasource: sparkthrift",
          "safety:",
          "  allow_write: false",
          "",
        ].join("\n"),
        { mode: 0o600 },
      );
      chmodSync(sharedPath, 0o600);

      const fetchImpl = fetchMock(async (input) => {
        const path = new URL(String(input)).pathname;
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
      });

      await setPlatformEnvCookie("shared", "dt_tenant_name=tenant-a; sid=local-only", {
        repoRoot: fixture.linked,
        fetchImpl,
      });

      const localPath = join(fixture.linked, "config", "private", "environments", "shared.yaml");
      expect(existsSync(localPath)).toBe(true);
      expect(readFileSync(localPath, "utf8")).toContain("sid=local-only");
      expect(readFileSync(sharedPath, "utf8")).toContain("sid=shared-only");
      expect(statSync(localPath).mode & 0o777).toBe(0o600);
    } finally {
      fixture.cleanup();
    }
  });

  test("falls back to exact metadata sources for the known server class-loading failure", async () => {
    const paths: string[] = [];
    const fetchImpl = fetchMock(async (input) => {
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
    });

    const resolved = await resolvePlatformEnv("fixture", {
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
    const fetchImpl = fetchMock(async (input) => {
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
    });

    await expect(resolvePlatformEnv("fixture", { config: config(), fetchImpl })).rejects.toThrow(
      "datasource_sparkthrift_assets_not_found",
    );
  });

  test("rejects a symlinked environment directory before reading it", () => {
    const root = mkdtempSync(join(tmpdir(), "kata-env-read-"));
    const configDir = join(root, "config", "private");
    const outside = mkdtempSync(join(tmpdir(), "kata-env-read-outside-"));
    mkdirSync(configDir, { recursive: true });
    symlinkSync(outside, join(configDir, "environments"));
    try {
      expect(() => readPlatformEnvConfig("fixture", { repoRoot: root })).toThrow(/符号链接/);
    } finally {
      rmSync(join(configDir, "environments"), { force: true });
      rmSync(root, { recursive: true, force: true });
      rmSync(outside, { recursive: true, force: true });
    }
  });
});
