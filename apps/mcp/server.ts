#!/usr/bin/env bun
/**
 * kata MCP server — zero-dependency stdio JSON-RPC 2.0 (MCP).
 *
 * Exposes the kata QA workspace as MCP tools so Claude Code / Codex (and the
 * future in-platform agent) can query features, artifacts, cases and skills
 * structurally. Wire it via `claude -p --mcp-config` or a project .mcp.json.
 *
 * Protocol: newline-delimited JSON-RPC. stdout is reserved for protocol
 * messages; all logging goes to stderr.
 *
 * Run:  bun apps/mcp/server.ts   (or  bun run mcp)
 */
import { TOOL_BY_NAME, TOOLS } from "./tools.ts";

const SERVER_INFO = { name: "kata", version: "0.1.0" } as const;
const DEFAULT_PROTOCOL = "2025-06-18";

type JsonRpcId = string | number | null;
interface JsonRpcRequest {
  jsonrpc: "2.0";
  id?: JsonRpcId;
  method: string;
  params?: Record<string, unknown>;
}

function log(...args: unknown[]): void {
  process.stderr.write(`[kata-mcp] ${args.join(" ")}\n`);
}

function send(message: Record<string, unknown>): void {
  process.stdout.write(`${JSON.stringify(message)}\n`);
}

function reply(id: JsonRpcId, result: unknown): void {
  send({ jsonrpc: "2.0", id, result });
}

function replyError(id: JsonRpcId, code: number, message: string): void {
  send({ jsonrpc: "2.0", id, error: { code, message } });
}

async function callTool(
  name: string,
  args: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const tool = TOOL_BY_NAME.get(name);
  if (!tool) {
    return {
      isError: true,
      content: [{ type: "text", text: `Unknown tool: ${name}` }],
    };
  }
  try {
    const value = await tool.handler(args ?? {});
    const text = typeof value === "string" ? value : JSON.stringify(value, null, 2);
    return { content: [{ type: "text", text }] };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log(`tool ${name} failed:`, message);
    return { isError: true, content: [{ type: "text", text: message }] };
  }
}

async function handleRequest(req: JsonRpcRequest): Promise<void> {
  const { id, method, params } = req;
  const isNotification = id === undefined;

  switch (method) {
    case "initialize": {
      const requested = (params?.protocolVersion as string) ?? DEFAULT_PROTOCOL;
      reply(id ?? null, {
        protocolVersion: requested,
        capabilities: { tools: { listChanged: false } },
        serverInfo: SERVER_INFO,
      });
      return;
    }
    case "notifications/initialized":
    case "initialized":
      return; // notification — no response
    case "ping":
      if (!isNotification) reply(id ?? null, {});
      return;
    case "tools/list": {
      reply(id ?? null, {
        tools: TOOLS.map((t) => ({
          name: t.name,
          description: t.description,
          inputSchema: t.inputSchema,
        })),
      });
      return;
    }
    case "tools/call": {
      const name = params?.name as string;
      const args = (params?.arguments as Record<string, unknown>) ?? {};
      reply(id ?? null, await callTool(name, args));
      return;
    }
    default:
      if (!isNotification) replyError(id ?? null, -32601, `Method not found: ${method}`);
      return;
  }
}

async function main(): Promise<void> {
  log(`ready · ${TOOLS.length} tools · protocol ${DEFAULT_PROTOCOL}`);
  const decoder = new TextDecoder();
  let buffer = "";

  for await (const chunk of Bun.stdin.stream()) {
    buffer += decoder.decode(chunk, { stream: true });
    let newline = buffer.indexOf("\n");
    while (newline !== -1) {
      const line = buffer.slice(0, newline).trim();
      buffer = buffer.slice(newline + 1);
      if (line) {
        try {
          await handleRequest(JSON.parse(line) as JsonRpcRequest);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          log("parse/handle error:", message);
        }
      }
      newline = buffer.indexOf("\n");
    }
  }
}

main().catch((error) => {
  log("fatal:", error instanceof Error ? error.message : String(error));
  process.exit(1);
});
