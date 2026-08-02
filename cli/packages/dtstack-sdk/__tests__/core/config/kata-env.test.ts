import { expect, test } from "bun:test";
import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { stringify } from "yaml";
import { loadKataEnvironment } from "../../../src/core/config/kata-env";

test("loadKataEnvironment reads URL and cookie from config/private/environments", () => {
  const root = mkdtempSync(join(tmpdir(), "dtstack-kata-env-"));
  const envDir = join(root, "config", "private", "environments");
  mkdirSync(envDir, { recursive: true, mode: 0o700 });
  chmodSync(envDir, 0o700);
  const configPath = join(envDir, "ci78.yaml");
  writeFileSync(
    configPath,
    stringify({
      schema_version: 2,
      url: "https://platform.example",
      auth: { cookie: "sid=from-config" },
      guard: { expected_tenant: "pw_test" },
      projects: { quality: "pw_test", offline: "pw_test" },
      datasources: { sparkthrift: { name: "pw_test_HADOOP", database: "pw_test" } },
      defaults: { datasource: "sparkthrift" },
      safety: { allow_write: false },
    }),
    { mode: 0o600 },
  );

  try {
    const config = loadKataEnvironment("ci78", {
      KATA_ACTIVE_ENV_CONFIG: configPath,
      KATA_ACTIVE_ENV_RESOLVED: JSON.stringify({
        env: "ci78",
        urls: { baseUrl: "https://resolved.example" },
      }),
    });
    expect(config).toEqual({
      name: "ci78",
      baseUrl: "https://resolved.example",
      cookie: "sid=from-config",
    });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
