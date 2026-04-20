import { describe, expect, it } from "bun:test";
import type { CapabilityRequired } from "../../src/plugins/sandbox/capability-spec.ts";
import {
  checkFsAccess,
  checkNetworkAccess,
  parseCapabilityRequired,
} from "../../src/plugins/sandbox/capability-spec.ts";
import {
  createSandboxAuditor,
  runInSandbox,
  validatePluginCapabilities,
} from "../../src/plugins/sandbox/runner.ts";
import {
  createSecretChannel,
  loadSecretSources,
} from "../../src/plugins/sandbox/secret-injector.ts";

describe("capability-spec", () => {
  describe("parseCapabilityRequired", () => {
    it("parses a valid capability spec", () => {
      const result = parseCapabilityRequired({
        net: ["api.example.com", "*.example.com"],
        fs_read: [".ai/core/plugins/test/fixtures"],
        fs_write: [".ai/runs/staging"],
        secret_refs: ["KATA_TEST_KEY"],
      });
      expect(result.ok).toBe(true);
      expect(result.value?.net).toEqual(["api.example.com", "*.example.com"]);
      expect(result.value?.fs_read).toEqual([".ai/core/plugins/test/fixtures"]);
    });

    it("returns empty arrays for missing fields", () => {
      const result = parseCapabilityRequired({});
      expect(result.ok).toBe(true);
      expect(result.value?.net).toEqual([]);
      expect(result.value?.fs_read).toEqual([]);
      expect(result.value?.secret_refs).toEqual([]);
    });

    it("rejects non-array fields", () => {
      const result = parseCapabilityRequired({ net: "not-an-array" });
      expect(result.ok).toBe(false);
    });

    it("rejects invalid net patterns", () => {
      const result = parseCapabilityRequired({ net: ["invalid host!"] });
      expect(result.ok).toBe(false);
    });
  });

  describe("checkNetworkAccess", () => {
    it("allows exact hostname match", () => {
      const result = checkNetworkAccess(["lanhu.com"], "https://lanhu.com/api/v1/data");
      expect(result.allowed).toBe(true);
    });

    it("allows wildcard subdomain match", () => {
      const result = checkNetworkAccess(["*.lanhu.com"], "https://api.lanhu.com/v1/data");
      expect(result.allowed).toBe(true);
    });

    it("denies non-matching hostname", () => {
      const result = checkNetworkAccess(["lanhu.com", "*.lanhu.com"], "https://evil.com/steal");
      expect(result.allowed).toBe(false);
      expect(result.violations[0].code).toBe("sandbox.net_violation");
    });

    it("denies subdomain when only exact match allowed", () => {
      const result = checkNetworkAccess(["lanhu.com"], "https://api.lanhu.com/data");
      expect(result.allowed).toBe(false);
    });

    it("rejects invalid URLs", () => {
      const result = checkNetworkAccess(["example.com"], "not-a-url");
      expect(result.allowed).toBe(false);
      expect(result.violations[0].code).toBe("sandbox.invalid_url");
    });
  });

  describe("checkFsAccess", () => {
    it("allows exact path match", () => {
      const result = checkFsAccess(["/data/fixtures"], "/data/fixtures/file.txt");
      expect(result.allowed).toBe(true);
    });

    it("allows wildcard suffix match", () => {
      const result = checkFsAccess(["/data/*"], "/data/subdir/file.txt");
      expect(result.allowed).toBe(true);
    });

    it("denies path outside allowlist", () => {
      const result = checkFsAccess(["/data/fixtures"], "/etc/passwd");
      expect(result.allowed).toBe(false);
      expect(result.violations[0].code).toBe("sandbox.fs_violation");
    });

    it("denies path escaping by prefix", () => {
      const result = checkFsAccess(["/data"], "/data_evil/file.txt");
      expect(result.allowed).toBe(false);
    });
  });
});

describe("secret-injector", () => {
  describe("loadSecretSources", () => {
    it("parses secret sources YAML", () => {
      const yaml = [
        "sources:",
        "  - pattern: KATA_LANHU_COOKIE",
        "    env_var: LANHU_SESSION",
        "  - pattern: KATA_ZENTAO_*",
        "    env_var: ZENTAO_CONFIG",
      ].join("\n");
      const sources = loadSecretSources(yaml);
      expect(sources.length).toBe(2);
      expect(sources[0].pattern).toBe("KATA_LANHU_COOKIE");
      expect(sources[0].env_var).toBe("LANHU_SESSION");
    });
  });

  describe("createSecretChannel", () => {
    it("resolves allowed secrets from env", () => {
      process.env.TEST_SECRET = "secret-value-123";
      const channel = createSecretChannel(
        ["KATA_TEST_KEY"],
        [{ pattern: "KATA_TEST_KEY", env_var: "TEST_SECRET" }],
      );
      expect(channel.resolve("KATA_TEST_KEY")).toBe("secret-value-123");
      delete process.env.TEST_SECRET;
    });

    it("returns undefined for undeclared secret refs", () => {
      const channel = createSecretChannel(
        ["KATA_ALLOWED_KEY"],
        [{ pattern: "KATA_ALLOWED_KEY", env_var: "MISSING_ENV" }],
      );
      expect(channel.resolve("KATA_FORBIDDEN_KEY")).toBe(undefined);
    });

    it("lists resolved refs", () => {
      process.env.TEST_A = "a";
      process.env.TEST_B = "b";
      const channel = createSecretChannel(
        ["KATA_A", "KATA_B"],
        [
          { pattern: "KATA_A", env_var: "TEST_A" },
          { pattern: "KATA_B", env_var: "TEST_B" },
        ],
      );
      const refs = channel.listRefs();
      expect(refs).toContain("KATA_A");
      expect(refs).toContain("KATA_B");
      delete process.env.TEST_A;
      delete process.env.TEST_B;
    });
  });
});

