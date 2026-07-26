import { describe, expect, it } from "bun:test";
import { createHash } from "node:crypto";
import type { Client } from "ssh2";
import { checkSshConnectivity, toSshFingerprint } from "../../cli/lib/infra-ssh.ts";

class FakeClient {
  private ready?: () => void;
  private error?: (error: { code: string; message: string }) => void;

  on(
    event: "ready" | "error",
    listener: (() => void) | ((error: { code: string; message: string }) => void),
  ): this {
    if (event === "ready") this.ready = listener as () => void;
    if (event === "error") {
      this.error = listener as (error: { code: string; message: string }) => void;
    }
    return this;
  }

  connect(config: { hostVerifier?: (key: string | Buffer) => boolean }): void {
    const key = createHash("sha256").update("fake-host-key").digest("hex");
    if (config.hostVerifier?.(key)) this.ready?.();
    else this.error?.({ code: "HOST_KEY_UNVERIFIED", message: "host key rejected" });
  }

  end(): void {}
}

describe("SSH2 connectivity contract", () => {
  it("formats the hostHash value as an OpenSSH SHA256 fingerprint", () => {
    const key = createHash("sha256").update("fake-host-key").digest("hex");
    expect(toSshFingerprint(key)).toBe(
      `SHA256:${Buffer.from(key, "hex").toString("base64").replace(/=+$/, "")}`,
    );
  });

  it("rejects an untrusted host key and accepts the exact trusted key", async () => {
    const key = createHash("sha256").update("fake-host-key").digest("hex");
    const fingerprint = toSshFingerprint(key);
    const rejected = await checkSshConnectivity(
      {
        host: "192.0.2.10",
        port: 22,
        username: "qa",
        password: "test-only",
        expectedFingerprint: "SHA256:not-the-key",
      },
      FakeClient as unknown as typeof Client,
    );
    expect(rejected.ok).toBe(false);
    const accepted = await checkSshConnectivity(
      {
        host: "192.0.2.10",
        port: 22,
        username: "qa",
        password: "test-only",
        expectedFingerprint: fingerprint,
      },
      FakeClient as unknown as typeof Client,
    );
    expect(accepted.ok).toBe(true);
    expect(accepted.fingerprint).toBe(fingerprint);
  });
});
