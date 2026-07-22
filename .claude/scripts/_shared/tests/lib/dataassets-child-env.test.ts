import { describe, expect, test } from "bun:test";
import {
  DATAASSETS_CONFIG_ENV,
  DATAASSETS_RESOLVED_ENV,
  LEGACY_DATAASSETS_ENV,
  buildDataAssetsChildEnv,
  type ResolvedDataAssetsEnv,
} from "@shared/lib/dataassets-env.ts";

const resolved: ResolvedDataAssetsEnv = {
  schemaVersion: 2,
  env: "local",
  urls: {
    baseUrl: "https://example.test",
    dataAssetsBaseUrl: "https://example.test/dataAssets",
    offlineBaseUrl: "https://example.test/batch",
    portalBaseUrl: "https://example.test/portal",
  },
  tenant: { name: "tenant" },
  projects: {
    quality: { id: 1, name: "quality" },
    offline: { id: 2, name: "offline" },
  },
  datasources: {},
  defaults: { datasource: "sparkthrift" },
  safety: { allowWrite: false },
};

describe("buildDataAssetsChildEnv", () => {
  test("does not copy unrelated parent secrets", () => {
    const child = buildDataAssetsChildEnv(
      "local",
      resolved,
      { repoRoot: "/tmp/kata" },
      {
        PATH: "/usr/bin",
        HOME: "/home/tester",
        LANG: "zh_CN.UTF-8",
        KATA_DINGTALK_WEBHOOK_URL: "must-not-leak",
        KATA_ZENTAO_PASSWORD: "must-not-leak",
      },
    );

    expect(child.PATH).toBe("/usr/bin");
    expect(child.HOME).toBe("/home/tester");
    expect(child.KATA_DINGTALK_WEBHOOK_URL).toBeUndefined();
    expect(child.KATA_ZENTAO_PASSWORD).toBeUndefined();
    expect(child[LEGACY_DATAASSETS_ENV]).toBe("local");
    expect(child[DATAASSETS_CONFIG_ENV]).toBe("/tmp/kata/config/env/local.yaml");
    expect(child[DATAASSETS_RESOLVED_ENV]).toBe(JSON.stringify(resolved));
  });

  test("inherits only explicitly named additional variables", () => {
    const child = buildDataAssetsChildEnv(
      "local",
      resolved,
      { repoRoot: "/tmp/kata", inheritEnv: ["CUSTOM_CERT_FILE"] },
      {
        PATH: "/usr/bin",
        CUSTOM_CERT_FILE: "/tmp/cert.pem",
        OTHER_SECRET: "must-not-leak",
      },
    );

    expect(child.CUSTOM_CERT_FILE).toBe("/tmp/cert.pem");
    expect(child.OTHER_SECRET).toBeUndefined();
  });

  test("rejects invalid environment variable names", () => {
    expect(() =>
      buildDataAssetsChildEnv(
        "local",
        resolved,
        { repoRoot: "/tmp/kata", inheritEnv: ["BAD-NAME"] },
        { PATH: "/usr/bin" },
      ),
    ).toThrow("invalid inherited environment variable");
  });
});
