/**
 * engine public API surface.
 *
 * RULES:
 * - This file is the ONLY public entry point. External callers
 *   (CLI, future desktop app, MCP server) MUST import from "kata-engine"
 *   top level — never reach into kata-engine/src/domain/...
 * - Functions here must be backward-compatible (additions OK; removals
 *   or signature changes require major version bump).
 * - This file MUST stay <= 200 lines (re-exports + facade only;
 *   actual implementation lives in src/domain/).
 */

// ── Path resolution ─────────────────────────────────
export {
  listProjects,
  projectDir,
  repoRoot,
  workspaceDir,
} from "@shared/lib/paths.ts";

// ── Feature catalog (read) ──────────────────────────
export type { FeatureRow, FeaturesLsContext } from "./cli/features-ls.ts";
export { runFeaturesLs } from "./cli/features-ls.ts";
export type { FeaturesShowContext } from "./cli/features-show.ts";
export { runFeaturesShow } from "./cli/features-show.ts";

// ── Project metadata ───────────────────────────────

export const KATA_ENGINE_VERSION = "3.0.0-alpha.1" as const;
