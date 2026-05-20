import { afterEach, beforeEach, expect, test } from "bun:test";
import { makeWorkspace, type Workspace } from "../core/test-helpers.ts";
import { dispatch, type JsonRpcResponse } from "./dispatch.ts";

let ws: Workspace;

beforeEach(() => {
  ws = makeWorkspace();
  ws.seedFeature({
    project: "demo",
    id: "2026-01-dq-alpha",
    archiveMd: "# cases\n",
  });
});

afterEach(() => {
  ws.cleanup();
});

function resultAs<T>(res: JsonRpcResponse | null): T {
  expect(res).not.toBeNull();
  expect(res?.error).toBeUndefined();
  return res?.result as T;
}

function textContent(res: JsonRpcResponse | null): Array<{ type: string; text: string }> {
  return resultAs<{ content: Array<{ type: string; text: string }> }>(res).content;
}

function dispatchRaw(input: unknown): Promise<JsonRpcResponse | null> {
  return dispatch(input as Parameters<typeof dispatch>[0]);
}

test("initialize returns protocol, capabilities, and serverInfo", async () => {
  const res = await dispatch({
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: { protocolVersion: "2025-06-18" },
  });

  expect(res).toEqual({
    jsonrpc: "2.0",
    id: 1,
    result: {
      protocolVersion: "2025-06-18",
      capabilities: { tools: { listChanged: false } },
      serverInfo: { name: "kata", version: "0.1.0" },
    },
  });
});

test("initialized notifications return null", async () => {
  expect(await dispatch({ jsonrpc: "2.0", method: "notifications/initialized" })).toBeNull();
  expect(await dispatch({ jsonrpc: "2.0", method: "initialized" })).toBeNull();
});

test("initialized requests with id receive a response", async () => {
  expect(await dispatch({ jsonrpc: "2.0", id: 25, method: "notifications/initialized" })).toEqual({
    jsonrpc: "2.0",
    id: 25,
    result: {},
  });
});

test("ping requests return empty result while ping notifications return null", async () => {
  expect(await dispatch({ jsonrpc: "2.0", id: "ping-1", method: "ping" })).toEqual({
    jsonrpc: "2.0",
    id: "ping-1",
    result: {},
  });
  expect(await dispatch({ jsonrpc: "2.0", method: "ping" })).toBeNull();
});

test("tools/list returns all 6 tool descriptors", async () => {
  const res = await dispatch({ jsonrpc: "2.0", id: 2, method: "tools/list" });
  const tools = resultAs<{ tools: Array<Record<string, unknown>> }>(res).tools;

  expect(tools).toHaveLength(6);
  expect(tools.map((tool) => tool.name).sort()).toEqual(
    [
      "kata_get_cases",
      "kata_get_feature",
      "kata_list_features",
      "kata_list_projects",
      "kata_list_skills",
      "kata_read_artifact",
    ].sort(),
  );
  for (const tool of tools) {
    expect(Object.keys(tool).sort()).toEqual(["description", "inputSchema", "name"]);
    expect(typeof tool.name).toBe("string");
    expect(typeof tool.description).toBe("string");
    expect((tool.inputSchema as { type?: unknown }).type).toBe("object");
  }
});

test("tools/call success wraps JSON values and preserves string values as text", async () => {
  const jsonRes = await dispatch({
    jsonrpc: "2.0",
    id: 3,
    method: "tools/call",
    params: { name: "kata_list_projects", arguments: {} },
  });

  const jsonText = textContent(jsonRes)[0];
  expect(jsonText.type).toBe("text");
  expect(JSON.parse(jsonText.text)).toEqual([{ name: "demo", featureCount: 1 }]);

  const stringRes = await dispatch({
    jsonrpc: "2.0",
    id: 31,
    method: "tools/call",
    params: {
      name: "kata_read_artifact",
      arguments: { project: "demo", featureId: "2026-01-dq-alpha", name: "archive.md" },
    },
  });

  expect(textContent(stringRes)).toEqual([{ type: "text", text: "# cases\n" }]);
});

