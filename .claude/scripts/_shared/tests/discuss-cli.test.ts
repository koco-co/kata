import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { repoRoot } from "@shared/lib/paths.ts";
import { $ } from "bun";

const P = "test-d1-cli";
const YM = "202604";
const SLUG = "cli-slug";
const CLI = join(repoRoot(), ".claude/skills/case-draft/scripts/discuss.ts");

function cleanup() {
  const ws = join(repoRoot(), "workspace", P);
  if (existsSync(ws)) rmSync(ws, { recursive: true, force: true });
}

const P2 = "test-project";
const YM2 = "202605";
const SLUG2 = "complete-slug";
const ENHANCED_DIR = join(repoRoot(), "workspace", P2, "features", `${YM2}-${SLUG2}`);
const ENHANCED_FILE = join(ENHANCED_DIR, "enhanced.md");

function cleanupP2() {
  const ws = join(repoRoot(), "workspace", P2);
  if (existsSync(ws)) rmSync(ws, { recursive: true, force: true });
}

/** Run the CLI and return parsed JSON stdout. */
async function cli(...args: string[]) {
  const r = await $`bun ${CLI} ${args}`.nothrow().quiet();
  return { exitCode: r.exitCode, stdout: JSON.parse(r.stdout.toString()) };
}

describe("discuss CLI — new subcommands", () => {
  beforeEach(cleanup);
  afterEach(cleanup);

  test("init creates enhanced.md", async () => {
    const r = await $`bun ${CLI} init --project ${P} --yyyymm ${YM} --prd-slug ${SLUG}`.quiet();
    expect(r.exitCode).toBe(0);
    expect(
      existsSync(join(repoRoot(), "workspace", P, "features", `${YM}-${SLUG}`, "enhanced.md")),
    ).toBe(true);
  });

  test("read returns JSON frontmatter", async () => {
    await $`bun ${CLI} init --project ${P} --yyyymm ${YM} --prd-slug ${SLUG}`.quiet();
    const r = await $`bun ${CLI} read --project ${P} --yyyymm ${YM} --prd-slug ${SLUG}`.quiet();
    expect(r.exitCode).toBe(0);
    const out = JSON.parse(r.stdout.toString());
    expect(out.frontmatter.status).toBe("discussing");
  });

  test("add-pending + resolve + list-pending", async () => {
    await $`bun ${CLI} init --project ${P} --yyyymm ${YM} --prd-slug ${SLUG}`.quiet();
    const add =
      await $`bun ${CLI} add-pending --project ${P} --yyyymm ${YM} --prd-slug ${SLUG} --location s-1 --label "§1" --question "q?" --recommended "r" --expected "e" --severity blocking_unknown`.quiet();
    const qid = JSON.parse(add.stdout.toString()).id;
    expect(qid).toBe("q1");
    const list1 =
      await $`bun ${CLI} list-pending --project ${P} --yyyymm ${YM} --prd-slug ${SLUG} --format json`.quiet();
    expect(JSON.parse(list1.stdout.toString()).length).toBe(1);
    await $`bun ${CLI} resolve --project ${P} --yyyymm ${YM} --prd-slug ${SLUG} --id ${qid} --answer "final"`.quiet();
    const list2 =
      await $`bun ${CLI} list-pending --project ${P} --yyyymm ${YM} --prd-slug ${SLUG} --format json`.quiet();
    expect(JSON.parse(list2.stdout.toString()).length).toBe(0);
  });

  test("validate --require-zero-pending returns non-zero exit with pending", async () => {
    await $`bun ${CLI} init --project ${P} --yyyymm ${YM} --prd-slug ${SLUG}`.quiet();
    await $`bun ${CLI} add-pending --project ${P} --yyyymm ${YM} --prd-slug ${SLUG} --location s-1 --label x --question q --recommended r --expected e --severity blocking_unknown`.quiet();
    const r =
      await $`bun ${CLI} validate --project ${P} --yyyymm ${YM} --prd-slug ${SLUG} --require-zero-pending`
        .nothrow()
        .quiet();
    expect(r.exitCode).not.toBe(0);
  });

  test("validate --require-zero-blocking-pending exits 3 with unresolved blocking pending", async () => {
    await $`bun ${CLI} init --project ${P} --yyyymm ${YM} --prd-slug ${SLUG}`.quiet();
    await $`bun ${CLI} add-pending --project ${P} --yyyymm ${YM} --prd-slug ${SLUG} --location s-1 --label x --question q --recommended r --expected e --severity blocking_unknown`.quiet();

    const r =
      await $`bun ${CLI} validate --project ${P} --yyyymm ${YM} --prd-slug ${SLUG} --require-zero-blocking-pending`
        .nothrow()
        .quiet();

    expect(r.exitCode).toBe(3);
    expect(JSON.parse(r.stdout.toString()).issues).toContain(
      "blocking pending_count > 0 (requireZeroBlockingPending)",
    );
  });

  test("validate --require-zero-blocking-pending exits 0 with only non-blocking unresolved pending", async () => {
    await $`bun ${CLI} init --project ${P} --yyyymm ${YM} --prd-slug ${SLUG}`.quiet();

    for (const severity of [
      "non_blocking_question",
      "high_risk_pending",
      "automation_deferred",
      "defaultable_unknown",
    ]) {
      await $`bun ${CLI} add-pending --project ${P} --yyyymm ${YM} --prd-slug ${SLUG} --location s-1 --label x --question q --recommended r --expected e --severity ${severity}`.quiet();
    }

    const r =
      await $`bun ${CLI} validate --project ${P} --yyyymm ${YM} --prd-slug ${SLUG} --require-zero-blocking-pending`
        .nothrow()
        .quiet();

    expect(r.exitCode).toBe(0);
    expect(JSON.parse(r.stdout.toString()).ok).toBe(true);
  });

  test("validate --require-zero-pending still exits non-zero with non-blocking pending", async () => {
    await $`bun ${CLI} init --project ${P} --yyyymm ${YM} --prd-slug ${SLUG}`.quiet();
    await $`bun ${CLI} add-pending --project ${P} --yyyymm ${YM} --prd-slug ${SLUG} --location s-1 --label x --question q --recommended r --expected e --severity non_blocking_question`.quiet();

    const r =
      await $`bun ${CLI} validate --project ${P} --yyyymm ${YM} --prd-slug ${SLUG} --require-zero-pending`
        .nothrow()
        .quiet();

    expect(r.exitCode).not.toBe(0);
  });

  test("add-pending rejects unknown severity with JSON error", async () => {
    await $`bun ${CLI} init --project ${P} --yyyymm ${YM} --prd-slug ${SLUG}`.quiet();

    const r =
      await $`bun ${CLI} add-pending --project ${P} --yyyymm ${YM} --prd-slug ${SLUG} --location s-1 --label x --question q --recommended r --expected e --severity blockng_unknown`
        .nothrow()
        .quiet();

    expect(r.exitCode).not.toBe(0);
    expect(JSON.parse(r.stdout.toString())).toEqual({
      ok: false,
      error: "invalid severity",
    });
  });

  test("validate fails malformed stored pending severity", async () => {
    await $`bun ${CLI} init --project ${P} --yyyymm ${YM} --prd-slug ${SLUG}`.quiet();
    await $`bun ${CLI} add-pending --project ${P} --yyyymm ${YM} --prd-slug ${SLUG} --location s-1 --label x --question q --recommended r --expected e --severity blocking_unknown`.quiet();

    const enhanced = join(repoRoot(), "workspace", P, "features", `${YM}-${SLUG}`, "enhanced.md");
    writeFileSync(
      enhanced,
      readFileSync(enhanced, "utf8").replace(
        "severity: blocking_unknown",
        "severity: blockng_unknown",
      ),
      "utf8",
    );

    const r =
      await $`bun ${CLI} validate --project ${P} --yyyymm ${YM} --prd-slug ${SLUG} --require-zero-blocking-pending`
        .nothrow()
        .quiet();

    expect(r.exitCode).not.toBe(0);
    expect(JSON.parse(r.stdout.toString()).issues).toContain(
      "invalid pending severity in q1: blockng_unknown",
    );
  });

  test("set-status transitions", async () => {
    await $`bun ${CLI} init --project ${P} --yyyymm ${YM} --prd-slug ${SLUG}`.quiet();
    await $`bun ${CLI} set-status --project ${P} --yyyymm ${YM} --prd-slug ${SLUG} --status analyzing`.quiet();
    const r = await $`bun ${CLI} read --project ${P} --yyyymm ${YM} --prd-slug ${SLUG}`.quiet();
    expect(JSON.parse(r.stdout.toString()).frontmatter.status).toBe("analyzing");
  });

  test("set-status rejects unknown status with JSON error", async () => {
    await $`bun ${CLI} init --project ${P} --yyyymm ${YM} --prd-slug ${SLUG}`.quiet();

    const r =
      await $`bun ${CLI} set-status --project ${P} --yyyymm ${YM} --prd-slug ${SLUG} --status invalid-status`
        .nothrow()
        .quiet();

    expect(r.exitCode).not.toBe(0);
    expect(JSON.parse(r.stdout.toString())).toEqual({
      ok: false,
      error:
        "invalid status, must be one of: discussing, pending-review, ready, analyzing, writing, completed",
    });

    const read = await $`bun ${CLI} read --project ${P} --yyyymm ${YM} --prd-slug ${SLUG}`.quiet();
    expect(JSON.parse(read.stdout.toString()).frontmatter.status).toBe("discussing");
  });
});

