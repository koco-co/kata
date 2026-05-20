import { TOOL_BY_NAME, TOOLS } from "./tools.ts";

const DEFAULT_PROTOCOL_VERSION = "2025-06-18";
const SERVER_INFO = { name: "kata", version: "0.1.0" } as const;
const INVALID_REQUEST = -32600;

export type JsonRpcId = string | number | null;

export interface JsonRpcRequest {
  readonly jsonrpc: "2.0";
  readonly id?: JsonRpcId;
  readonly method: string;
  readonly params?: Record<string, unknown>;
}

export interface JsonRpcResponse {
  readonly jsonrpc: "2.0";
  readonly id: JsonRpcId;
  readonly result?: unknown;
  readonly error?: { readonly code: number; readonly message: string };
}

interface TextContent {
  readonly type: "text";
  readonly text: string;
}

interface ToolCallResult {
  readonly content: readonly TextContent[];
  readonly isError?: true;
}

function successResponse(id: JsonRpcId, result: unknown): JsonRpcResponse {
  return { jsonrpc: "2.0", id, result };
}

function errorResponse(id: JsonRpcId, code: number, message: string): JsonRpcResponse {
  return { jsonrpc: "2.0", id, error: { code, message } };
}

function toolText(text: string): ToolCallResult {
  return { content: [{ type: "text", text }] };
}

function toolError(message: string): ToolCallResult {
  return { isError: true, content: [{ type: "text", text: message }] };
}

function stringifyToolValue(value: unknown): string {
  if (typeof value === "string") return value;
  return JSON.stringify(value, null, 2) ?? String(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isJsonRpcId(value: unknown): value is JsonRpcId {
  return value === null || typeof value === "string" || typeof value === "number";
}

function invalidRequest(id: JsonRpcId): JsonRpcResponse {
  return errorResponse(id, INVALID_REQUEST, "Invalid Request");
}

async function callTool(name: string, args: Record<string, unknown>): Promise<ToolCallResult> {
  const tool = TOOL_BY_NAME.get(name);
  if (tool === undefined) {
    return toolError(`Unknown tool: ${name}`);
  }

  try {
    return toolText(stringifyToolValue(await tool.handler(args)));
  } catch (error) {
    return toolError(error instanceof Error ? error.message : String(error));
  }
}

function toolCallParams(params: Record<string, unknown> | undefined): {
  readonly name: string | null;
  readonly argsError: string | null;
  readonly args: Record<string, unknown>;
} {
  const name = params?.name;
  if (params !== undefined && Object.hasOwn(params, "arguments")) {
    const args = params.arguments;
    if (!isRecord(args)) {
      return {
        name: typeof name === "string" ? name : null,
        argsError: "Invalid arguments: expected object",
        args: {},
      };
    }
    return {
      name: typeof name === "string" ? name : null,
      argsError: null,
      args,
    };
  }
  return {
    name: typeof name === "string" ? name : null,
    argsError: null,
    args: {},
  };
}

/**
 * Pure JSON-RPC dispatch. It returns a response object for requests and null
 * for notifications; transport adapters own all stdout/stderr behavior.
 */
export async function dispatch(input: JsonRpcRequest): Promise<JsonRpcResponse | null> {
  const req = input as unknown;
  if (!isRecord(req)) {
    return invalidRequest(null);
  }

  const rawId = req.id;
  const hasId = Object.hasOwn(req, "id");
  if (hasId && !isJsonRpcId(rawId)) {
    return invalidRequest(null);
  }

  const isNotification = !hasId;
  const id: JsonRpcId = isNotification ? null : (rawId as JsonRpcId);

  if (req.jsonrpc !== "2.0" || typeof req.method !== "string") {
    return invalidRequest(id);
  }

  if (req.method === "notifications/initialized" || req.method === "initialized") {
    return isNotification ? null : successResponse(id, {});
  }

  if (isNotification) {
    return null;
  }

  switch (req.method) {
    case "initialize": {
      const params = isRecord(req.params) ? req.params : undefined;
      return successResponse(id, {
        protocolVersion:
          typeof params?.protocolVersion === "string"
            ? params.protocolVersion
            : DEFAULT_PROTOCOL_VERSION,
        capabilities: { tools: { listChanged: false } },
        serverInfo: SERVER_INFO,
      });
    }

    case "ping":
      return successResponse(id, {});

    case "tools/list":
      return successResponse(id, {
        tools: TOOLS.map((tool) => ({
          name: tool.name,
          description: tool.description,
          inputSchema: tool.inputSchema,
        })),
      });

    case "tools/call": {
      const params = isRecord(req.params) ? req.params : undefined;
      const { name, argsError, args } = toolCallParams(params);
      if (name === null) {
        return successResponse(id, toolError("Missing required string argument: name"));
      }
      if (argsError !== null) {
        return successResponse(id, toolError(argsError));
      }
      return successResponse(id, await callTool(name, args));
    }

    default:
      return errorResponse(id, -32601, `Method not found: ${req.method}`);
  }
}
