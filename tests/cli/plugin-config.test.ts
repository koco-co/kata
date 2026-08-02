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
  test("loads YAML values and explicit environment overrides", () => {
    const value = root();
    writeFileSync(
      pluginConfigPath("zentao", value),
      "base_url: http://yaml\ncookie: yaml-cookie\nusername: yaml-user\n",
      { mode: 0o600 },
    );
    const config = loadZentaoConfig(value, { KATA_ZENTAO_COOKIE: "env-cookie" });
    expect(config.base_url).toBe("http://yaml");
    expect(config.cookie).toBe("env-cookie");
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
    expect(config.is_enable).toBe(true);
    expect(config.enabled_events).toBeUndefined();
    expect(config.dingtalk?.is_enable).toBe(true);
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

      expect(loadZentaoConfig(fixture.linked, {}).username).toBe("shared-user");
    } finally {
      fixture.cleanup();
    }
  });

  test("keeps explicit notification allow-list and channel switch", () => {
    const value = root();
    writeFileSync(
      pluginConfigPath("notify", value),
      "is_enable: false\nenabled_events: [cases-built]\ndingtalk:\n  is_enable: false\n",
      { mode: 0o600 },
    );
    const config = loadNotifyConfig(value);
    expect(config.is_enable).toBe(false);
    expect(config.enabled_events).toEqual(["cases-built"]);
    expect(config.dingtalk?.is_enable).toBe(false);
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
