import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { SCHEMA } from "../../src/cli/parse-args";
import {
  PRECOND_SETUP_HELP,
  PROJECT_ENSURE_HELP,
  ROOT_HELP,
  SQL_EXEC_HELP,
  SQL_PING_HELP,
  WHOAMI_HELP,
} from "../../src/help/index";

const usage = readFileSync(join(import.meta.dir, "../../docs/usage.md"), "utf-8");

const ALL_HELP = [
  ["ROOT_HELP", ROOT_HELP],
  ["SQL_EXEC_HELP", SQL_EXEC_HELP],
  ["SQL_PING_HELP", SQL_PING_HELP],
  ["PROJECT_ENSURE_HELP", PROJECT_ENSURE_HELP],
  ["PRECOND_SETUP_HELP", PRECOND_SETUP_HELP],
  ["WHOAMI_HELP", WHOAMI_HELP],
] as const;

// 由 cli.ts 在参数解析前处理的 flags，不属于 dispatch SCHEMA
const NON_SCHEMA_FLAGS = new Set(["help", "version"]);

describe("docs/usage.md mirrors help texts", () => {
  for (const [name, text] of ALL_HELP) {
    test(`usage.md contains ${name}`, () => {
      expect(usage).toContain(text.trimEnd());
    });
  }
});

describe("help flags stay in sync with parse-args SCHEMA", () => {
  test("every long flag documented in help exists in SCHEMA", () => {
    for (const [name, text] of ALL_HELP) {
      for (const match of text.matchAll(/(?<!-)--([a-z][a-z0-9-]*)/g)) {
        const flag = match[1];
        if (NON_SCHEMA_FLAGS.has(flag)) continue;
        expect(Object.keys(SCHEMA), `${name} documents --${flag} not in SCHEMA`).toContain(flag);
      }
    }
  });

  test("every SCHEMA flag is documented in some help text", () => {
    const all = ALL_HELP.map(([, text]) => text).join("\n");
    for (const flag of Object.keys(SCHEMA)) {
      expect(
        new RegExp(`(?<!-)--${flag}(?![a-z0-9-])`).test(all),
        `--${flag} missing from all help texts`,
      ).toBe(true);
    }
  });
});
