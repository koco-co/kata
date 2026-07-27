/**
 * sm-crypto has no bundled type declarations; declare the SM2 surface we use.
 */
declare module "sm-crypto" {
  export const sm2: {
    doEncrypt(msgString: string, publicKey: string, cipherMode?: 0 | 1): string;
    doDecrypt(encryptData: string, privateKey: string, cipherMode?: 0 | 1): string;
  };
}
