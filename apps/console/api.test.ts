import { afterEach, beforeEach, expect, test } from "bun:test";
import { makeWorkspace, type Workspace } from "../core/test-helpers.ts";
import { handleApi } from "./api.ts";

let ws: Workspace;

beforeEach(() => {
  ws = makeWorkspace();
  ws.seedFeature({
    project: "demo",
    id: "2026-01-dq-alpha",
    modules: ["dq"],
    archiveMd: "# cases\n",
  });
  ws.seedFeature({
    project: "demo",
    id: "2026-02-metadata-beta",
    modules: ["metadata"],
  });
  ws.seedFeature({
    project: "demo space",
    id: "2026-03-dq-space",
    archiveMd: "# encoded\n",
  });
});

afterEach(() => ws.cleanup());

async function get(path: string): Promise<Response> {
  const res = await handleApi(new URL(`http://x${path}`));
  if (!res) throw new Error(`no route for ${path}`);
  return res;
}

test("non-api path returns null", async () => {
  expect(await handleApi(new URL("http://x/index.html"))).toBeNull();
});

test("GET /api/projects lists projects", async () => {
  const res = await get("/api/projects");

  expect(res.status).toBe(200);
  expect(await res.json()).toEqual([
    { name: "demo", featureCount: 2 },
    { name: "demo space", featureCount: 1 },
  ]);
});

test("GET /api/skills lists skills", async () => {
  const res = await get("/api/skills");
  const body = (await res.json()) as Array<{ id: string }>;

  expect(res.status).toBe(200);
  expect(body.some((skill) => skill.id === "case-draft")).toBe(true);
});

test("GET /api/projects/:project/features lists features", async () => {
  const res = await get("/api/projects/demo/features");
  const body = (await res.json()) as Array<{ id: string }>;

  expect(res.status).toBe(200);
  expect(body.map((feature) => feature.id)).toEqual(["2026-01-dq-alpha", "2026-02-metadata-beta"]);
});

test("GET /api/projects/:project/features applies supported filters", async () => {
  const res = await get("/api/projects/demo/features?module=metadata&ignored=1");
  const body = (await res.json()) as Array<{ id: string }>;

  expect(res.status).toBe(200);
  expect(body.map((feature) => feature.id)).toEqual(["2026-02-metadata-beta"]);
});

test("GET features with bad project returns 400", async () => {
  const res = await get("/api/projects/ghost/features");

  expect(res.status).toBe(400);
  expect(await res.json()).toEqual({ error: "Unknown project: ghost" });
});

test("GET routes with malformed percent-encoded path segments return 400", async () => {
  const paths = [
    "/api/projects/%E0%A4%A/features",
    "/api/projects/demo/features/%E0%A4%A",
    "/api/projects/demo/features/2026-01-dq-alpha/artifact/%E0%A4%A",
  ];

  for (const path of paths) {
    const res = await get(path);

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid URL path" });
  }
});

test("GET /api/projects/:project/features/:id returns feature detail", async () => {
  const res = await get("/api/projects/demo/features/2026-01-dq-alpha");
  const body = (await res.json()) as { metadata: { id: string } };

  expect(res.status).toBe(200);
  expect(body.metadata.id).toBe("2026-01-dq-alpha");
});

test("GET missing feature detail returns 404", async () => {
  const res = await get("/api/projects/demo/features/2099-XX-dq-missing");

  expect(res.status).toBe(404);
  expect(await res.json()).toEqual({
    error: "Feature not found: 2099-XX-dq-missing",
  });
});

test("GET /api/projects/:project/features/:id/artifacts lists artifacts", async () => {
  const res = await get("/api/projects/demo/features/2026-01-dq-alpha/artifacts");
  const body = (await res.json()) as Array<{ name: string; bytes: number }>;

  expect(res.status).toBe(200);
  expect(body.map((artifact) => artifact.name)).toEqual([
    "archive.md",
    "metadata.yaml",
    "manifest.json",
  ]);
  expect(body.find((artifact) => artifact.name === "archive.md")?.bytes).toBe(8);
});

test("GET /api/projects/:project/features/:id/xmind parses cases xmind", async () => {
  await ws.seedXmind("demo", "2026-01-dq-alpha", [
    {
      title: "Cases",
      rootTopic: {
        title: "Root",
        children: { attached: [{ title: "Leaf", markers: [{ markerId: "priority-1" }] }] },
      },
    },
  ]);

  const res = await get("/api/projects/demo/features/2026-01-dq-alpha/xmind");

  expect(res.status).toBe(200);
  expect(await res.json()).toEqual([
    {
      title: "Cases",
      root: {
        title: "Root",
        markers: [],
        note: null,
        children: [{ title: "Leaf", markers: ["priority-1"], note: null, children: [] }],
      },
    },
  ]);
});

test("GET /api/projects/:project/features/:id/artifact/:name returns text artifact", async () => {
  const res = await get("/api/projects/demo/features/2026-01-dq-alpha/artifact/archive.md");

  expect(res.status).toBe(200);
  expect(res.headers.get("content-type")).toBe("text/plain; charset=utf-8");
  expect(await res.text()).toBe("# cases\n");
});

test("GET artifact route decodes project and artifact names", async () => {
  const res = await get(
    "/api/projects/demo%20space/features/2026-03-dq-space/artifact/archive%2Emd",
  );

  expect(res.status).toBe(200);
  expect(await res.text()).toBe("# encoded\n");
});

test("GET non-whitelisted artifact returns 403", async () => {
  const res = await get("/api/projects/demo/features/2026-01-dq-alpha/artifact/secret.env");

  expect(res.status).toBe(403);
  expect(await res.json()).toEqual({ error: "Artifact not allowed: secret.env" });
});

test("unknown /api route returns 404 JSON", async () => {
  const res = await get("/api/nope");

  expect(res.status).toBe(404);
  expect(await res.json()).toEqual({ error: "Not found" });
});
