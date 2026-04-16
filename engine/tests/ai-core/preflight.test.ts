import { describe, expect, it } from "bun:test";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runAiCorePreflight } from "../../src/ai-core/preflight.ts";
import { renderProjection } from "../../src/ai-core/projection.ts";

describe("ai-core preflight", () => {
  it("passes when projection, inventory, lock, and config checks pass", async () => {
    const result = await runAiCorePreflight({ runtime: "all", env: {} });
    expect(result.ok).toBe(true);
  });

  it("reports invalid scoped runtime env", async () => {
    const result = await runAiCorePreflight({
      runtime: "all",
      env: {
        KATA_TARGET_ENV: "../prod",
      },
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        code: "config.target_env_invalid",
        path: "env.KATA_TARGET_ENV",
      }),
    );
  });

  it("reports invalid scoped secret ref env", async () => {
    const result = await runAiCorePreflight({
      runtime: "all",
      env: {
        KATA_SECRET_REF_ZENTAO_TOKEN: "raw-token",
      },
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        code: "secret_ref.invalid",
        path: "env.KATA_SECRET_REF_ZENTAO_TOKEN",
      }),
    );
  });

  it("reports runtime conflict markers before runtime gates pass", async () => {
    const out = mkdtempSync(join(tmpdir(), "kata-preflight-conflict-"));
    const rendered = await renderProjection({ runtime: "all", outputRoot: out });
    expect(rendered.ok).toBe(true);
    const claudeDoc = join(out, "CLAUDE.md");
    writeFileSync(
      claudeDoc,
      `${readFileSync(claudeDoc, "utf8")}\n<<<<<<< ours\n=======\n>>>>>>> theirs\n`,
    );

    const result = await runAiCorePreflight({ runtime: "all", env: {}, projectionRoot: out });

    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        code: "runtime_conflict_marker.detected",
        path: "CLAUDE.md",
      }),
    );
  });

  it("reports raw KATA service secret env before runtime gates pass", async () => {
    const result = await runAiCorePreflight({
      runtime: "all",
      env: {
        KATA_LANHU_COOKIE: "raw-cookie",
        KATA_ZENTAO_PASSWORD: "raw-password",
        KATA_DINGTALK_WEBHOOK_URL: "https://hooks.example.test/token",
      },
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        code: "secret_env.blocked",
        path: "env.KATA_LANHU_COOKIE",
      }),
    );
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        code: "secret_env.blocked",
        path: "env.KATA_ZENTAO_PASSWORD",
      }),
    );
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        code: "secret_env.blocked",
        path: "env.KATA_DINGTALK_WEBHOOK_URL",
      }),
    );
  });

  it("scopes projection, inventory, and lock checks to the requested runtime", async () => {
    const out = mkdtempSync(join(tmpdir(), "kata-preflight-runtime-"));
    writeFileSync(
      join(out, "AGENTS.md"),
      readFileSync(join(import.meta.dirname, "../../../AGENTS.md"), "utf8"),
    );
    writeFileSync(
      join(out, "CLAUDE.md"),
      readFileSync(join(import.meta.dirname, "../../../CLAUDE.md"), "utf8"),
    );
    const rendered = await renderProjection({ runtime: "all", outputRoot: out });
    expect(rendered.ok).toBe(true);
    rmSync(join(out, ".agents/skills/playwright-cli/SKILL.md"));

    const claude = await runAiCorePreflight({ runtime: "claude", env: {}, projectionRoot: out });
    const codex = await runAiCorePreflight({ runtime: "codex", env: {}, projectionRoot: out });

    expect(claude.ok).toBe(true);
    expect(codex.ok).toBe(false);
    expect(codex.issues).toContainEqual(
      expect.objectContaining({
        code: "projection_lock.missing_file",
        path: ".agents/skills/playwright-cli/SKILL.md",
      }),
    );
  });
});