describe("sandbox runner", () => {
  const strictCap: CapabilityRequired = {
    net: ["lanhu.com", "*.lanhu.com"],
    fs_read: [".ai/core/plugins"],
    fs_write: [".ai/runs/staging"],
    secret_refs: [],
  };

  describe("createSandboxAuditor", () => {
    it("audits allowed network access", () => {
      const auditor = createSandboxAuditor(strictCap);
      const result = auditor.checkNet("https://lanhu.com/api/data");
      expect(result.allowed).toBe(true);
      expect(auditor.audit.length).toBe(1);
      expect(auditor.audit[0].kind).toBe("net_access");
      expect(auditor.audit[0].allowed).toBe(true);
    });

    it("audits denied network access", () => {
      const auditor = createSandboxAuditor(strictCap);
      const result = auditor.checkNet("https://evil.com/steal");
      expect(result.allowed).toBe(false);
      expect(auditor.audit[0].allowed).toBe(false);
    });

    it("audits allowed fs reads", () => {
      const auditor = createSandboxAuditor(strictCap);
      const result = auditor.checkFsRead(".ai/core/plugins/fixtures/test.md");
      expect(result.allowed).toBe(true);
    });

    it("audits denied fs writes", () => {
      const auditor = createSandboxAuditor(strictCap);
      const result = auditor.checkFsWrite("/etc/passwd");
      expect(result.allowed).toBe(false);
      expect(auditor.audit[0].kind).toBe("fs_write");
    });
  });

  describe("runInSandbox", () => {
    it("runs a compliant plugin successfully", async () => {
      const result = await runInSandbox({
        pluginId: "test-plugin@1",
        capabilityRequired: { net: [], fs_read: [], fs_write: [], secret_refs: [] },
        pluginFn: async () => ({ ok: true, data: "success" }),
      });
      expect(result.ok).toBe(true);
      expect((result.value?.output as Record<string, unknown>).data).toBe("success");
    });

    it("rejects plugin that throws an error", async () => {
      const result = await runInSandbox({
        pluginId: "bad-plugin@1",
        capabilityRequired: { net: [], fs_read: [], fs_write: [], secret_refs: [] },
        pluginFn: async () => {
          throw new Error("plugin crashed");
        },
      });
      expect(result.ok).toBe(false);
      expect(result.issues[0].code).toBe("sandbox.plugin_error");
    });

    it("rejects unresolved secret refs", async () => {
      const result = await runInSandbox({
        pluginId: "secret-plugin@1",
        capabilityRequired: {
          net: [],
          fs_read: [],
          fs_write: [],
          secret_refs: ["KATA_MISSING_KEY"],
        },
        secretSources: [{ pattern: "KATA_OTHER_KEY", env_var: "SOME_ENV" }],
        pluginFn: async () => ({ ok: true }),
      });
      expect(result.ok).toBe(false);
    });
  });

  describe("validatePluginCapabilities", () => {
    it("validates capability_required from manifest", () => {
      const result = validatePluginCapabilities({
        net: ["lanhu.com", "*.lanhu.com"],
        fs_read: [".ai/core/plugins"],
        fs_write: [],
        secret_refs: ["KATA_LANHU_COOKIE"],
      });
      expect(result.ok).toBe(true);
      expect(result.value?.net).toEqual(["lanhu.com", "*.lanhu.com"]);
    });
  });
});

describe("lanhu plugin capability", () => {
  it("has compliant capability_required declaration", () => {
    const lanhuCap = {
      net: ["lanhu.com", "*.lanhu.com"],
      fs_read: [],
      fs_write: [],
      secret_refs: ["KATA_LANHU_COOKIE"],
    };
    const result = parseCapabilityRequired(lanhuCap);
    expect(result.ok).toBe(true);

    // Verify net access
    const netCheck = checkNetworkAccess(lanhuCap.net, "https://www.lanhu.com/api/projects");
    expect(netCheck.allowed).toBe(true);

    // Verify net denial
    const netDenied = checkNetworkAccess(lanhuCap.net, "https://evil.com/steal");
    expect(netDenied.allowed).toBe(false);
  });
});
