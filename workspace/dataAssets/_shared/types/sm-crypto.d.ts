// sm-crypto 未随包提供类型声明；这里只声明仓库实际用到的 sm2 API。
declare module "sm-crypto" {
  export const sm2: {
    doEncrypt(data: string, publicKey: string, cipherMode?: 0 | 1): string;
    doDecrypt(data: string, privateKey: string, cipherMode?: 0 | 1): string;
    generateKeyPairHex(): { publicKey: string; privateKey: string };
  };
}
