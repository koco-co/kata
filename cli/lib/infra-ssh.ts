import { createHash } from "node:crypto";
import { Client } from "ssh2";

export interface SshConnectivityOptions {
  host: string;
  port: number;
  username: string;
  password: string;
  expectedFingerprint?: string;
  timeoutMs?: number;
}

export interface SshConnectivityResult {
  ok: boolean;
  fingerprint?: string;
  code?: string;
  message?: string;
}

/** Normalize ssh2's SHA-256 hostHash output to the OpenSSH display form. */
export function toSshFingerprint(key: string | Buffer): string {
  const digest =
    typeof key === "string"
      ? Buffer.from(key, /^[0-9a-f]+$/i.test(key) ? "hex" : "base64")
      : createHash("sha256").update(key).digest();
  const value = typeof key === "string" && !/^[0-9a-f]+$/i.test(key) ? digest : digest;
  return `SHA256:${value.toString("base64").replace(/=+$/, "")}`;
}

export function checkSshConnectivity(
  options: SshConnectivityOptions,
  ClientClass: typeof Client = Client,
): Promise<SshConnectivityResult> {
  return new Promise((resolve) => {
    const client = new ClientClass();
    const timeoutMs = options.timeoutMs ?? 8_000;
    let settled = false;
    let observedFingerprint: string | undefined;
    const finish = (result: SshConnectivityResult): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        client.end();
      } catch {
        // Connection may already be closed.
      }
      resolve({ ...result, fingerprint: result.fingerprint ?? observedFingerprint });
    };
    const timer = setTimeout(
      () => finish({ ok: false, code: "SSH_TIMEOUT", message: "SSH connection timed out" }),
      timeoutMs,
    );
    client
      .on("ready", () => finish({ ok: true }))
      .on("error", (error: Error & { code?: string }) =>
        finish({
          ok: false,
          code: error.code ?? "SSH_ERROR",
          message: error.message,
        }),
      );
    try {
      client.connect({
        host: options.host,
        port: options.port,
        username: options.username,
        password: options.password,
        hostHash: "sha256",
        hostVerifier: (key) => {
          observedFingerprint = toSshFingerprint(key);
          return Boolean(
            options.expectedFingerprint && observedFingerprint === options.expectedFingerprint,
          );
        },
        readyTimeout: timeoutMs,
      });
    } catch (error) {
      finish({ ok: false, code: "SSH_CONNECT_ERROR", message: (error as Error).message });
    }
  });
}
