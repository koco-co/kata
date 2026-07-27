import { describe, expect, it } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { readDotEnvFile } from "../../cli/lib/env.ts";
import {
  loadZentaoConfig,
  migrateDotEnvPlugins,
  pluginConfigPath,
} from "../../cli/lib/plugin-config.ts";

const KATA = resolve(import.meta.dir, "../../cli/bin/kata.ts");

function proj(): string {
  const root = mkdtempSync(join(tmpdir(), "kata-env-"));
  mkdirSync(join(root, "workspace"), { recursive: true });
  writeFileSync(join(root, "package.json"), "{}");
  return root;
}

function kata(root: string, args: string[]) {
  return spawnSync("bun", [KATA, ...args], { encoding: "utf8", cwd: root });
}

describe("readDotEnvFile", () => {
  it("parses export prefixes, inline comments, quotes and empty values", () => {
    const dir = mkdtempSync(join(tmpdir(), "kata-dotenv-"));
    const file = join(dir, ".env");
    writeFileSync(
      file,
      [
        "# full-line comment",
        "export KATA_A=1",
        "KATA_B=two # trailing comment",
        'KATA_C="quoted # not a comment"',
        "KATA_D=",
        "export KATA_E='single quoted'",
        "KATA_F=value#not-a-comment",
        "",
      ].join("\n"),
    );
    expect(readDotEnvFile(file)).toEqual({
      KATA_A: "1",
      KATA_B: "two",
      KATA_C: "quoted # not a comment",
      KATA_D: "",
      KATA_E: "single quoted",
      KATA_F: "value#not-a-comment",
    });
  });

  it("returns an empty map for a missing file", () => {
    expect(readDotEnvFile(join(tmpdir(), "kata-no-such-env-file"))).toEqual({});
  });
});

describe("plugin config env override", () => {
  it("treats an empty-string env var as unset and falls back to the YAML value", () => {
    const root = mkdtempSync(join(tmpdir(), "kata-plugin-env-"));
    mkdirSync(join(root, "config", "plugin"), { recursive: true });
    writeFileSync(pluginConfigPath("zentao", root), "cookie: yaml-cookie\n");
    expect(loadZentaoConfig(root, { KATA_ZENTAO_COOKIE: "" }).cookie).toBe("yaml-cookie");
    expect(loadZentaoConfig(root, { KATA_ZENTAO_COOKIE: "env-cookie" }).cookie).toBe("env-cookie");
  });

  it("migrates dotenv files with export prefixes and inline comments", () => {
    const root = mkdtempSync(join(tmpdir(), "kata-plugin-mig-"));
    mkdirSync(join(root, "config", "plugin"), { recursive: true });
    const source = join(root, "old.env");
    writeFileSync(source, "export KATA_LANHU_COOKIE=lanhu # rotated\nKATA_ZENTAO_BASE_URL=\n");
    const result = migrateDotEnvPlugins(source, root);
    expect(result.removedKeys).toContain("KATA_LANHU_COOKIE");
    // 空值键出现在 removedKeys(会从 dotenv 清除)但不写入 yaml 内容
    expect(result.removedKeys).toContain("KATA_ZENTAO_BASE_URL");
    expect(readFileSync(pluginConfigPath("lanhu", root), "utf8")).toContain("lanhu");
    expect(readFileSync(pluginConfigPath("zentao", root), "utf8")).not.toContain("base_url");
  });
});

describe("kata env", () => {
  it("adds, lists and shows an environment with the cookie redacted", () => {
    const root = proj();
    const add = kata(root, ["env", "add", "demo", "--url", "https://demo.example.com"]);
    expect(add.status).toBe(0);
    expect(JSON.parse(add.stdout).created).toBe(true);

    const list = kata(root, ["env", "list"]);
    expect(list.status).toBe(0);
    const envs = JSON.parse(list.stdout) as Array<{
      name: string;
      cookieConfigured: boolean;
      valid: boolean;
    }>;
    expect(envs).toHaveLength(1);
    expect(envs[0]).toMatchObject({ name: "demo", cookieConfigured: false, valid: true });

    const show = kata(root, ["env", "show", "demo"]);
    expect(show.status).toBe(0);
    const shown = JSON.parse(show.stdout) as { url: string; auth: { cookie: string } };
    expect(shown.url).toBe("https://demo.example.com");
    expect(shown.auth.cookie).toBe("");
  });

  it("rejects adding a duplicate environment", () => {
    const root = proj();
    expect(kata(root, ["env", "add", "demo", "--url", "https://demo.example.com"]).status).toBe(0);
    const dup = kata(root, ["env", "add", "demo", "--url", "https://demo.example.com"]);
    expect(dup.status).not.toBe(0);
  });

  it("rejects an invalid platform url", () => {
    const root = proj();
    const r = kata(root, ["env", "add", "demo", "--url", "not-a-url"]);
    expect(r.status).not.toBe(0);
  });
});
