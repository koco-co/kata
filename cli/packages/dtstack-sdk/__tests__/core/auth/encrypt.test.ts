import { describe, expect, test } from "bun:test";
import { sm2Encrypt } from "../../../src/core/auth/encrypt";

describe("sm2Encrypt", () => {
  // 65-byte SM2 public key (04 || x || y), hex-encoded, same format as DTStack get-publi-key
  const SM2_PUB_KEY_HEX =
    "04bd2df35b56122e520452083a9c8e21861a9325ebe32851be97317e6bbe15e88005c3bc077d07a90107150b66a250b697dfbbe2600026eb2abc5d10b24357b108";

  test("produces non-empty base64 ciphertext", () => {
    const ct = sm2Encrypt("hello", SM2_PUB_KEY_HEX);
    expect(ct.length).toBeGreaterThan(0);
    // SM2 ciphertext is variable length, typically ~200+ hex chars → ~270+ base64 chars
    const buf = Buffer.from(ct, "base64");
    expect(buf.length).toBeGreaterThan(50);
  });

  test("same plaintext produces different ciphertext each time (non-deterministic)", () => {
    const a = sm2Encrypt("test", SM2_PUB_KEY_HEX);
    const b = sm2Encrypt("test", SM2_PUB_KEY_HEX);
    expect(a).not.toBe(b);
  });
});
