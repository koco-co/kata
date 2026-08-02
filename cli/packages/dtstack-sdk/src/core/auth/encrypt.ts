import { sm2 } from "sm-crypto";

/**
 * DTStack UIC login 公钥加密。
 *
 * API `get-publi-key` 返回 hex 编码的 SM2 公钥
 * （0x04 || 32-byte-x || 32-byte-y = 65 bytes）。
 */
export function sm2Encrypt(message: string, publicKeyHex: string): string {
  // sm-crypto 的 doEncrypt 返回 hex，DTStack UIC 需要 base64
  const hex = sm2.doEncrypt(message, publicKeyHex, 0);
  return Buffer.from(hex, "hex").toString("base64");
}
