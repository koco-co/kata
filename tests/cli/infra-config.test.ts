import { describe, expect, it } from "bun:test";
import { execFileSync } from "node:child_process";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
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
  mkdirSync(join(root, "config", "private", "infrastructure"), { recursive: true, mode: 0o700 });
  mkdirSync(join(root, "config", "private", "environments"), { recursive: true, mode: 0o700 });
  mkdirSync(join(root, "config", "private", "integrations"), { recursive: true, mode: 0o700 });
  chmodSync(join(root, "config", "private", "environments"), 0o700);
  chmodSync(join(root, "config", "private", "integrations"), 0o700);
  mkdirSync(join(root, "config", "private"), { recursive: true, mode: 0o700 });
  chmodSync(join(root, "config", "private"), 0o700);
  mkdirSync(join(root, "config", "examples", "infrastructure"), { recursive: true, mode: 0o700 });
  mkdirSync(join(root, "config", "examples", "environments"), { recursive: true, mode: 0o700 });
  for (const name of ["hosts", "data_sources", "credentials"] as const) {
    writeFileSync(
      join(root, "config", "examples", "infrastructure", `${name}.example.yaml`),
      `${name}: {}\n`,
    );
  }
  writeFileSync(
    join(root, "config", "examples", "environments", "env.example.yaml"),
    "schema_version: 2\n",
  );
  writeFileSync(join(root, "config", "examples", "repositories.example.yaml"), "repos: []\n");
  return root;
}

function writePrivate(root: string, name: string, value: unknown): void {
  const path = infraConfigPath(name as "hosts" | "data_sources" | "credentials", root);
  writeFileSync(path, `${JSON.stringify(value)}\n`, { mode: 0o600 });
  chmodSync(path, 0o600);
}

