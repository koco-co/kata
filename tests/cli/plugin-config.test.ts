import { describe, expect, test } from "bun:test";
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  loadNotifyConfig,
  loadZentaoConfig,
  migrateDotEnvPlugins,
  pluginConfigPath,
  updatePluginConfig,
} from "../../cli/lib/plugin-config.ts";

function root(): string {
  const value = mkdtempSync(join(tmpdir(), "kata-plugin-"));
  mkdirSync(join(value, "config", "plugin"), { recursive: true, mode: 0o700 });
  chmodSync(join(value, "config", "plugin"), 0o700);
  return value;
}

describe("plugin configuration", () => {
  test("loads YAML values and explicit environment overrides", () => {
    const value = root();
    writeFileSync(
      pluginConfigPath("zentao", value),
      "schema_version: 1\nbase_url: http://yaml\ncookie: yaml-cookie\nusername: yaml-user\n",
      { mode: 0o600 },
    );
    const config = loadZentaoConfig(value, { KATA_ZENTAO_COOKIE: "env-cookie" });
    expect(config.base_url).toBe("http://yaml");
    expect(config.cookie).toBe("env-cookie");
    expect(config.username).toBe("yaml-user");
  });

  test("loads notification groups without dotenv", () => {
    const value = root();
    writeFileSync(
      pluginConfigPath("notify", value),
      "schema_version: 1\ndingtalk:\n  webhook_url: http://hook\nsmtp:\n  port: 465\n",
      { mode: 0o600 },
    );
    const config = loadNotifyConfig(value);
    expect(config.dingtalk?.webhook_url).toBe("http://hook");
    expect(config.smtp?.port).toBe("465");
  });

  test("updates a cookie atomically and keeps the file private", () => {
    const value = root();
    writeFileSync(pluginConfigPath("lanhu", value), "schema_version: 1\ncookie: old\n", {
      mode: 0o600,
    });
    updatePluginConfig("lanhu", { cookie: "fresh" }, value);
    expect(readFileSync(pluginConfigPath("lanhu", value), "utf8")).toContain("fresh");
    expect(statSync(pluginConfigPath("lanhu", value)).mode & 0o777).toBe(0o600);
  });

  test("migrates only supported non-empty dotenv values", () => {
    const value = root();
    const source = join(value, "old.env");
    writeFileSync(
      source,
      "KATA_LANHU_COOKIE=lanhu\nKATA_ZENTAO_BASE_URL=http://zt\nKATA_DINGTALK_SIGN_SECRET=secret\nKATA_DB_URL=mysql://ignored\n",
      { mode: 0o600 },
    );
    const result = migrateDotEnvPlugins(source, value);
    expect(result.written).toHaveLength(3);
    expect(result.removedKeys).toContain("KATA_LANHU_COOKIE");
    expect(result.removedKeys).not.toContain("KATA_DB_URL");
    expect(readFileSync(pluginConfigPath("zentao", value), "utf8")).toContain("http://zt");
  });
});
