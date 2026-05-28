import { describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadAllPlugins } from "../../lib/plugin-utils.ts";

describe("plugin runtime metadata", () => {
  it("loads plugins from contract runtime metadata without legacy plugin.json", () => {
    const root = mkdtempSync(join(tmpdir(), "kata-runtime-plugin-"));
    const lanhu = join(root, "lanhu");
    mkdirSync(lanhu, { recursive: true });
    writeFileSync(
      join(lanhu, "runtime.json"),
      JSON.stringify({
        name: "lanhu",
        description: "Contract Lanhu adapter",
        env_required: ["KATA_LANHU_COOKIE"],
        url_patterns: ["lanhuapp.com"],
        commands: {
          fetch: "bun run plugins/lanhu/fetch.ts --url {{url}} --project {{project}}",
        },
      }),
    );

    const plugins = loadAllPlugins(root, { env: { KATA_LANHU_COOKIE: "test-stub" } });

    expect(plugins).toHaveLength(1);
    expect(plugins[0].name).toBe("lanhu");
    expect(plugins[0].active).toBe(true);
    expect(plugins[0].data.commands?.fetch).toContain("plugins/lanhu/fetch.ts");
  });

  it("reports legacy plugin.json drift against contract runtime metadata", () => {
    const root = mkdtempSync(join(tmpdir(), "kata-runtime-plugin-drift-"));
    const lanhu = join(root, "lanhu");
    mkdirSync(lanhu, { recursive: true });
    writeFileSync(
      join(lanhu, "runtime.json"),
      JSON.stringify({
        name: "lanhu",
        url_patterns: ["lanhuapp.com"],
        commands: { fetch: "runtime-command" },
      }),
    );
    writeFileSync(
      join(lanhu, "plugin.json"),
      JSON.stringify({
        name: "lanhu",
        url_patterns: ["other.example"],
        commands: { fetch: "legacy-command" },
      }),
    );

    const plugins = loadAllPlugins(root);

    expect(plugins[0].issues).toContainEqual(
      expect.objectContaining({
        code: "plugin_runtime.legacy_drift",
      }),
    );
  });
});
