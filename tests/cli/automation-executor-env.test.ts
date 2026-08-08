import { afterEach, describe, expect, it } from "bun:test";
import { mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  AUTOMATION_AUTH_COOKIE_ENV,
  AUTOMATION_PLATFORM_CONTEXT_ENV,
  type PlatformEnvConfig,
  resolveAutomationExecutorEnv,
} from "../../cli/lib/platform-env.ts";

const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

function fixtureRoot(): string {
  const root = mkdtempSync(join(tmpdir(), "automation-executor-env-"));
  roots.push(root);
  return root;
}

function config(cookie = "dt_tenant_name=tenant-a; sid=executor-only-secret"): PlatformEnvConfig {
  return {
    schema_version: 2,
    url: "https://platform.example.test",
    auth: { cookie },
    guard: { expected_tenant: "tenant-a" },
    projects: { quality: "quality-a", offline: "offline-a" },
    datasources: {
      doris: {
        name: "doris-a",
        database: "database-a",
      },
    },
    defaults: { datasource: "doris" },
    safety: { allow_write: true },
    automation: {
      cases: "1-3",
      result_strict: true,
      doris_jdbc_url: "jdbc:mysql://private.example.test:9030/database-a",
      doris_user: "private-user",
      doris_password: "private-password",
    },
  };
}

function response(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

function fetchMock(
  implementation: (input: string | URL | Request, init?: RequestInit) => Promise<Response>,
): typeof fetch {
  return Object.assign(implementation, {
    preconnect: (_url: string | URL, _options?: Parameters<typeof fetch.preconnect>[1]) => {},
  });
}

function resolvedFetch(cookieHeaders: string[]): typeof fetch {
  return fetchMock(async (input, init) => {
    const path = new URL(String(input)).pathname;
    const headers = new Headers(init?.headers);
    cookieHeaders.push(headers.get("cookie") ?? "");
    switch (path) {
      case "/dassets/v1/valid/project/getProjects":
        return response({ code: 1, data: [{ id: 101, name: "quality-a" }] });
      case "/api/rdos/common/project/getProjects":
        return response({ code: 1, data: [{ id: 202, name: "offline-a" }] });
      case "/dmetadata/v1/dataSource/listMetadataDataSource":
        return response({
          code: 1,
          data: [{ dataSourceId: 303, dataSourceName: "doris-a", dataSourceType: 5 }],
        });
      case "/dassets/v1/dataSource/pageQuery":
        return response({
          code: 1,
          data: {
            contentList: [
              {
                id: 404,
                dataSourceName: "doris-a",
                dtCenterSourceName: "doris-center-a",
                dataSourceType: 5,
              },
            ],
          },
        });
      case "/api/rdos/batch/batchDataSource/list":
        return response({
          code: 1,
          data: [{ id: 505, dataName: "doris-center-a", dataSourceType: 5 }],
        });
      default:
        throw new Error(`unexpected test endpoint: ${path}`);
    }
  });
}

describe("automation executor platform environment", () => {
  it("returns only the versioned public context and the isolated cookie secret", async () => {
    const root = fixtureRoot();
    const cookieHeaders: string[] = [];
    const privateConfig = config();

    const overlay = await resolveAutomationExecutorEnv("ci63", {
      repoRoot: root,
      config: privateConfig,
      fetchImpl: resolvedFetch(cookieHeaders),
    });

    expect(AUTOMATION_PLATFORM_CONTEXT_ENV).toBe("AUTOMATION_PLATFORM_CONTEXT");
    expect(AUTOMATION_AUTH_COOKIE_ENV).toBe("AUTOMATION_AUTH_COOKIE");
    expect(Object.keys(overlay).sort()).toEqual(
      [AUTOMATION_AUTH_COOKIE_ENV, AUTOMATION_PLATFORM_CONTEXT_ENV].sort(),
    );
    expect(Object.keys(overlay).every((key) => !/kata/i.test(key))).toBe(true);
    expect(overlay[AUTOMATION_AUTH_COOKIE_ENV]).toBe(privateConfig.auth.cookie);
    expect(cookieHeaders.length).toBeGreaterThan(0);
    expect(cookieHeaders.every((value) => value === privateConfig.auth.cookie)).toBe(true);

    const contextText = overlay[AUTOMATION_PLATFORM_CONTEXT_ENV];
    const context = JSON.parse(contextText) as {
      schemaVersion: number;
      env: string;
      urls: { baseUrl: string };
      tenant: { name: string };
      projects: {
        quality: { id: number; name: string };
        offline?: { id: number; name: string };
      };
      safety: { allowWrite: boolean };
      automation?: Record<string, unknown>;
    };
    expect(context.schemaVersion).toBe(2);
    expect(context.env).toBe("ci63");
    expect(context.urls.baseUrl).toBe(privateConfig.url);
    expect(context.tenant.name).toBe("tenant-a");
    expect(context.projects).toEqual({
      quality: { id: 101, name: "quality-a" },
      offline: { id: 202, name: "offline-a" },
    });
    expect(context.safety.allowWrite).toBe(true);
    expect(context.automation).toEqual({ cases: "1-3", result_strict: true });
    expect(contextText).not.toContain(privateConfig.auth.cookie);
    expect(contextText).not.toContain("private-password");
    expect(contextText).not.toContain("private-user");
    expect(contextText).not.toContain("jdbc:mysql://private.example.test");
    expect(contextText).not.toContain("config/private");
    expect(readdirSync(root)).toEqual([]);
  });

  it("does not expose the cookie when online resolution fails", async () => {
    const root = fixtureRoot();
    const secret = "dt_tenant_name=tenant-a; sid=never-report-this-secret";
    const fetchImpl = fetchMock(async (input) => {
      const path = new URL(String(input)).pathname;
      switch (path) {
        case "/dassets/v1/valid/project/getProjects":
          return response({ code: 1, data: [] });
        case "/api/rdos/common/project/getProjects":
        case "/dmetadata/v1/dataSource/listMetadataDataSource":
          return response({ code: 1, data: [] });
        case "/dassets/v1/dataSource/pageQuery":
          return response({ code: 1, data: { contentList: [] } });
        default:
          throw new Error(`unexpected test endpoint: ${path}`);
      }
    });

    let message = "";
    try {
      await resolveAutomationExecutorEnv("ci63", {
        repoRoot: root,
        config: config(secret),
        fetchImpl,
      });
    } catch (error) {
      message = error instanceof Error ? error.message : String(error);
    }

    expect(message).toContain("quality_project_not_found");
    expect(message).not.toContain(secret);
    expect(message).not.toContain("never-report-this-secret");
    expect(readdirSync(root)).toEqual([]);
  });

  it("rejects an invalid Cookie header before online resolution", async () => {
    const root = fixtureRoot();
    const secret = "dt_tenant_name=tenant-a; sid=first; sid=never-report-this-cookie-fragment";
    let requests = 0;
    let message = "";
    try {
      await resolveAutomationExecutorEnv("ci63", {
        repoRoot: root,
        config: config(secret),
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
    expect(readdirSync(root)).toEqual([]);
  });
});
