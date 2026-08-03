import { describe, expect, test } from "bun:test";
import type { Session } from "../../../src/core/auth/login";
import { resolveSession } from "../../../src/core/auth/resolve";

const sess = (cookie: string): Session => ({
  cookie,
  user: "u",
  tenantId: 1,
  tenantName: null,
});

describe("resolveSession", () => {
  test("uses DTSTACK_COOKIE env var when present", async () => {
    process.env.DTSTACK_COOKIE = "from-env=1";
    const out = await resolveSession({
      env: "example-env",
      config: { environments: { "example-env": { baseUrl: "http://x" } }, datasources: {} },
      doLogin: async () => sess("never-called"),
    });
    expect(out.cookie).toBe("from-env=1");
    delete process.env.DTSTACK_COOKIE;
  });

  test("uses the cookie from the selected kata environment", async () => {
    delete process.env.DTSTACK_COOKIE;
    const out = await resolveSession({
      env: "example-env",
      config: {
        environments: { "example-env": { baseUrl: "http://x", cookie: "from-config=1" } },
        datasources: {},
      },
      doLogin: async () => sess("never-called"),
    });
    expect(out.cookie).toBe("from-config=1");
  });

  test("auto-logs-in when neither env var nor store has cookie", async () => {
    delete process.env.DTSTACK_COOKIE;
    const out = await resolveSession({
      env: "example-env",
      config: {
        environments: {
          "example-env": { baseUrl: "http://x", login: { username: "u", password: "p" } },
        },
        datasources: {},
      },
      doLogin: async () => sess("fresh=1"),
    });
    expect(out.cookie).toBe("fresh=1");
  });

  test("throws when no creds available for auto-login", async () => {
    delete process.env.DTSTACK_COOKIE;
    delete process.env.DTSTACK_USERNAME;
    delete process.env.DTSTACK_PASSWORD;
    expect(
      resolveSession({
        env: "example-env",
        config: { environments: { "example-env": { baseUrl: "http://x" } }, datasources: {} },
        doLogin: async () => sess("x"),
      }),
    ).rejects.toThrow(/no credentials/i);
  });
});
