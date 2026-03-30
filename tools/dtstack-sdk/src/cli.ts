#!/usr/bin/env bun
import {
  LOGIN_HELP,
  LOGOUT_HELP,
  PRECOND_SETUP_HELP,
  PROJECT_ENSURE_HELP,
  ROOT_HELP,
  SQL_EXEC_HELP,
  SQL_PING_HELP,
  WHOAMI_HELP,
} from "./help/index";
import { VERSION } from "./index";

const args = Bun.argv.slice(2);

function hasHelp(rest: string[]): boolean {
  return rest.includes("--help") || rest.includes("-h");
}

function printAndExit(text: string, code = 0): never {
  process.stdout.write(text);
  process.exit(code);
}

async function main(): Promise<void> {
  if (args.length === 0 || (hasHelp(args) && args[0]?.startsWith("-"))) {
    printAndExit(ROOT_HELP);
  }
  if (args[0] === "--version" || args[0] === "-v") {
    process.stdout.write(`${VERSION}\n`);
    process.exit(0);
  }

  const [c0, c1, ...rest] = args;

  // Help routing
  if (hasHelp(args)) {
    if (c0 === "sql" && c1 === "exec") printAndExit(SQL_EXEC_HELP);
    if (c0 === "sql" && c1 === "ping") printAndExit(SQL_PING_HELP);
    if (c0 === "project" && c1 === "ensure") printAndExit(PROJECT_ENSURE_HELP);
    if (c0 === "precond" && c1 === "setup") printAndExit(PRECOND_SETUP_HELP);
    if (c0 === "login") printAndExit(LOGIN_HELP);
    if (c0 === "logout") printAndExit(LOGOUT_HELP);
    if (c0 === "whoami") printAndExit(WHOAMI_HELP);
    printAndExit(ROOT_HELP);
  }

  // Command handlers — implemented in next task
  const { dispatchCommand } = await import("./cli/dispatch");
  await dispatchCommand([c0, c1, ...rest].filter(Boolean) as string[]);
}

main().catch((err: unknown) => {
  process.stderr.write(`error: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
