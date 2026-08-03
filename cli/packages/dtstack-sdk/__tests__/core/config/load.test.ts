import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadConfig } from "../../../src/core/config/load";

describe("loadConfig", () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "dtcli-"));
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  test("parses YAML and returns shape", () => {
    const file = join(dir, "c.yaml");
    writeFileSync(
      file,
      `
defaultEnv: example-env
environments:
  example-env:
    baseUrl: http://x
    login:
      username: u
      password: p
datasources:
  d1:
    type: doris
    host: h
    port: 9030
    username: u
    password: ""
`,
    );
    const cfg = loadConfig(file);
    expect(cfg.defaultEnv).toBe("example-env");
    expect(cfg.environments["example-env"].baseUrl).toBe("http://x");
    expect(cfg.datasources.d1.port).toBe(9030);
  });

  test("interpolates ENV_VAR placeholders", () => {
    process.env.MY_PWD = "secret";
    const file = join(dir, "c.yaml");
    writeFileSync(
      file,
      `
environments:
  example-env:
    baseUrl: http://x
    login:
      username: u
      password: \${MY_PWD}
datasources: {}
`,
    );
    const cfg = loadConfig(file);
    expect(cfg.environments["example-env"].login?.password).toBe("secret");
    delete process.env.MY_PWD;
  });

  test("missing env var throws and lists the variable name", () => {
    delete process.env.NOT_SET;
    const file = join(dir, "c.yaml");
    writeFileSync(
      file,
      `
environments: {}
datasources:
  x:
    type: mysql
    host: h
    port: 3306
    username: u
    password: \${NOT_SET}
`,
    );
    expect(() => loadConfig(file)).toThrow(/unset environment variables: NOT_SET/);
  });
});
