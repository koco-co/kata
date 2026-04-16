import { describe, expect, it } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { renderProjection } from "../../src/ai-core/projection.ts";
import {
  checkProjectionLock,
  type ProjectionLock,
  renderProjectionLock,
} from "../../src/ai-core/projection-lock.ts";

describe("projection lock", () => {
  it("renders and checks hashes for generated and copied vendor files", async () => {
    const out = mkdtempSync(join(tmpdir(), "kata-lock-"));
    const rendered = await renderProjection({ runtime: "all", outputRoot: out });
    expect(rendered.ok).toBe(true);
    const lock = renderProjectionLock({ projectionRoot: out });
    expect(lock.generated_at).toBe("1970-01-01T00:00:00.000Z");
    expect(lock.files.some((file) => file.path === ".agents/skills/playwright-cli/SKILL.md")).toBe(
      true,
    );
    expect(lock.files.map((file) => file.path)).toEqual(
      [...lock.files.map((file) => file.path)].sort(),
    );
    const checked = checkProjectionLock({ projectionRoot: out, lock });
    expect(checked.ok).toBe(true);
  });

  it("reports missing locked files", async () => {
    const out = mkdtempSync(join(tmpdir(), "kata-lock-"));
    const rendered = await renderProjection({ runtime: "all", outputRoot: out });
    expect(rendered.ok).toBe(true);
    const lock = renderProjectionLock({ projectionRoot: out });
    rmSync(join(out, lock.files[0].path));

    const checked = checkProjectionLock({ projectionRoot: out, lock });

    expect(checked.ok).toBe(false);
    expect(checked.issues).toContainEqual(
      expect.objectContaining({
        code: "projection_lock.missing_file",
        path: lock.files[0].path,
      }),
    );
  });

  it("reports missing lock entries expected by projection inventory", async () => {
    const out = mkdtempSync(join(tmpdir(), "kata-lock-"));
    const rendered = await renderProjection({ runtime: "all", outputRoot: out });
    expect(rendered.ok).toBe(true);
    const lock = renderProjectionLock({ projectionRoot: out });
    const missing = lock.files[0];

    const checked = checkProjectionLock({
      projectionRoot: out,
      lock: { ...lock, files: lock.files.slice(1) },
    });

    expect(checked.ok).toBe(false);
    expect(checked.issues).toContainEqual(
      expect.objectContaining({
        code: "projection_lock.missing_entry",
        path: missing.path,
      }),
    );
  });

  it("scopes missing lock entries to the requested runtime", async () => {
    const out = mkdtempSync(join(tmpdir(), "kata-lock-"));
    const rendered = await renderProjection({ runtime: "all", outputRoot: out });
    expect(rendered.ok).toBe(true);
    const lock = renderProjectionLock({ projectionRoot: out });
    const codexFile = lock.files.find((file) => file.path.startsWith(".agents/"));
    expect(codexFile).toBeDefined();

    const checked = checkProjectionLock({
      projectionRoot: out,
      runtime: "claude",
      lock: {
        ...lock,
        files: lock.files.filter((file) => file.path !== codexFile?.path),
      },
    });

    expect(checked.ok).toBe(true);
  });

  it("reports extra lock entries not expected by projection inventory", async () => {
    const out = mkdtempSync(join(tmpdir(), "kata-lock-"));
    const rendered = await renderProjection({ runtime: "all", outputRoot: out });
    expect(rendered.ok).toBe(true);
    const lock = renderProjectionLock({ projectionRoot: out });

    const checked = checkProjectionLock({
      projectionRoot: out,
      lock: {
        ...lock,
        files: [
          ...lock.files,
          {
            path: ".agents/skills/not-in-inventory/SKILL.md",
            disposition: "generated",
            sha256: "0".repeat(64),
          },
        ],
      },
    });

    expect(checked.ok).toBe(false);
    expect(checked.issues).toContainEqual(
      expect.objectContaining({
        code: "projection_lock.extra_entry",
        path: ".agents/skills/not-in-inventory/SKILL.md",
      }),
    );
  });

  it("reports disposition mismatches against projection inventory", async () => {
    const out = mkdtempSync(join(tmpdir(), "kata-lock-"));
    const rendered = await renderProjection({ runtime: "all", outputRoot: out });
    expect(rendered.ok).toBe(true);
    const lock = renderProjectionLock({ projectionRoot: out });
    const generated = lock.files.find((file) => file.disposition === "generated");
    expect(generated).toBeDefined();

    const checked = checkProjectionLock({
      projectionRoot: out,
      lock: {
        ...lock,
        files: lock.files.map((file) =>
          file.path === generated?.path ? { ...file, disposition: "copied_vendor" } : file,
        ),
      },
    });

    expect(checked.ok).toBe(false);
    expect(checked.issues).toContainEqual(
      expect.objectContaining({
        code: "projection_lock.disposition_mismatch",
        path: generated?.path,
      }),
    );
  });

  it("reports hash mismatches for locked files", async () => {
    const out = mkdtempSync(join(tmpdir(), "kata-lock-"));
    const rendered = await renderProjection({ runtime: "all", outputRoot: out });
    expect(rendered.ok).toBe(true);
    const lock = renderProjectionLock({ projectionRoot: out });
    writeFileSync(join(out, lock.files[0].path), "changed");

    const checked = checkProjectionLock({ projectionRoot: out, lock });

    expect(checked.ok).toBe(false);
    expect(checked.issues).toContainEqual(
      expect.objectContaining({
        code: "projection_lock.hash_mismatch",
        path: lock.files[0].path,
      }),
    );
  });

  it("reports invalid lock shape without throwing", () => {
    const checked = checkProjectionLock({
      lock: { schema_version: 1, generated_at: "1970-01-01T00:00:00.000Z" } as ProjectionLock,
    });

    expect(checked.ok).toBe(false);
    expect(checked.issues).toContainEqual(
      expect.objectContaining({
        code: "projection_lock.invalid",
        path: ".ai/core/runtimes/projection-lock.json",
      }),
    );
  });
});