test("tools/call unknown tool and thrown handler errors return isError content", async () => {
  const unknownRes = await dispatch({
    jsonrpc: "2.0",
    id: 4,
    method: "tools/call",
    params: { name: "nope", arguments: {} },
  });
  const unknown = resultAs<{ isError: boolean; content: Array<{ type: string; text: string }> }>(
    unknownRes,
  );
  expect(unknown.isError).toBe(true);
  expect(unknown.content).toEqual([{ type: "text", text: "Unknown tool: nope" }]);

  const thrownRes = await dispatch({
    jsonrpc: "2.0",
    id: 5,
    method: "tools/call",
    params: { name: "kata_list_features", arguments: {} },
  });
  const thrown = resultAs<{ isError: boolean; content: Array<{ type: string; text: string }> }>(
    thrownRes,
  );
  expect(thrown.isError).toBe(true);
  expect(thrown.content[0].type).toBe("text");
  expect(thrown.content[0].text).toContain("project");
});

test("tools/call rejects non-object arguments without invoking the tool", async () => {
  const res = await dispatch({
    jsonrpc: "2.0",
    id: 35,
    method: "tools/call",
    params: { name: "kata_list_projects", arguments: "bad" },
  });
  const result = resultAs<{ isError: boolean; content: Array<{ type: string; text: string }> }>(
    res,
  );

  expect(result.isError).toBe(true);
  expect(result.content[0].type).toBe("text");
  expect(result.content[0].text).toContain("arguments");
  expect(result.content[0].text).not.toContain("demo");
});

test("unknown method returns -32601 for requests and null for notifications", async () => {
  const res = await dispatch({ jsonrpc: "2.0", id: 6, method: "bogus" });

  expect(res).toEqual({
    jsonrpc: "2.0",
    id: 6,
    error: { code: -32601, message: "Method not found: bogus" },
  });
  expect(await dispatch({ jsonrpc: "2.0", method: "bogus" })).toBeNull();
});

test("invalid envelopes without id return invalid request errors with null id", async () => {
  for (const input of [
    { method: "ping" },
    { jsonrpc: "1.0", method: "ping" },
    { jsonrpc: "2.0", method: {} },
  ]) {
    const res = await dispatchRaw(input);

    expect(res).toMatchObject({
      jsonrpc: "2.0",
      id: null,
      error: { code: -32600 },
    });
    expect(res).not.toHaveProperty("result");
  }
});

test("non-object inputs return invalid request errors with null id", async () => {
  for (const input of [null, [], "x"]) {
    const res = await dispatchRaw(input);

    expect(res).toMatchObject({
      jsonrpc: "2.0",
      id: null,
      error: { code: -32600 },
    });
    expect(res).not.toHaveProperty("result");
  }
});

test("invalid runtime envelopes return invalid request errors without unsafe ids", async () => {
  const missingVersion = await dispatchRaw({ id: 26, method: "ping" });
  expect(missingVersion).toMatchObject({
    jsonrpc: "2.0",
    id: 26,
    error: { code: -32600 },
  });
  expect(missingVersion).not.toHaveProperty("result");

  const badVersion = await dispatchRaw({
    jsonrpc: "1.0",
    id: 27,
    method: "ping",
  });
  expect(badVersion).toMatchObject({
    jsonrpc: "2.0",
    id: 27,
    error: { code: -32600 },
  });
  expect(badVersion).not.toHaveProperty("result");

  const badMethod = await dispatchRaw({
    jsonrpc: "2.0",
    id: 28,
    method: {},
  });
  expect(badMethod).toMatchObject({
    jsonrpc: "2.0",
    id: 28,
    error: { code: -32600 },
  });
  expect(badMethod).not.toHaveProperty("result");

  const objectId = await dispatchRaw({
    jsonrpc: "2.0",
    id: { unsafe: true },
    method: "ping",
  });
  expect(objectId).toMatchObject({
    jsonrpc: "2.0",
    id: null,
    error: { code: -32600 },
  });
  expect(objectId?.id).not.toEqual({ unsafe: true });
  expect(objectId).not.toHaveProperty("result");
});
