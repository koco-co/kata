import { describe, expect, it } from "bun:test";
import { mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import JSZip from "jszip";
import { casesToIntermediate, renderXmind } from "../../cli/lib/cases/render-xmind.ts";
import type { CasesFile } from "../../cli/lib/cases/types.ts";
import { UNCLASSIFIED } from "../../cli/lib/xmind-render.ts";

function file(cases: CasesFile["cases"]): CasesFile {
  return { meta: { title: "需求名", version: "v1", feature_id: "g/f" }, cases };
}

describe("casesToIntermediate", () => {
  it("uses UNCLASSIFIED for the implicit page instead of duplicating the module name", () => {
    const data = casesToIntermediate(
      file([
        {
          id: "C001",
          title: "t",
          priority: "P1",
          tags: ["模块A"],
          steps: [{ action: "a", expected: "e" }],
        },
      ]),
    );
    expect(data.modules[0].name).toBe("模块A");
    expect(data.modules[0].pages[0].name).toBe(UNCLASSIFIED);
  });
});

describe("renderXmind", () => {
  it("flattens page-less cases under the module (no 模块>同名模块 nesting)", async () => {
    const dir = mkdtempSync(join(tmpdir(), "kata-rx-"));
    const out = join(dir, "需求名.xmind");
    await renderXmind(
      file([
        {
          id: "C001",
          title: "t",
          priority: "P1",
          tags: ["模块A"],
          steps: [{ action: "a", expected: "e" }],
        },
      ]),
      out,
    );
    const zip = await JSZip.loadAsync(readFileSync(out));
    const sheets = JSON.parse(await zip.file("content.json").async("string"));
    const l1 = sheets[0].rootTopic.children.attached[0];
    const mod = l1.children.attached.find((n: { title?: string }) => n.title === "模块A");
    expect(mod).toBeDefined();
    const titles = (mod.children?.attached ?? []).map((n: { title?: string }) => n.title);
    expect(titles).toContain("t");
    expect(titles).not.toContain("模块A");
  });

  it("replaces an existing file atomically and leaves no temp files", async () => {
    const dir = mkdtempSync(join(tmpdir(), "kata-rx-"));
    const out = join(dir, "需求名.xmind");
    writeFileSync(out, "corrupted-leftover");
    await renderXmind(
      file([{ id: "C001", title: "t", priority: "P1", steps: [{ action: "a", expected: "e" }] }]),
      out,
    );
    const zip = await JSZip.loadAsync(readFileSync(out));
    expect(zip.file("content.json")).not.toBeNull();
    expect(readdirSync(dir).filter((f) => f.endsWith(".tmp"))).toEqual([]);
  });
});