function makeLinkedInfraWorktree(): { main: string; linked: string; cleanup: () => void } {
  const container = mkdtempSync(join(tmpdir(), "kata-infra-worktree-"));
  const main = join(container, "main");
  const linked = join(container, "linked");
  mkdirSync(main);
  mkdirSync(join(main, "config", "examples", "infrastructure"), { recursive: true });
  for (const name of ["hosts", "data_sources", "credentials"] as const) {
    writeFileSync(
      join(main, "config", "examples", "infrastructure", `${name}.example.yaml`),
      `${name}: {}\n`,
    );
  }
  writeFileSync(join(main, "README.md"), "fixture\n");
  execFileSync("git", ["init", "-q", "-b", "main", main]);
  execFileSync("git", ["-C", main, "add", "README.md", "config/examples"]);
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
  mkdirSync(join(main, "config", "private", "infrastructure"), {
    recursive: true,
    mode: 0o700,
  });
  chmodSync(join(main, "config", "private"), 0o700);
  chmodSync(join(main, "config", "private", "infrastructure"), 0o700);
  return {
    main,
    linked,
    cleanup: () => {
      execFileSync("git", ["-C", main, "worktree", "remove", "--force", linked]);
      rmSync(container, { recursive: true, force: true });
    },
  };
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

  it("reads and diagnoses shared infrastructure from a linked worktree", () => {
    const fixture = makeLinkedInfraWorktree();
    try {
      writePrivate(fixture.main, "hosts", {
        hosts: { app: { host: "192.0.2.10", port: 22, credential_ref: "shared" } },
      });
      writePrivate(fixture.main, "data_sources", {
        data_sources: {
          hive: { type: "hive", host: "192.0.2.10", port: 10000, credential_ref: "shared" },
        },
      });
      writePrivate(fixture.main, "credentials", {
        credentials: { shared: { kind: "password", username: "qa", password: "test-only" } },
      });

      expect(readInfraConfig(fixture.linked).data_sources.hive.port).toBe(10000);
      const diagnosis = runConfigDoctor({ root: fixture.linked, scope: "infra" });
      expect(diagnosis.ok).toBe(true);
      expect(diagnosis.checked).toContain(
        realpathSync(join(fixture.main, "config", "private", "infrastructure", "hosts.yaml")),
      );
      expect(diagnosis.checked).not.toContain(
        join(fixture.linked, "config", "private", "infrastructure", "hosts.yaml"),
      );
      expect(runConfigDoctor({ root: fixture.linked, scope: "infra", fix: true }).ok).toBe(true);
      expect(existsSync(join(fixture.linked, "config", "private"))).toBe(false);
    } finally {
      fixture.cleanup();
    }
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
    expect(path.endsWith("config/private/infrastructure/credentials.yaml")).toBe(true);
    const parsed = parseYaml(await Bun.file(path).text()) as {
      credentials: Record<string, unknown>;
    };
    expect(parsed.credentials.shared).toBeDefined();
  });

  it("rejects a symlinked private config directory before writing", () => {
    const root = makeRoot();
    const outside = mkdtempSync(join(tmpdir(), "kata-infra-outside-"));
    const infra = join(root, "config", "private", "infrastructure");
    rmSync(infra, { recursive: true, force: true });
    symlinkSync(outside, infra);
    try {
      expect(() =>
        writeCredentialProfile(
          "shared",
          { kind: "password", username: "qa", password: "test-only" },
          root,
        ),
      ).toThrow(/符号链接/);
      expect(readdirSync(outside)).toEqual([]);
    } finally {
      rmSync(infra, { force: true });
      rmSync(outside, { recursive: true, force: true });
    }
  });

  it("rejects a symlinked private config directory before reading", () => {
    const root = makeRoot();
    const outside = mkdtempSync(join(tmpdir(), "kata-infra-read-outside-"));
    const infra = join(root, "config", "private", "infrastructure");
    rmSync(infra, { recursive: true, force: true });
    symlinkSync(outside, infra);
    try {
      expect(() => readInfraConfig(root)).toThrow(/符号链接/);
    } finally {
      rmSync(infra, { force: true });
      rmSync(outside, { recursive: true, force: true });
    }
  });

  it("records an explicitly trusted host fingerprint", async () => {
    const root = makeRoot();
    writePrivate(root, "hosts", {
      hosts: { app: { host: "192.0.2.10", credential_ref: "shared" } },
    });
    const fingerprint = `SHA256:${"a".repeat(43)}`;
    const path = trustHostKey("app", fingerprint, root);
    const text = await Bun.file(path).text();
    expect(text).toContain(fingerprint);
  });

  it("rejects a malformed host fingerprint", () => {
    const root = makeRoot();
    writePrivate(root, "hosts", {
      hosts: { app: { host: "192.0.2.10", credential_ref: "shared" } },
    });
    expect(() => trustHostKey("app", "SHA256:verified", root)).toThrow("fingerprint");
  });

  it("flags private config files tracked by git", () => {
    const root = makeRoot();
    writePrivate(root, "credentials", {
      credentials: { shared: { kind: "password", username: "qa", password: "test-only" } },
    });
    const git = (args: string[]) =>
      execFileSync("git", ["-C", root, ...args], { stdio: ["pipe", "pipe", "pipe"] });
    git(["init", "-b", "main"]);
    git(["add", "config/private/infrastructure/credentials.yaml"]);
    const result = runConfigDoctor({ root, scope: "infra" });
    expect(result.ok).toBe(false);
    expect(
      result.issues.some(
        (item) => item.level === "error" && item.message.includes("must not be tracked by git"),
      ),
    ).toBe(true);
  });

  it("flags example files as exempt from the tracked-file check", () => {
    const root = makeRoot();
    const git = (args: string[]) =>
      execFileSync("git", ["-C", root, ...args], { stdio: ["pipe", "pipe", "pipe"] });
    git(["init", "-b", "main"]);
    git(["add", "config"]);
    const result = runConfigDoctor({ root });
    expect(result.issues.some((item) => item.message.includes("tracked by git"))).toBe(false);
    expect(new Set(result.checked).size).toBe(result.checked.length);
  });

  it("checks canonical examples while treating the private source catalog as optional", () => {
    const root = makeRoot();
    const result = runConfigDoctor({ root });
    expect(result.ok).toBe(true);
    expect(result.checked).toContain(
      join(root, "config", "examples", "environments", "env.example.yaml"),
    );
    expect(result.checked).toContain(join(root, "config", "examples", "repositories.example.yaml"));
    expect(
      result.issues.some(
        (item) =>
          item.level === "warning" &&
          item.path === join(root, "config", "private", "repositories.yaml") &&
          item.message.includes("not configured"),
      ),
    ).toBe(true);
  });

  it("requires 0700 on every private configuration directory", () => {
    const root = makeRoot();
    chmodSync(join(root, "config", "private", "environments"), 0o755);
    chmodSync(join(root, "config", "private", "integrations"), 0o755);
    chmodSync(join(root, "config", "private"), 0o755);
    const result = runConfigDoctor({ root });
    expect(result.ok).toBe(false);
    expect(
      result.issues.filter(
        (item) => item.level === "error" && item.message === "must have permission 0700",
      ),
    ).toHaveLength(3);
  });

  it("warns on missing private files by default and fails in infra scope", () => {
    const root = makeRoot();
    expect(runConfigDoctor({ root }).ok).toBe(true);
    expect(runConfigDoctor({ root, scope: "infra" }).ok).toBe(false);
  });
});
