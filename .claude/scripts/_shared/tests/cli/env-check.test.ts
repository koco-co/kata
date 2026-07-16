import { describe, expect, it } from "bun:test";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  diagnoseEnvConfig,
  migrateEnvAuthCookie,
  migrateLegacyEnvLocal,
  migrateProfileSecrets,
  migrateZentaoSession,
  resolveEnvSources,
  runEnvCheck,
  setRootEnv,
} from "@shared/cli/env-check.ts";
import { parse } from "yaml";

describe("kata env check", () => {
  function writeProfile(root: string, env: string, cookie = "sid=test"): void {
    const dir = join(root, "workspace/dataAssets/_shared/env");
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(dir, `${env}.yaml`),
      [
        "project: dataAssets",
        `env: ${env}`,
        "urls:",
        `  base_url: https://${env}.example.test`,
        `  data_assets_base_url: https://${env}.example.test/dataAssets`,
        "auth:",
        `  cookie: ${cookie}`,
        "projects:",
        "  quality: { id: 92, name: test }",
        "runtime:",
        "  playwright: { headless: true }",
      ].join("\n"),
    );
  }

  it("returns ok object with required keys", async () => {
    const r = await runEnvCheck({ project: "dataAssets", env: "ci63" });
    expect(r).toHaveProperty("baseUrl");
    expect(r).toHaveProperty("tenant");
    expect(r).toHaveProperty("authCookieConfigured");
    expect(r).toHaveProperty("dtstackReachable");
  });

  it("does not assume dtstack is reachable only because an env file exists", async () => {
    const scratch = mkdtempSync(join(tmpdir(), "kata-env-check-"));
    try {
      const envDir = join(scratch, "workspace/dataAssets/_shared/env");
      mkdirSync(envDir, { recursive: true });
      writeFileSync(
        join(envDir, "ci63.yaml"),
        "base_url: http://example.test\ntenant_name: demo\nauth:\n  cookie: sid=test\n",
      );
      const r = await runEnvCheck({
        project: "dataAssets",
        env: "ci63",
        repoRoot: scratch,
        probe: async () => ({ ok: false, reason: "dtstack-cli unavailable" }),
      });
      expect(r.dtstackReachable).toBe(false);
      expect(r.reason).toContain("unavailable");
    } finally {
      rmSync(scratch, { recursive: true, force: true });
    }
  });

  it("migrates storageState cookies into auth.cookie without returning the secret", () => {
    const scratch = mkdtempSync(join(tmpdir(), "kata-env-auth-migrate-"));
    try {
      const envDir = join(scratch, "workspace/dataAssets/_shared/env");
      const session = join(scratch, "workspace/dataAssets/.kata/auth/dataAssets/session-ci63.json");
      mkdirSync(envDir, { recursive: true });
      mkdirSync(join(session, ".."), { recursive: true });
      writeFileSync(
        join(envDir, "ci63.yaml"),
        [
          "urls:",
          "  base_url: https://ci.example.test",
          "auth:",
          "  tenant_name: demo",
          `  session_path: ${session}`,
          "  derive_from_session: true",
        ].join("\n"),
      );
      writeFileSync(
        session,
        JSON.stringify({
          cookies: [
            { name: "sid", value: "secret-value", domain: "ci.example.test" },
            { name: "other", value: "ignore", domain: "other.example.test" },
          ],
          origins: [],
        }),
      );

      const result = migrateEnvAuthCookie({
        project: "dataAssets",
        env: "ci63",
        session,
        repoRoot: scratch,
      });
      const profile = parse(readFileSync(join(envDir, "ci63.yaml"), "utf8")) as {
        auth: { cookie?: string; session_path?: string; derive_from_session?: boolean };
      };
      const localProfile = parse(readFileSync(join(envDir, ".local/ci63.yaml"), "utf8")) as {
        auth: { cookie?: string };
      };

      expect(result.cookieCount).toBe(1);
      expect(JSON.stringify(result)).not.toContain("secret-value");
      expect(profile.auth.cookie).toBe("");
      expect(localProfile.auth.cookie).toBe("sid=secret-value");
      expect(profile.auth.session_path).toBeUndefined();
      expect(profile.auth.derive_from_session).toBeUndefined();
    } finally {
      rmSync(scratch, { recursive: true, force: true });
    }
  });

  it("migrates the legacy ZenTao session into the unified root .env", () => {
    const scratch = mkdtempSync(join(tmpdir(), "kata-zentao-session-migrate-"));
    try {
      const session = join(scratch, ".kata/zentao/session.json");
      mkdirSync(join(session, ".."), { recursive: true });
      writeFileSync(join(scratch, ".env"), "KEEP=unchanged\n");
      writeFileSync(session, JSON.stringify({ cookie: "zentaosid=secret-value" }));

      const result = migrateZentaoSession({ session, repoRoot: scratch });
      const envText = readFileSync(join(scratch, ".env"), "utf8");

      expect(result.cookieConfigured).toBe(true);
      expect(JSON.stringify(result)).not.toContain("secret-value");
      expect(envText).toContain('KATA_ZENTAO_COOKIE="zentaosid=secret-value"');
      expect(envText).toContain("KEEP=unchanged");
      delete process.env.KATA_ZENTAO_COOKIE;
    } finally {
      rmSync(scratch, { recursive: true, force: true });
    }
  });

  it("sets a root env key without returning its value", () => {
    const scratch = mkdtempSync(join(tmpdir(), "kata-root-env-set-"));
    try {
      const result = setRootEnv({
        key: "KATA_DTSTACK_SESSION_PATH",
        value: "/tmp/private-session.json",
        repoRoot: scratch,
      });
      expect(result).toEqual({
        envPath: join(scratch, ".env"),
        key: "KATA_DTSTACK_SESSION_PATH",
        configured: true,
      });
      expect(JSON.stringify(result)).not.toContain("private-session.json");
      expect(readFileSync(join(scratch, ".env"), "utf8")).toContain(
        'KATA_DTSTACK_SESSION_PATH="/tmp/private-session.json"',
      );
      delete process.env.KATA_DTSTACK_SESSION_PATH;
    } finally {
      rmSync(scratch, { recursive: true, force: true });
    }
  });

  it("resolves config sources without returning secret values", () => {
    const scratch = mkdtempSync(join(tmpdir(), "kata-env-resolve-"));
    try {
      writeFileSync(
        join(scratch, ".env"),
        "KATA_ZENTAO_COOKIE=secret-value\nKATA_DINGTALK_WEBHOOK_URL=https://secret.example\n",
      );
      writeProfile(scratch, "ci63", "sid=profile-secret");

      const result = resolveEnvSources({ project: "dataAssets", env: "ci63", repoRoot: scratch });
      const serialized = JSON.stringify(result);

      expect(serialized).not.toContain("secret-value");
      expect(serialized).not.toContain("profile-secret");
      expect(result.rootEnv.keys).toContainEqual(
        expect.objectContaining({
          key: "KATA_ZENTAO_COOKIE",
          configured: true,
          secret: true,
        }),
      );
      expect(result.rootEnv.keys).toContainEqual(
        expect.objectContaining({ key: "KATA_DINGTALK_WEBHOOK_URL", secret: true }),
      );
      expect(result.profile.keys).toContainEqual(
        expect.objectContaining({ key: "auth.cookie", secret: true, configured: true }),
      );
    } finally {
      rmSync(scratch, { recursive: true, force: true });
    }
  });

  it("migrates verified legacy .env.local files without exposing values", () => {
    const scratch = mkdtempSync(join(tmpdir(), "kata-env-local-migrate-"));
    try {
      writeFileSync(join(scratch, ".env"), "KEEP=unchanged\n");
      writeProfile(scratch, "ltqc-prod", "sid=profile-secret");
      writeProfile(scratch, "ltqc-local", "");
      writeFileSync(
        join(scratch, ".env.local"),
        [
          "ACTIVE_ENV=ltqc",
          "HEADLESS=true",
          "PROD_COOKIE=sid=profile-secret",
          "PROD_BASE_URL=https://ltqc-prod.example.test",
          "UI_AUTOTEST_BASE_URL=https://ltqc-prod.example.test",
          "UI_AUTOTEST_COOKIE=sid=profile-secret",
          "KATA_ACTIVE_PROJECT=dataAssets",
          "KATA_ACTIVE_FEATURE=stale-feature",
          "KATA_DATAASSETS_PROJECT_ID=92",
          "KATA_SR3X_URL=https://sr.example.test",
          "KATA_SR3X_TYPE=starrocks",
        ].join("\n"),
      );
      const projectLocal = join(scratch, "workspace/dataAssets/.env.local");
      writeFileSync(projectLocal, "KATA_DATAASSETS_SESSION_PATH=legacy-session.json\n");

      const preview = migrateLegacyEnvLocal({ project: "dataAssets", repoRoot: scratch });
      expect(preview.applied).toBe(false);
      expect(existsSync(join(scratch, ".env.local"))).toBe(true);

      const result = migrateLegacyEnvLocal({
        project: "dataAssets",
        repoRoot: scratch,
        apply: true,
      });
      const serialized = JSON.stringify(result);
      const rootEnv = readFileSync(join(scratch, ".env"), "utf8");

      expect(result.applied).toBe(true);
      expect(result.selectedEnv).toBe("ltqc-prod");
      expect(serialized).not.toContain("profile-secret");
      expect(serialized).not.toContain("sr.example.test");
      expect(rootEnv).toContain('KATA_DATAASSETS_ENV="ltqc-prod"');
      expect(rootEnv).toContain("KATA_SR3X_URL=");
      expect(existsSync(join(scratch, ".env.local"))).toBe(false);
      expect(existsSync(projectLocal)).toBe(false);
      delete process.env.KATA_DATAASSETS_ENV;
      delete process.env.KATA_SR3X_URL;
      delete process.env.KATA_SR3X_TYPE;
    } finally {
      rmSync(scratch, { recursive: true, force: true });
    }
  });

  it("doctor rejects legacy overlay files", () => {
    const scratch = mkdtempSync(join(tmpdir(), "kata-env-doctor-"));
    try {
      writeFileSync(join(scratch, ".env"), "KEEP=set\n", { mode: 0o600 });
      writeFileSync(join(scratch, ".env.local"), "LEGACY=set\n");
      writeProfile(scratch, "ci63");

      const result = diagnoseEnvConfig({ project: "dataAssets", env: "ci63", repoRoot: scratch });
      expect(result.ok).toBe(false);
      expect(result.findings).toContainEqual(
        expect.objectContaining({ code: "legacy_env_overlay", severity: "error" }),
      );
    } finally {
      rmSync(scratch, { recursive: true, force: true });
    }
  });

  it("doctor rejects root keys outside .env.example and reports empty supported values", () => {
    const scratch = mkdtempSync(join(tmpdir(), "kata-env-contract-"));
    try {
      writeFileSync(join(scratch, ".env.example"), "KATA_DATAASSETS_ENV=\n", { mode: 0o644 });
      writeFileSync(
        join(scratch, ".env"),
        "KATA_DATAASSETS_ENV=\nDEEPSEEK_API_KEY=stale\n",
        { mode: 0o600 },
      );
      writeProfile(scratch, "ci63");

      const resolved = resolveEnvSources({
        project: "dataAssets",
        env: "ci63",
        repoRoot: scratch,
      });
      const result = diagnoseEnvConfig({ project: "dataAssets", env: "ci63", repoRoot: scratch });

      expect(resolved.rootEnv.keys).toContainEqual(
        expect.objectContaining({ key: "KATA_DATAASSETS_ENV", configured: false }),
      );
      expect(result.ok).toBe(false);
      expect(result.findings).toContainEqual(
        expect.objectContaining({ code: "unsupported_root_env_key", severity: "error" }),
      );
      expect(result.findings).toContainEqual(
        expect.objectContaining({ code: "empty_root_env_value", severity: "warn" }),
      );
    } finally {
      rmSync(scratch, { recursive: true, force: true });
    }
  });

  it("doctor rejects local profile overrides other than auth.cookie", () => {
    const scratch = mkdtempSync(join(tmpdir(), "kata-env-local-contract-"));
    try {
      writeProfile(scratch, "ci63", "");
      const localDir = join(scratch, "workspace/dataAssets/_shared/env/.local");
      mkdirSync(localDir, { recursive: true });
      writeFileSync(
        join(localDir, "ci63.yaml"),
        "auth:\n  cookie: sid=local\nruntime:\n  cleanup: false\n",
        { mode: 0o600 },
      );

      const result = diagnoseEnvConfig({ project: "dataAssets", env: "ci63", repoRoot: scratch });

      expect(result.ok).toBe(false);
      expect(result.findings).toContainEqual(
        expect.objectContaining({ code: "unsupported_profile_secret_key", severity: "error" }),
      );
    } finally {
      rmSync(scratch, { recursive: true, force: true });
    }
  });

  it("moves tracked-profile cookies into ignored local YAML files", () => {
    const scratch = mkdtempSync(join(tmpdir(), "kata-env-profile-secret-"));
    try {
      writeProfile(scratch, "ci63", "sid=profile-secret");

      const preview = migrateProfileSecrets({ project: "dataAssets", repoRoot: scratch });
      expect(preview.applied).toBe(false);
      expect(preview.migratedProfiles).toEqual(["ci63"]);

      const result = migrateProfileSecrets({
        project: "dataAssets",
        repoRoot: scratch,
        apply: true,
      });
      const base = parse(
        readFileSync(join(scratch, "workspace/dataAssets/_shared/env/ci63.yaml"), "utf8"),
      ) as { auth: { cookie?: string } };
      const localPath = join(scratch, "workspace/dataAssets/_shared/env/.local/ci63.yaml");
      const local = parse(readFileSync(localPath, "utf8")) as { auth: { cookie?: string } };

      expect(result.applied).toBe(true);
      expect(JSON.stringify(result)).not.toContain("sid=profile-secret");
      expect(base.auth.cookie).toBe("");
      expect(local.auth.cookie).toBe("sid=profile-secret");
      expect(statSync(localPath).mode & 0o777).toBe(0o600);
    } finally {
      rmSync(scratch, { recursive: true, force: true });
    }
  });
});
