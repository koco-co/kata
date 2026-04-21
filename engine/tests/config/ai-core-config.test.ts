import { describe, expect, it } from "bun:test";
import { isAiCoreConfigEnvName, resolveAiCoreConfig } from "../../src/config/ai-core-config.ts";

describe("AI Core config resolver", () => {
  it("does not retain a legacy-env migration surface", () => {
    const result = resolveAiCoreConfig({ env: { SERVICE_BASE_URL: "https://example.test" } });

    expect(result.ok).toBe(true);
    expect(result.issues).toEqual([]);
    expect(isAiCoreConfigEnvName("SERVICE_BASE_URL")).toBe(false);
  });

  it("blocks likely raw secret env keys", () => {
    const result = resolveAiCoreConfig({ env: { OPENAI_API_KEY: "sk-test" } });

    expect(result.ok).toBe(false);
    expect(result.value).toBeUndefined();
    expect(result.issues.map((issue) => issue.code)).toContain("secret_env.blocked");
    expect(result.issues.map((issue) => issue.path)).toContain("env.OPENAI_API_KEY");
  });

  it("blocks secret-like env keys case-insensitively", () => {
    const result = resolveAiCoreConfig({
      env: {
        openai_api_key: "sk-test",
        AWS_ACCESS_KEY_ID: "access-key",
        SSH_PRIVATE_KEY: "private-key",
      },
    });

    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain("secret_env.blocked");
    expect(result.issues.map((issue) => issue.path)).toContain("env.openai_api_key");
    expect(result.issues.map((issue) => issue.path)).toContain("env.AWS_ACCESS_KEY_ID");
    expect(result.issues.map((issue) => issue.path)).toContain("env.SSH_PRIVATE_KEY");
  });

  it("blocks generic webhook URL env keys case-insensitively", () => {
    const result = resolveAiCoreConfig({
      env: {
        custom_webhook_url: "https://hooks.example.test/token",
      },
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual({
      code: "secret_env.blocked",
      severity: "error",
      message: "Raw secret-like env var is not accepted in AI Core: custom_webhook_url",
      path: "env.custom_webhook_url",
    });
  });

  it("blocks generic webhook env keys without URL suffix", () => {
    const result = resolveAiCoreConfig({
      env: {
        CUSTOM_WEBHOOK: "https://hooks.example.test/token",
      },
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual({
      code: "secret_env.blocked",
      severity: "error",
      message: "Raw secret-like env var is not accepted in AI Core: CUSTOM_WEBHOOK",
      path: "env.CUSTOM_WEBHOOK",
    });
  });

  it("accepts scoped secret refs and rejects raw service credentials", () => {
    const ok = resolveAiCoreConfig({
      env: {
        KATA_TARGET_ENV: "local",
        KATA_SECRET_REF_ZENTAO_TOKEN: "secret://local/dataAssets/zentao/token",
      },
    });
    expect(ok.ok).toBe(true);

    const raw = resolveAiCoreConfig({
      env: {
        KATA_TARGET_ENV: "local",
        KATA_ZENTAO_TOKEN: "raw-token",
      },
    });
    expect(raw.ok).toBe(false);
    expect(raw.issues.map((issue) => issue.code)).toContain("secret_env.blocked");
  });

  it("marks KATA raw service secrets for runtime env scanning", () => {
    expect(isAiCoreConfigEnvName("KATA_LANHU_COOKIE")).toBe(true);
    expect(isAiCoreConfigEnvName("KATA_ZENTAO_PASSWORD")).toBe(true);
    expect(isAiCoreConfigEnvName("KATA_DINGTALK_WEBHOOK_URL")).toBe(true);
    expect(isAiCoreConfigEnvName("KATA_FEATURE_FLAG")).toBe(false);
  });

  it("rejects invalid scoped secret refs without treating them as raw credentials", () => {
    const result = resolveAiCoreConfig({
      env: {
        KATA_TARGET_ENV: "local",
        KATA_SECRET_REF_ZENTAO_TOKEN: "raw-token",
      },
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual({
      code: "secret_ref.invalid",
      severity: "error",
      message:
        "Secret ref env var must match ^secret://[A-Za-z0-9._-]+/[A-Za-z0-9._-]+/[A-Za-z0-9._/-]+$: KATA_SECRET_REF_ZENTAO_TOKEN",
      path: "env.KATA_SECRET_REF_ZENTAO_TOKEN",
    });
    expect(result.issues.map((issue) => issue.code)).not.toContain("secret_env.blocked");
  });

  it("rejects empty scoped secret refs as invalid secret refs", () => {
    const result = resolveAiCoreConfig({
      env: {
        KATA_TARGET_ENV: "local",
        KATA_SECRET_REF_ZENTAO_TOKEN: "",
      },
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        code: "secret_ref.invalid",
        path: "env.KATA_SECRET_REF_ZENTAO_TOKEN",
      }),
    );
  });

  it("rejects scoped secret refs with names outside the env schema pattern", () => {
    const result = resolveAiCoreConfig({
      env: {
        KATA_TARGET_ENV: "local",
        "KATA_SECRET_REF_bad-name": "secret://local/dataAssets/zentao/token",
      },
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual({
      code: "secret_ref.name_invalid",
      severity: "error",
      message:
        "Secret ref env var name must match ^KATA_SECRET_REF_[A-Z0-9_]+$: KATA_SECRET_REF_bad-name",
      path: "env.KATA_SECRET_REF_bad-name",
    });
  });

  it("accepts KATA_TARGET_ENV with no raw secrets", () => {
    const result = resolveAiCoreConfig({ env: { KATA_TARGET_ENV: "ltqc" } });

    expect(result.ok).toBe(true);
    expect(result.value?.targetEnv).toBe("ltqc");
  });

  it("rejects KATA_TARGET_ENV values outside the env schema pattern", () => {
    const result = resolveAiCoreConfig({ env: { KATA_TARGET_ENV: "../prod" } });

    expect(result.ok).toBe(false);
    expect(result.value).toBeUndefined();
    expect(result.issues).toContainEqual({
      code: "config.target_env_invalid",
      severity: "error",
      message: "KATA_TARGET_ENV must match ^[A-Za-z0-9._-]+$.",
      path: "env.KATA_TARGET_ENV",
    });
  });

  it("defaults target env to local", () => {
    const result = resolveAiCoreConfig({ env: {} });

    expect(result.ok).toBe(true);
    expect(result.value?.targetEnv).toBe("local");
  });
});