describe("discuss CLI — complete subcommand", () => {
  beforeEach(cleanupP2);
  afterEach(cleanupP2);

  test("happy path: init + complete with knowledge summary and default status", async () => {
    await $`bun ${CLI} init --project ${P2} --yyyymm ${YM2} --prd-slug ${SLUG2}`.quiet();

    const knowledge = JSON.stringify([{ type: "rule", name: "date-format", confidence: "high" }]);
    const r = await cli(
      "complete",
      `--project=${P2}`,
      `--yyyymm=${YM2}`,
      `--prd-slug=${SLUG2}`,
      `--knowledge-summary=${knowledge}`,
    );

    expect(r.exitCode).toBe(0);
    expect(r.stdout.ok).toBe(true);
    expect(r.stdout.status).toBe("pending-review");
    expect(r.stdout.knowledge_dropped).toEqual([
      { type: "rule", name: "date-format", confidence: "high" },
    ]);
    expect(r.stdout.file).toBe(ENHANCED_FILE);
  });

  test("complete with custom status --status ready", async () => {
    await $`bun ${CLI} init --project ${P2} --yyyymm ${YM2} --prd-slug ${SLUG2}`.quiet();

    const knowledge = JSON.stringify([
      { type: "api", name: "user-endpoint", confidence: "medium" },
    ]);
    const r = await cli(
      "complete",
      `--project=${P2}`,
      `--yyyymm=${YM2}`,
      `--prd-slug=${SLUG2}`,
      `--knowledge-summary=${knowledge}`,
      "--status=ready",
    );

    expect(r.exitCode).toBe(0);
    expect(r.stdout.ok).toBe(true);
    expect(r.stdout.status).toBe("ready");
    expect(r.stdout.knowledge_dropped).toEqual([
      { type: "api", name: "user-endpoint", confidence: "medium" },
    ]);
  });

  test("complete with no knowledge summary (defaults to empty array)", async () => {
    await $`bun ${CLI} init --project ${P2} --yyyymm ${YM2} --prd-slug ${SLUG2}`.quiet();

    const r = await cli("complete", `--project=${P2}`, `--yyyymm=${YM2}`, `--prd-slug=${SLUG2}`);

    expect(r.exitCode).toBe(0);
    expect(r.stdout.ok).toBe(true);
    expect(r.stdout.status).toBe("pending-review");
    expect(r.stdout.knowledge_dropped).toEqual([]);
  });

  test("error: enhanced.md not found (wrong slug)", async () => {
    const r = await cli("complete", `--project=${P2}`, `--yyyymm=${YM2}`, "--prd-slug=nonexistent");

    expect(r.exitCode).toBe(1);
    expect(r.stdout.ok).toBe(false);
    expect(r.stdout.error).toBe("enhanced.md not found");
  });

  test("error: invalid --knowledge-summary JSON", async () => {
    await $`bun ${CLI} init --project ${P2} --yyyymm ${YM2} --prd-slug ${SLUG2}`.quiet();

    const r = await cli(
      "complete",
      `--project=${P2}`,
      `--yyyymm=${YM2}`,
      `--prd-slug=${SLUG2}`,
      "--knowledge-summary=not-json",
    );

    expect(r.exitCode).toBe(1);
    expect(r.stdout.ok).toBe(false);
    expect(r.stdout.error).toBe("invalid JSON");
  });

  test("error: invalid --status value", async () => {
    await $`bun ${CLI} init --project ${P2} --yyyymm ${YM2} --prd-slug ${SLUG2}`.quiet();

    const r = await cli(
      "complete",
      `--project=${P2}`,
      `--yyyymm=${YM2}`,
      `--prd-slug=${SLUG2}`,
      "--status=invalid-status",
    );

    expect(r.exitCode).toBe(1);
    expect(r.stdout.ok).toBe(false);
    expect(r.stdout.error).toBe("invalid status, must be one of: pending-review, ready");
  });

  test("verify updated_at is bumped", async () => {
    await $`bun ${CLI} init --project ${P2} --yyyymm ${YM2} --prd-slug ${SLUG2}`.quiet();

    // Read before timestamp
    const before = await cli("read", `--project=${P2}`, `--yyyymm=${YM2}`, `--prd-slug=${SLUG2}`);
    const beforeTs = new Date(before.stdout.frontmatter.updated_at).getTime();

    // Small delay to ensure timestamp difference
    await new Promise((r) => setTimeout(r, 10));

    // Complete
    await cli("complete", `--project=${P2}`, `--yyyymm=${YM2}`, `--prd-slug=${SLUG2}`);

    // Read after timestamp
    const after = await cli("read", `--project=${P2}`, `--yyyymm=${YM2}`, `--prd-slug=${SLUG2}`);
    const afterTs = new Date(after.stdout.frontmatter.updated_at).getTime();

    expect(afterTs).toBeGreaterThan(beforeTs);
  });
});
