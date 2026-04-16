import { describe, expect, it } from "bun:test";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { checkVendorSkill, freezeVendorSkill } from "../../src/ai-core/vendor.ts";

describe("ai-core vendor skills", () => {
  it("freezes playwright-cli under .ai/vendor-skills without renaming it", async () => {
    const root = mkdtempSync(join(tmpdir(), "kata-vendor-"));
    const result = await freezeVendorSkill({
      root,
      id: "playwright-cli",
      sourceDir: join(import.meta.dirname, "fixtures/vendor-playwright-cli"),
    });
    expect(result.ok).toBe(true);
    const manifest = readFileSync(
      join(root, ".ai/vendor-skills/playwright-cli/manifest.yaml"),
      "utf8",
    );
    expect(manifest).toContain("id: playwright-cli");
    expect(manifest).toContain("canonical_name: playwright-cli");
  });

  it("detects vendored file drift from the frozen manifest hash", async () => {
    const root = mkdtempSync(join(tmpdir(), "kata-vendor-"));
    await freezeVendorSkill({
      root,
      id: "playwright-cli",
      sourceDir: join(import.meta.dirname, "fixtures/vendor-playwright-cli"),
    });
    writeFileSync(join(root, ".ai/vendor-skills/playwright-cli/files/SKILL.md"), "mutated");

    const result = await checkVendorSkill({ root, id: "playwright-cli" });

    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual({
      code: "vendor.manifest_mismatch",
      severity: "error",
      message: "Vendored file hash does not match frozen manifest.",
      path: ".ai/vendor-skills/playwright-cli/files/SKILL.md",
    });
  });

  it("rejects manifest file paths that escape the vendor files root", async () => {
    const root = mkdtempSync(join(tmpdir(), "kata-vendor-"));
    const vendorRoot = join(root, ".ai/vendor-skills/playwright-cli");
    mkdirSync(join(vendorRoot, "files"), { recursive: true });
    writeFileSync(
      join(vendorRoot, "manifest.yaml"),
      [
        "id: playwright-cli",
        "canonical_name: playwright-cli",
        "files:",
        "  - path: ../manifest.yaml",
        "    sha256: 0000000000000000000000000000000000000000000000000000000000000000",
        "",
      ].join("\n"),
    );

    const result = await checkVendorSkill({ root, id: "playwright-cli" });

    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual({
      code: "vendor.manifest_path_invalid",
      severity: "error",
      message: "Vendor manifest file path must stay inside the vendor files root.",
      path: ".ai/vendor-skills/playwright-cli/files/../manifest.yaml",
    });
  });

  it("fails closed when vendor manifest files yaml has a block scalar", async () => {
    const root = mkdtempSync(join(tmpdir(), "kata-vendor-"));
    const vendorRoot = join(root, ".ai/vendor-skills/playwright-cli");
    mkdirSync(join(vendorRoot, "files"), { recursive: true });
    writeFileSync(join(vendorRoot, "files/SKILL.md"), "skill");
    writeFileSync(
      join(vendorRoot, "manifest.yaml"),
      ["id: playwright-cli", "canonical_name: playwright-cli", "files: |", "  SKILL.md", ""].join(
        "\n",
      ),
    );

    const result = await checkVendorSkill({ root, id: "playwright-cli" });

    expect(result.ok).toBe(false);
    const codes = result.issues.map((issue) => issue.code);
    expect(codes).toContain("yaml.unsupported_block_scalar");
    expect(codes).not.toContain("vendor.manifest_hash_missing");
    expect(codes).not.toContain("vendor.manifest_identity_invalid");
    expect(codes).not.toContain("vendor.manifest_shape_invalid");
    expect(codes).not.toContain("vendor.manifest_mismatch");
  });

  it("reports filesystem safety issues when vendor manifest yaml is malformed", async () => {
    const root = mkdtempSync(join(tmpdir(), "kata-vendor-"));
    const outside = mkdtempSync(join(tmpdir(), "kata-vendor-outside-"));
    const vendorRoot = join(root, ".ai/vendor-skills/playwright-cli");
    mkdirSync(join(vendorRoot, "files"), { recursive: true });
    writeFileSync(join(outside, "secret.md"), "secret");
    symlinkSync(outside, join(vendorRoot, "files/link"), "dir");
    writeFileSync(
      join(vendorRoot, "manifest.yaml"),
      ["id: playwright-cli", "canonical_name: playwright-cli", "files: |", "  SKILL.md", ""].join(
        "\n",
      ),
    );

    const result = await checkVendorSkill({ root, id: "playwright-cli" });

    expect(result.ok).toBe(false);
    const codes = result.issues.map((issue) => issue.code);
    expect(codes).toContain("yaml.unsupported_block_scalar");
    expect(codes).toContain("vendor.manifest_path_invalid");
    expect(codes).not.toContain("vendor.manifest_hash_missing");
    expect(codes).not.toContain("vendor.manifest_identity_invalid");
    expect(codes).not.toContain("vendor.manifest_shape_invalid");
    expect(codes).not.toContain("vendor.manifest_mismatch");
  });

  it("fails closed when vendor manifest rows contain unknown fields", async () => {
    const root = mkdtempSync(join(tmpdir(), "kata-vendor-"));
    const vendorRoot = join(root, ".ai/vendor-skills/playwright-cli");
    mkdirSync(join(vendorRoot, "files"), { recursive: true });
    writeFileSync(join(vendorRoot, "files/SKILL.md"), "skill");
    writeFileSync(
      join(vendorRoot, "manifest.yaml"),
      [
        "id: playwright-cli",
        "canonical_name: playwright-cli",
        "files:",
        "  - path: SKILL.md",
        "    sha256: 2f6261712146231bbd1b9ca9063f7dc3f6a5bf9d4b0e02970744dd5927cf829f",
        "    unexpected: value",
        "",
      ].join("\n"),
    );

    const result = await checkVendorSkill({ root, id: "playwright-cli" });

    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain("yaml.unknown_row_field");
  });

  it("rejects absolute manifest file paths", async () => {
    const root = mkdtempSync(join(tmpdir(), "kata-vendor-"));
    const vendorRoot = join(root, ".ai/vendor-skills/playwright-cli");
    mkdirSync(join(vendorRoot, "files"), { recursive: true });
    writeFileSync(
      join(vendorRoot, "manifest.yaml"),
      [
        "id: playwright-cli",
        "canonical_name: playwright-cli",
        "files:",
        "  - path: /tmp/outside.md",
        "    sha256: 0000000000000000000000000000000000000000000000000000000000000000",
        "",
      ].join("\n"),
    );

    const result = await checkVendorSkill({ root, id: "playwright-cli" });

    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual({
      code: "vendor.manifest_path_invalid",
      severity: "error",
      message: "Vendor manifest file path must be relative.",
      path: "/tmp/outside.md",
    });
  });

  it("rejects symlink directory components in manifest paths", async () => {
    const root = mkdtempSync(join(tmpdir(), "kata-vendor-"));
    const outside = mkdtempSync(join(tmpdir(), "kata-vendor-outside-"));
    const vendorRoot = join(root, ".ai/vendor-skills/playwright-cli");
    mkdirSync(join(vendorRoot, "files"), { recursive: true });
    writeFileSync(join(outside, "secret.md"), "secret");
    symlinkSync(outside, join(vendorRoot, "files/link"), "dir");
    writeFileSync(
      join(vendorRoot, "manifest.yaml"),
      [
        "id: playwright-cli",
        "canonical_name: playwright-cli",
        "files:",
        "  - path: link/secret.md",
        "    sha256: 2bb80d537b1da3e38bd30361aa855686bde0ba585b5d6da5a142104ce4dd0813",
        "",
      ].join("\n"),
    );

    const result = await checkVendorSkill({ root, id: "playwright-cli" });

    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual({
      code: "vendor.manifest_path_invalid",
      severity: "error",
      message: "Vendor manifest file path must not contain symlinks.",
      path: ".ai/vendor-skills/playwright-cli/files/link/secret.md",
    });
  });

  it("rejects a symlinked vendor skill root", async () => {
    const root = mkdtempSync(join(tmpdir(), "kata-vendor-"));
    const outside = mkdtempSync(join(tmpdir(), "kata-vendor-outside-"));
    await freezeVendorSkill({
      root: outside,
      id: "playwright-cli",
      sourceDir: join(import.meta.dirname, "fixtures/vendor-playwright-cli"),
    });
    mkdirSync(join(root, ".ai/vendor-skills"), { recursive: true });
    symlinkSync(
      join(outside, ".ai/vendor-skills/playwright-cli"),
      join(root, ".ai/vendor-skills/playwright-cli"),
      "dir",
    );

    const result = await checkVendorSkill({ root, id: "playwright-cli" });

    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual({
      code: "vendor.manifest_path_invalid",
      severity: "error",
      message: "Vendor paths must not contain symlink components.",
      path: ".ai/vendor-skills/playwright-cli",
    });
  });

  it("rejects a symlinked vendor-skills parent during check", async () => {
    const root = mkdtempSync(join(tmpdir(), "kata-vendor-"));
    const outside = mkdtempSync(join(tmpdir(), "kata-vendor-outside-"));
    await freezeVendorSkill({
      root: outside,
      id: "playwright-cli",
      sourceDir: join(import.meta.dirname, "fixtures/vendor-playwright-cli"),
    });
    mkdirSync(join(root, ".ai"), { recursive: true });
    symlinkSync(join(outside, ".ai/vendor-skills"), join(root, ".ai/vendor-skills"), "dir");

    const result = await checkVendorSkill({ root, id: "playwright-cli" });

    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual({
      code: "vendor.manifest_path_invalid",
      severity: "error",
      message: "Vendor paths must not contain symlink components.",
      path: ".ai/vendor-skills",
    });
  });

  it("rejects a symlinked vendor-skills parent during freeze without writing outside root", async () => {
    const root = mkdtempSync(join(tmpdir(), "kata-vendor-"));
    const outside = mkdtempSync(join(tmpdir(), "kata-vendor-outside-"));
    mkdirSync(join(root, ".ai"), { recursive: true });
    symlinkSync(outside, join(root, ".ai/vendor-skills"), "dir");

    const result = await freezeVendorSkill({
      root,
      id: "playwright-cli",
      sourceDir: join(import.meta.dirname, "fixtures/vendor-playwright-cli"),
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual({
      code: "vendor.manifest_path_invalid",
      severity: "error",
      message: "Vendor paths must not contain symlink components.",
      path: ".ai/vendor-skills",
    });
    expect(existsSync(join(outside, "playwright-cli"))).toBe(false);
    expect(existsSync(join(outside, ".playwright-cli.stage"))).toBe(false);
  });

  it("rejects a symlinked vendor files root", async () => {
    const root = mkdtempSync(join(tmpdir(), "kata-vendor-"));
    await freezeVendorSkill({
      root,
      id: "playwright-cli",
      sourceDir: join(import.meta.dirname, "fixtures/vendor-playwright-cli"),
    });
    rmSync(join(root, ".ai/vendor-skills/playwright-cli/files"), { recursive: true, force: true });
    symlinkSync(
      join(import.meta.dirname, "fixtures/vendor-playwright-cli"),
      join(root, ".ai/vendor-skills/playwright-cli/files"),
      "dir",
    );

    const result = await checkVendorSkill({ root, id: "playwright-cli" });

    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual({
      code: "vendor.manifest_path_invalid",
      severity: "error",
      message: "Vendor paths must not contain symlink components.",
      path: ".ai/vendor-skills/playwright-cli/files",
    });
  });

  it("rejects manifests with wrong identity headers", async () => {
    const root = mkdtempSync(join(tmpdir(), "kata-vendor-"));
    const vendorRoot = join(root, ".ai/vendor-skills/playwright-cli");
    mkdirSync(join(vendorRoot, "files"), { recursive: true });
    writeFileSync(join(vendorRoot, "files/SKILL.md"), "skill");
    writeFileSync(
      join(vendorRoot, "manifest.yaml"),
      [
        "id: renamed-playwright",
        "canonical_name: renamed-playwright",
        "files:",
        "  - path: SKILL.md",
        "    sha256: 2f6261712146231bbd1b9ca9063f7dc3f6a5bf9d4b0e02970744dd5927cf829f",
        "",
      ].join("\n"),
    );

    const result = await checkVendorSkill({ root, id: "playwright-cli" });

    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual({
      code: "vendor.manifest_identity_invalid",
      severity: "error",
      message: "Vendor manifest id must be playwright-cli.",
      path: ".ai/vendor-skills/playwright-cli/manifest.yaml",
    });
    expect(result.issues).toContainEqual({
      code: "vendor.manifest_identity_invalid",
      severity: "error",
      message: "Vendor manifest canonical_name must be playwright-cli.",
      path: ".ai/vendor-skills/playwright-cli/manifest.yaml",
    });
  });

  it("rejects empty manifests and manifests missing SKILL.md", async () => {
    const root = mkdtempSync(join(tmpdir(), "kata-vendor-"));
    const vendorRoot = join(root, ".ai/vendor-skills/playwright-cli");
    mkdirSync(join(vendorRoot, "files"), { recursive: true });
    writeFileSync(
      join(vendorRoot, "manifest.yaml"),
      ["id: playwright-cli", "canonical_name: playwright-cli", "files:", ""].join("\n"),
    );

    const empty = await checkVendorSkill({ root, id: "playwright-cli" });
    expect(empty.ok).toBe(false);
    expect(empty.issues).toContainEqual({
      code: "vendor.manifest_shape_invalid",
      severity: "error",
      message: "Vendor manifest must list at least one file.",
      path: ".ai/vendor-skills/playwright-cli/manifest.yaml",
    });
    expect(empty.issues).toContainEqual({
      code: "vendor.manifest_shape_invalid",
      severity: "error",
      message: "Vendor manifest must include SKILL.md.",
      path: ".ai/vendor-skills/playwright-cli/manifest.yaml",
    });
  });

  it("rejects invalid sha values and duplicate manifest paths", async () => {
    const root = mkdtempSync(join(tmpdir(), "kata-vendor-"));
    const vendorRoot = join(root, ".ai/vendor-skills/playwright-cli");
    mkdirSync(join(vendorRoot, "files"), { recursive: true });
    writeFileSync(join(vendorRoot, "files/SKILL.md"), "skill");
    writeFileSync(
      join(vendorRoot, "manifest.yaml"),
      [
        "id: playwright-cli",
        "canonical_name: playwright-cli",
        "files:",
        "  - path: SKILL.md",
        "    sha256: bad",
        "  - path: SKILL.md",
        "    sha256: 2f6261712146231bbd1b9ca9063f7dc3f6a5bf9d4b0e02970744dd5927cf829f",
        "",
      ].join("\n"),
    );

    const result = await checkVendorSkill({ root, id: "playwright-cli" });

    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual({
      code: "vendor.manifest_shape_invalid",
      severity: "error",
      message: "Vendor manifest file sha256 must be a 64-character lowercase hex digest.",
      path: ".ai/vendor-skills/playwright-cli/files/SKILL.md",
    });
    expect(result.issues).toContainEqual({
      code: "vendor.manifest_shape_invalid",
      severity: "error",
      message: "Vendor manifest contains a duplicate file path.",
      path: ".ai/vendor-skills/playwright-cli/files/SKILL.md",
    });
  });

  it("replaces stale files when freezing a source with fewer files", async () => {
    const root = mkdtempSync(join(tmpdir(), "kata-vendor-"));
    const firstSource = join(root, "first-source");
    const secondSource = join(root, "second-source");
    mkdirSync(firstSource, { recursive: true });
    mkdirSync(secondSource, { recursive: true });
    writeFileSync(join(firstSource, "SKILL.md"), "skill");
    writeFileSync(join(firstSource, "stale.md"), "stale");
    writeFileSync(join(secondSource, "SKILL.md"), "skill");

    await freezeVendorSkill({ root, id: "playwright-cli", sourceDir: firstSource });
    const result = await freezeVendorSkill({ root, id: "playwright-cli", sourceDir: secondSource });

    expect(result.ok).toBe(true);
    expect(existsSync(join(root, ".ai/vendor-skills/playwright-cli/files/stale.md"))).toBe(false);
    const manifest = readFileSync(
      join(root, ".ai/vendor-skills/playwright-cli/manifest.yaml"),
      "utf8",
    );
    expect(manifest).not.toContain("stale.md");
  });

  it("rejects source trees missing SKILL.md before writing vendor artifacts", async () => {
    const root = mkdtempSync(join(tmpdir(), "kata-vendor-"));
    const source = join(root, "source-without-skill");
    mkdirSync(source, { recursive: true });
    writeFileSync(join(source, "README.md"), "not a skill");

    const result = await freezeVendorSkill({ root, id: "playwright-cli", sourceDir: source });

    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual({
      code: "vendor.source_shape_invalid",
      severity: "error",
      message: "Vendor source must include SKILL.md.",
      path: join(source, "SKILL.md"),
    });
    expect(existsSync(join(root, ".ai/vendor-skills/playwright-cli/files/README.md"))).toBe(false);
    expect(existsSync(join(root, ".ai/vendor-skills/playwright-cli/manifest.yaml"))).toBe(false);
  });

  it("keeps the prior frozen artifact when a later freeze source contains a symlink", async () => {
    const root = mkdtempSync(join(tmpdir(), "kata-vendor-"));
    const validSource = join(root, "valid-source");
    const invalidSource = join(root, "invalid-source");
    const outside = mkdtempSync(join(tmpdir(), "kata-vendor-outside-"));
    mkdirSync(validSource, { recursive: true });
    mkdirSync(invalidSource, { recursive: true });
    writeFileSync(join(validSource, "SKILL.md"), "valid skill");
    writeFileSync(join(invalidSource, "SKILL.md"), "invalid skill");
    writeFileSync(join(outside, "secret.md"), "secret");
    symlinkSync(outside, join(invalidSource, "link"), "dir");

    const initial = await freezeVendorSkill({ root, id: "playwright-cli", sourceDir: validSource });
    expect(initial.ok).toBe(true);
    const previousSkill = readFileSync(
      join(root, ".ai/vendor-skills/playwright-cli/files/SKILL.md"),
      "utf8",
    );
    const previousManifest = readFileSync(
      join(root, ".ai/vendor-skills/playwright-cli/manifest.yaml"),
      "utf8",
    );

    const result = await freezeVendorSkill({
      root,
      id: "playwright-cli",
      sourceDir: invalidSource,
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual({
      code: "vendor.source_path_invalid",
      severity: "error",
      message: "Vendor source files must not contain symlinks.",
      path: join(invalidSource, "link"),
    });
    expect(
      readFileSync(join(root, ".ai/vendor-skills/playwright-cli/files/SKILL.md"), "utf8"),
    ).toBe(previousSkill);
    expect(readFileSync(join(root, ".ai/vendor-skills/playwright-cli/manifest.yaml"), "utf8")).toBe(
      previousManifest,
    );
    expect(existsSync(join(root, ".ai/vendor-skills/playwright-cli/files/link"))).toBe(false);
  });

  it("rolls back the prior frozen artifact when final replacement fails", async () => {
    const root = mkdtempSync(join(tmpdir(), "kata-vendor-"));
    const firstSource = join(root, "first-source");
    const secondSource = join(root, "second-source");
    mkdirSync(firstSource, { recursive: true });
    mkdirSync(secondSource, { recursive: true });
    writeFileSync(join(firstSource, "SKILL.md"), "first skill");
    writeFileSync(join(secondSource, "SKILL.md"), "second skill");

    const initial = await freezeVendorSkill({ root, id: "playwright-cli", sourceDir: firstSource });
    expect(initial.ok).toBe(true);
    const previousSkill = readFileSync(
      join(root, ".ai/vendor-skills/playwright-cli/files/SKILL.md"),
      "utf8",
    );
    const previousManifest = readFileSync(
      join(root, ".ai/vendor-skills/playwright-cli/manifest.yaml"),
      "utf8",
    );

    const failed = await freezeVendorSkill({
      root,
      id: "playwright-cli",
      sourceDir: secondSource,
      simulateCommitFailureForTest: true,
    } as never);

    expect(failed.ok).toBe(false);
    expect(failed.issues).toContainEqual({
      code: "vendor.freeze_failed",
      severity: "error",
      message: "Vendor freeze failed while replacing the frozen artifact.",
      path: ".ai/vendor-skills/playwright-cli",
    });
    expect(
      readFileSync(join(root, ".ai/vendor-skills/playwright-cli/files/SKILL.md"), "utf8"),
    ).toBe(previousSkill);
    expect(readFileSync(join(root, ".ai/vendor-skills/playwright-cli/manifest.yaml"), "utf8")).toBe(
      previousManifest,
    );
  });

  it("returns a structured issue when the source directory is missing", async () => {
    const root = mkdtempSync(join(tmpdir(), "kata-vendor-"));

    const result = await freezeVendorSkill({
      root,
      id: "playwright-cli",
      sourceDir: join(root, "missing-source"),
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual({
      code: "vendor.source_missing",
      severity: "error",
      message: "Vendor source directory does not exist.",
      path: join(root, "missing-source"),
    });
  });

  it("fails closed when the external skill contract is missing", async () => {
    const sourceRoot = join(import.meta.dirname, "../../..");
    const root = mkdtempSync(join(tmpdir(), "kata-vendor-"));
    cpSync(join(sourceRoot, ".ai/core"), join(root, ".ai/core"), { recursive: true });
    cpSync(join(sourceRoot, ".ai/vendor-skills"), join(root, ".ai/vendor-skills"), {
      recursive: true,
    });
    rmSync(join(root, ".ai/core/external-skills/playwright-cli.yaml"));

    const result = await checkVendorSkill({
      root,
      id: "playwright-cli",
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual({
      code: "vendor.external_contract_missing",
      severity: "error",
      message: "External skill contract for vendor skill is missing.",
      path: ".ai/core/external-skills/playwright-cli.yaml",
    });
  });
});
