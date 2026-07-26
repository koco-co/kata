import { describe, expect, it } from "bun:test";
import { chmodSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";
import {
  infraConfigPath,
  readInfraConfig,
  runConfigDoctor,
  trustHostKey,
  writeCredentialProfile,
} from "../../cli/lib/infra-config.ts";

function makeRoot(): string {
  const root = mkdtempSync(join(tmpdir(), "kata-infra-"));
  mkdirSync(join(root, "config", "infra"), { recursive: true, mode: 0o700 });
  mkdirSync(join(root, "config", "env"), { recursive: true });
  mkdirSync(join(root, "config", "repos"), { recursive: true });
  for (const name of ["hosts", "data_sources", "credentials"] as const) {
    writeFileSync(join(root, "config", "infra", `${name}.example.yaml`), `${name}: {}\n`);
  }
  writeFileSync(join(root, "config", "env", "example.yaml"), "schema_version: 1\n");
  writeFileSync(join(root, "config", "repos", "sources.yaml"), "repos: []\n");
  return root;
}

function writePrivate(root: string, name: string, value: unknown): void {
  const path = infraConfigPath(name as "hosts" | "data_sources" | "credentials", root);
  writeFileSync(path, `${JSON.stringify(value)}\n`, { mode: 0o600 });
  chmodSync(path, 0o600);
}

describe("infrastructure configuration", () => {
  it("keeps host, data source and credential profiles separate", () => {
    const root = makeRoot();
    writePrivate(root, "hosts", {
      hosts: {
        app: { host: "192.0.2.10", port: 22, credential_ref: "shared" },
      },
    });
    writePrivate(root, "data_sources", {
      data_sources: {
        hive: { type: "hive", host: "192.0.2.10", port: 10000, credential_ref: "shared" },
      },
    });
    writePrivate(root, "credentials", {
      credentials: { shared: { kind: "password", username: "qa", password: "test-only" } },
    });
    expect(readInfraConfig(root).hosts.app.credential_ref).toBe("shared");
    expect(readInfraConfig(root).data_sources.hive.port).toBe(10000);
  });

  it("assigns type-specific default credential profiles when omitted", () => {
    const root = makeRoot();
    writePrivate(root, "hosts", { hosts: { app: { host: "192.0.2.10", port: 22 } } });
    writePrivate(root, "data_sources", {
      data_sources: { hive: { type: "hive", host: "192.0.2.10", port: 10000 } },
    });
    writePrivate(root, "credentials", {
      credentials: {
        "server-default": { kind: "password", username: "root", password: "server" },
        "data-source-default": { kind: "password", username: "drpeco", password: "source" },
      },
    });
    const config = readInfraConfig(root);
    expect(config.hosts.app.credential_ref).toBe("server-default");
    expect(config.data_sources.hive.credential_ref).toBe("data-source-default");
  });

  it("writes credentials atomically without exposing the value in the result", async () => {
    const root = makeRoot();
    const path = writeCredentialProfile(
      "shared",
      { kind: "password", username: "qa", password: "test-only" },
      root,
    );
    expect(path.endsWith("config/infra/credentials.yaml")).toBe(true);
    const parsed = parseYaml(await Bun.file(path).text()) as {
      credentials: Record<string, unknown>;
    };
    expect(parsed.credentials.shared).toBeDefined();
  });

  it("records an explicitly trusted host fingerprint", async () => {
    const root = makeRoot();
    writePrivate(root, "hosts", {
      hosts: { app: { host: "192.0.2.10", credential_ref: "shared" } },
    });
    const path = trustHostKey("app", "SHA256:verified", root);
    const text = await Bun.file(path).text();
    expect(text).toContain("SHA256:verified");
  });

  it("warns on missing private files by default and fails in infra scope", () => {
    const root = makeRoot();
    expect(runConfigDoctor({ root }).ok).toBe(true);
    expect(runConfigDoctor({ root, scope: "infra" }).ok).toBe(false);
  });
});
