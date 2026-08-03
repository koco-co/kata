import { describe, expect, it } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { loadZentaoConfig, pluginConfigPath } from "../../cli/lib/plugin-config.ts";

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

describe("plugin config", () => {
  it("loads values from the private YAML regardless of process env", () => {
    const root = mkdtempSync(join(tmpdir(), "kata-plugin-env-"));
    mkdirSync(join(root, "config", "private", "integrations"), { recursive: true });
    writeFileSync(pluginConfigPath("zentao", root), "cookie: yaml-cookie\n");
    expect(loadZentaoConfig(root).cookie).toBe("yaml-cookie");
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

  it("documents explicit project selection for env run", () => {
    const root = proj();
    const result = kata(root, ["env", "run", "--help"]);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("--project <name>");
  });

  it("documents explicit project selection for automation run", () => {
    const root = proj();
    const result = kata(root, ["automation", "run", "--help"]);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("--project <name>");
    expect(result.stdout).not.toContain("dataAssets");
  });
});
