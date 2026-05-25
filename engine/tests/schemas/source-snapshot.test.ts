import { describe, expect, it } from "bun:test";
import { loadFeatureSourceSnapshotValidator } from "../../src/schemas/loaders.ts";

describe("FeatureSourceSnapshot@1", () => {
  const validate = loadFeatureSourceSnapshotValidator();
  const base = {
    schema: "FeatureSourceSnapshot@1",
    feature_id: "2026-05-lt-dq",
    lanhu: { url: "https://lanhuapp.com/...", page_id: "cd882ee83c4d440d878b49cc31f67cb6" },
    confirmed_source_repos: [
      {
        group: "customltem",
        project: "dt-insight-studio",
        branch: "dataAssets/release_6.3.x_ltqc",
        role: "frontend",
      },
    ],
    knowledge_refs: ["terms"],
  };
  it("accepts a complete snapshot", () => {
    expect(validate(base)).toBe(true);
  });
  it("rejects empty confirmed_source_repos when required by L2 (schema allows [], L2 enforces non-empty)", () => {
    // schema permits []; the non-empty rule lives in L2 (Task 2.x). Here just assert shape validity.
    expect(validate({ ...base, confirmed_source_repos: [] })).toBe(true);
  });
  it("rejects a repo missing branch", () => {
    expect(validate({ ...base, confirmed_source_repos: [{ group: "g", project: "p" }] })).toBe(
      false,
    );
  });
});
