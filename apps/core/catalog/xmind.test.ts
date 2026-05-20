import { afterEach, beforeEach, expect, test } from "bun:test";
import { mkdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import JSZip from "jszip";
import { ForbiddenError, InvalidInputError, NotFoundError } from "../errors.ts";
import { makeWorkspace, type Workspace } from "../test-helpers.ts";
import { parseXmind } from "./xmind.ts";

let ws: Workspace;
beforeEach(() => {
  ws = makeWorkspace();
  ws.seedFeature({ project: "demo", id: "2026-01-dq-alpha" });
});
afterEach(() => ws.cleanup());

async function writeXmind(full: string, contentJson: unknown): Promise<void> {
  const zip = new JSZip();
  zip.file("content.json", JSON.stringify(contentJson));
  writeFileSync(full, await zip.generateAsync({ type: "nodebuffer" }));
}

test("parseXmind returns sheets with nested topic tree, markers, notes", async () => {
  await ws.seedXmind("demo", "2026-01-dq-alpha", [
    {
      title: "Sheet 1",
      rootTopic: {
        title: "root",
        markers: [{ markerId: "priority-1" }],
        notes: { plain: { content: "root note" } },
        children: {
          attached: [{ title: "child A", children: { attached: [{ title: "grandchild" }] } }],
        },
      },
    },
  ]);
  const sheets = await parseXmind("demo", "2026-01-dq-alpha");
  expect(sheets).toHaveLength(1);
  expect(sheets[0].title).toBe("Sheet 1");
  expect(sheets[0].root.title).toBe("root");
  expect(sheets[0].root.markers).toEqual(["priority-1"]);
  expect(sheets[0].root.note).toBe("root note");
  expect(sheets[0].root.children[0].title).toBe("child A");
  expect(sheets[0].root.children[0].children[0].title).toBe("grandchild");
});

test("parseXmind throws NotFoundError when cases.xmind absent", async () => {
  await expect(parseXmind("demo", "2026-01-dq-alpha")).rejects.toThrow(NotFoundError);
});

test("parseXmind rejects symlinked cases.xmind", async () => {
  const external = join(ws.root, "external.xmind");
  await writeXmind(external, [{ title: "escape", rootTopic: { title: "root" } }]);
  symlinkSync(external, join(ws.root, "demo", "features", "2026-01-dq-alpha", "cases.xmind"));

  await expect(parseXmind("demo", "2026-01-dq-alpha")).rejects.toThrow(ForbiddenError);
});

test("parseXmind rejects broken symlinked cases.xmind", async () => {
  symlinkSync(
    join(ws.root, "missing-targets", "cases.xmind"),
    join(ws.root, "demo", "features", "2026-01-dq-alpha", "cases.xmind"),
  );

  await expect(parseXmind("demo", "2026-01-dq-alpha")).rejects.toThrow(ForbiddenError);
});

test("parseXmind rejects symlinked project root exposing outside cases.xmind", async () => {
  const externalProject = join(ws.root, "external-project");
  const externalFeature = join(externalProject, "features", "2026-01-dq-alpha");
  mkdirSync(externalFeature, { recursive: true });
  await writeXmind(join(externalFeature, "cases.xmind"), [
    { title: "escape", rootTopic: { title: "root" } },
  ]);
  rmSync(join(ws.root, "demo"), { recursive: true, force: true });
  symlinkSync(externalProject, join(ws.root, "demo"));

  await expect(parseXmind("demo", "2026-01-dq-alpha")).rejects.toThrow(ForbiddenError);
});

test("parseXmind rejects broken symlinked project root", async () => {
  rmSync(join(ws.root, "demo"), { recursive: true, force: true });
  symlinkSync(join(ws.root, "missing-targets", "demo"), join(ws.root, "demo"), "dir");

  await expect(parseXmind("demo", "2026-01-dq-alpha")).rejects.toThrow(ForbiddenError);
});

test("parseXmind rejects symlinked features dir exposing outside cases.xmind", async () => {
  const externalFeatures = join(ws.root, "external-features");
  const externalFeature = join(externalFeatures, "2026-01-dq-alpha");
  mkdirSync(externalFeature, { recursive: true });
  await writeXmind(join(externalFeature, "cases.xmind"), [
    { title: "escape", rootTopic: { title: "root" } },
  ]);
  rmSync(join(ws.root, "demo", "features"), { recursive: true, force: true });
  symlinkSync(externalFeatures, join(ws.root, "demo", "features"));

  await expect(parseXmind("demo", "2026-01-dq-alpha")).rejects.toThrow(ForbiddenError);
});

test("parseXmind rejects symlinked feature dir exposing outside cases.xmind", async () => {
  const externalFeature = join(ws.root, "external-feature");
  mkdirSync(externalFeature, { recursive: true });
  await writeXmind(join(externalFeature, "cases.xmind"), [
    { title: "escape", rootTopic: { title: "root" } },
  ]);
  rmSync(join(ws.root, "demo", "features", "2026-01-dq-alpha"), {
    recursive: true,
    force: true,
  });
  symlinkSync(externalFeature, join(ws.root, "demo", "features", "2026-01-dq-alpha"));

  await expect(parseXmind("demo", "2026-01-dq-alpha")).rejects.toThrow(ForbiddenError);
});

test("parseXmind includes attached detached and floating child topics", async () => {
  await ws.seedXmind("demo", "2026-01-dq-alpha", [
    {
      title: "Sheet 1",
      rootTopic: {
        title: "root",
        children: {
          attached: [{ title: "attached child" }],
          detached: [{ title: "detached child" }],
          floating: [{ title: "floating child" }],
        },
      },
    },
  ]);

  const sheets = await parseXmind("demo", "2026-01-dq-alpha");

  expect(sheets[0].root.children.map((child) => child.title)).toEqual([
    "attached child",
    "detached child",
    "floating child",
  ]);
});

test("parseXmind rejects xmind zip missing content.json", async () => {
  const zip = new JSZip();
  zip.file("metadata.json", "{}");
  writeFileSync(
    join(ws.root, "demo", "features", "2026-01-dq-alpha", "cases.xmind"),
    await zip.generateAsync({ type: "nodebuffer" }),
  );

  await expect(parseXmind("demo", "2026-01-dq-alpha")).rejects.toThrow(InvalidInputError);
});

test("parseXmind rejects non-array content.json", async () => {
  await ws.seedXmind("demo", "2026-01-dq-alpha", { title: "not an array" });

  await expect(parseXmind("demo", "2026-01-dq-alpha")).rejects.toThrow(InvalidInputError);
});

test("parseXmind rejects corrupt cases.xmind zip", async () => {
  writeFileSync(join(ws.root, "demo", "features", "2026-01-dq-alpha", "cases.xmind"), "not a zip");

  await expect(parseXmind("demo", "2026-01-dq-alpha")).rejects.toThrow(InvalidInputError);
});

test("parseXmind rejects sheets missing rootTopic", async () => {
  await ws.seedXmind("demo", "2026-01-dq-alpha", [{ title: "missing root" }]);

  await expect(parseXmind("demo", "2026-01-dq-alpha")).rejects.toThrow(InvalidInputError);
});

test("parseXmind rejects malformed marker entries", async () => {
  await ws.seedXmind("demo", "2026-01-dq-alpha", [
    {
      title: "Sheet 1",
      rootTopic: {
        title: "root",
        markers: [null],
      },
    },
  ]);

  await expect(parseXmind("demo", "2026-01-dq-alpha")).rejects.toThrow(InvalidInputError);
});

test("parseXmind rejects non-string markerId values", async () => {
  await ws.seedXmind("demo", "2026-01-dq-alpha", [
    {
      title: "Sheet 1",
      rootTopic: {
        title: "root",
        markers: [{ markerId: 123 }],
      },
    },
  ]);

  await expect(parseXmind("demo", "2026-01-dq-alpha")).rejects.toThrow(InvalidInputError);
});

test("parseXmind rejects non-string note content", async () => {
  await ws.seedXmind("demo", "2026-01-dq-alpha", [
    {
      title: "Sheet 1",
      rootTopic: {
        title: "root",
        notes: { plain: { content: 123 } },
      },
    },
  ]);

  await expect(parseXmind("demo", "2026-01-dq-alpha")).rejects.toThrow(InvalidInputError);
});

test("parseXmind rejects non-object child topics", async () => {
  await ws.seedXmind("demo", "2026-01-dq-alpha", [
    {
      title: "Sheet 1",
      rootTopic: {
        title: "root",
        children: { attached: ["not an object"] },
      },
    },
  ]);

  await expect(parseXmind("demo", "2026-01-dq-alpha")).rejects.toThrow(InvalidInputError);
});
