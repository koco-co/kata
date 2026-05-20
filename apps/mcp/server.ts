#!/usr/bin/env bun
/**
 * kata MCP server - zero-dependency stdio JSON-RPC 2.0 (MCP).
 * stdout is reserved for protocol messages; all logging goes to stderr.
 * Run:  bun apps/mcp/server.ts   (or  bun run mcp)
 */
import { dispatch, type JsonRpcRequest } from "./dispatch.ts";
import { TOOLS } from "./tools.ts";

function log(...args: unknown[]): void {
  process.stderr.write(`[kata-mcp] ${args.join(" ")}\n`);
}

function send(message: Record<string, unknown>): void {
  process.stdout.write(`${JSON.stringify(message)}\n`);
}

async function handleLine(line: string): Promise<void> {
  const trimmed = line.trim();
  if (trimmed === "") return;

  try {
    const response = await dispatch(JSON.parse(trimmed) as JsonRpcRequest);
    if (response !== null) {
      send(response as unknown as Record<string, unknown>);
    }
  } catch (error) {
    log("parse/handle error:", error instanceof Error ? error.message : String(error));
  }
}

async function main(): Promise<void> {
  log(`ready · ${TOOLS.length} tools`);
  const decoder = new TextDecoder();
  let buffer = "";

  for await (const chunk of Bun.stdin.stream()) {
    buffer += decoder.decode(chunk, { stream: true });
    let newline = buffer.indexOf("\n");

    while (newline !== -1) {
      await handleLine(buffer.slice(0, newline));
      buffer = buffer.slice(newline + 1);
      newline = buffer.indexOf("\n");
    }
  }

  buffer += decoder.decode();
  await handleLine(buffer);
}

main().catch((error) => {
  log("fatal:", error instanceof Error ? error.message : String(error));
  process.exit(1);
});
