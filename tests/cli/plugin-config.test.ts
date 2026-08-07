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
import { join, resolve } from "node:path";
import {
  loadNotifyConfig,
  loadZentaoConfig,
  pluginConfigPath,
  updatePluginConfig,
} from "../../cli/lib/plugin-config.ts";

function root(): string {
  const value = mkdtempSync(join(tmpdir(), "kata-plugin-"));
  mkdirSync(join(value, "config", "private", "integrations"), { recursive: true, mode: 0o700 });
  chmodSync(join(value, "config", "private", "integrations"), 0o700);
  return value;
}

function linkedRoot(): { main: string; linked: string; cleanup: () => void } {
  const container = mkdtempSync(join(tmpdir(), "kata-plugin-worktree-"));
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
  for (const repo of [main, linked]) {
    mkdirSync(join(repo, "config", "private", "integrations"), {
      recursive: true,
      mode: 0o700,
    });
    chmodSync(join(repo, "config", "private", "integrations"), 0o700);
  }
  return {
    main,
    linked,
    cleanup: () => {
      execFileSync("git", ["-C", main, "worktree", "remove", "--force", linked]);
      rmSync(container, { recursive: true, force: true });
    },
  };
}

describe("plugin configuration", () => {
  test("documents private YAML as the sole ZenTao secret channel", () => {
    const repo = resolve(import.meta.dir, "../..");
    const readme = readFileSync(join(repo, "cli", "integrations", "zentao", "README.md"), "utf8");
    const session = readFileSync(join(repo, "cli", "integrations", "zentao", "session.ts"), "utf8");

    expect(readme).not.toContain("KATA_ZENTAO_");
    expect(session).not.toContain("explicit env override");
  });

  test("loads YAML values from the private config file", () => {
    const value = root();
    writeFileSync(
      pluginConfigPath("zentao", value),
      "base_url: http://yaml\ncookie: yaml-cookie\nusername: yaml-user\n",
      { mode: 0o600 },
    );
    const config = loadZentaoConfig(value);
    expect(config.base_url).toBe("http://yaml");
    expect(config.cookie).toBe("yaml-cookie");
    expect(config.username).toBe("yaml-user");
    expect("schema_version" in config).toBe(false);
  });

  test("loads notification groups without dotenv", () => {
    const value = root();
    writeFileSync(
      pluginConfigPath("notify", value),
      "dingtalk:\n  webhook_url: http://hook\nsmtp:\n  port: 465\n",
      { mode: 0o600 },
    );
    const config = loadNotifyConfig(value);
    expect(config.dingtalk?.webhook_url).toBe("http://hook");
    expect(config.smtp?.port).toBe("465");
    expect(config.enabled).toBe(true);
    expect(config.enabled_events).toBeUndefined();
    expect(config.dingtalk?.enabled).toBe(true);
  });

  test("resolves each integration file independently across linked and shared private roots", () => {
    const fixture = linkedRoot();
    try {
      writeFileSync(
        join(fixture.linked, "config", "private", "integrations", "lanhu.yaml"),
        "cookie: local\n",
        {
          mode: 0o600,
        },
      );
      writeFileSync(
        join(fixture.main, "config", "private", "integrations", "zentao.yaml"),
        "base_url: https://zentao.example.invalid\nusername: shared-user\n",
        { mode: 0o600 },
      );

      expect(loadZentaoConfig(fixture.linked).username).toBe("shared-user");
    } finally {
      fixture.cleanup();
    }
  });

  test("keeps explicit notification allow-list and channel switch", () => {
    const value = root();
    writeFileSync(
      pluginConfigPath("notify", value),
      "enabled: false\nenabled_events: [cases-built]\ndingtalk:\n  enabled: false\n",
      { mode: 0o600 },
    );
    const config = loadNotifyConfig(value);
    expect(config.enabled).toBe(false);
    expect(config.enabled_events).toEqual(["cases-built"]);
    expect(config.dingtalk?.enabled).toBe(false);
  });

  test("rejects invalid notification booleans instead of failing open", () => {
    const top = root();
    writeFileSync(
      pluginConfigPath("notify", top),
      "enabled: maybe\nenabled_events: [cases-built]\n",
      { mode: 0o600 },
    );
    expect(() => loadNotifyConfig(top)).toThrow(/notify 配置 enabled 必须为 true\/false/);

    const channel = root();
    writeFileSync(
      pluginConfigPath("notify", channel),
      "enabled_events: [cases-built]\ndingtalk:\n  enabled: maybe\n  webhook_url: http://hook\n",
      { mode: 0o600 },
    );
    expect(() => loadNotifyConfig(channel)).toThrow(
      /notify 配置 dingtalk\.enabled 必须为 true\/false/,
    );
  });

  test("rejects retired notify switches so old configs fail closed", () => {
    const top = root();
    writeFileSync(
      pluginConfigPath("notify", top),
      "is_enable: false\nenabled_events: [cases-built]\ndingtalk:\n  webhook_url: http://hook\n",
      { mode: 0o600 },
    );
    expect(() => loadNotifyConfig(top)).toThrow(/已退役字段 is_enable/);

    const channel = root();
    writeFileSync(
      pluginConfigPath("notify", channel),
      "enabled_events: [cases-built]\ndingtalk:\n  is_enable: false\n  webhook_url: http://hook\n",
      { mode: 0o600 },
    );
    expect(() => loadNotifyConfig(channel)).toThrow(/dingtalk.*已退役字段 is_enable/);

    const smtp = root();
    writeFileSync(
      pluginConfigPath("notify", smtp),
      "enabled_events: [cases-built]\nsmtp:\n  host: smtp.example.invalid\n  pass: secret\n",
      { mode: 0o600 },
    );
    expect(() => loadNotifyConfig(smtp)).toThrow(/smtp.*已退役字段 pass/);
  });

  test("updates a cookie atomically and keeps the file private", () => {
    const value = root();
    writeFileSync(pluginConfigPath("lanhu", value), "cookie: old\n", {
      mode: 0o600,
    });
    updatePluginConfig("lanhu", { cookie: "fresh" }, value);
    expect(readFileSync(pluginConfigPath("lanhu", value), "utf8")).toContain("fresh");
    expect(statSync(pluginConfigPath("lanhu", value)).mode & 0o777).toBe(0o600);
  });

  test("rejects a symlinked local plugin directory before reading or writing", () => {
    const value = root();
    const outside = mkdtempSync(join(tmpdir(), "kata-plugin-outside-"));
    const dir = join(value, "config", "private", "integrations");
    rmSync(dir, { recursive: true, force: true });
    symlinkSync(outside, dir);
    try {
      expect(() => updatePluginConfig("lanhu", { cookie: "fresh" }, value)).toThrow(/符号链接/);
      expect(existsSync(join(outside, "lanhu.yaml"))).toBe(false);
    } finally {
      rmSync(dir, { force: true });
      rmSync(outside, { recursive: true, force: true });
    }
  });
});
