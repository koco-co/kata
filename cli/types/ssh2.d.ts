declare module "ssh2" {
  export interface ClientConfig {
    host: string;
    port: number;
    username: string;
    password: string;
    hostHash?: string;
    hostVerifier?: (key: string | Buffer) => boolean;
    readyTimeout?: number;
  }

  export class Client {
    on(event: "ready" | "close", listener: () => void): this;
    on(event: "error", listener: (error: Error & { code?: string }) => void): this;
    connect(config: ClientConfig): void;
    end(): void;
  }
}
