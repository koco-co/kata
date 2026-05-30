import { describe, expect, it } from "bun:test";
import { generateRunId } from "@shared/lib/features/run-id.ts";

describe("run-id generator", () => {
  it("produces YYYYMMDD-HHmm-xxxxxxxx", () => {
    const id = generateRunId(new Date("2026-05-10T14:30:00Z"));
    expect(id).toMatch(/^\d{8}-\d{4}-[a-z0-9]{8}$/);
  });

  it("produces distinct ids across calls", () => {
    const a = generateRunId();
    const b = generateRunId();
    expect(a).not.toBe(b);
  });
});
