import { describe, expect, it } from "bun:test";
import { diffLegacyProjection } from "../../src/ai-core/projection-diff.ts";

describe("legacy projection diff", () => {
  it("reports generated and vendor counts without retained historical migration rows", async () => {
    const report = await diffLegacyProjection({ runtime: "all" });
    expect(report).toEqual({
      generated: 102,
      copied_vendor: 22,
      local_exception: 0,
      deleted: 0,
    });
  });

  it("reports runtime-specific disposition counts", async () => {
    await expect(diffLegacyProjection({ runtime: "codex" })).resolves.toEqual({
      generated: 51,
      copied_vendor: 11,
      local_exception: 0,
      deleted: 0,
    });
    await expect(diffLegacyProjection({ runtime: "claude" })).resolves.toEqual({
      generated: 51,
      copied_vendor: 11,
      local_exception: 0,
      deleted: 0,
    });
  });

  it("rejects invalid runtime values inside the exported function", async () => {
    await expect(diffLegacyProjection({ runtime: "root" as never })).rejects.toThrow(
      'projection diff: unknown runtime "root"',
    );
  });
});
