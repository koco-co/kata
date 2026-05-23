import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildFeatureId,
  deriveSlugFromSource,
  hexFallbackSlug,
  isValidSlug,
  type SlugSource,
  sanitizeSlug,
} from "../features/slug.ts";

export interface FeaturesResolveContext {
  project: string;
  module: string;
  workspaceRoot: string;
  slug?: string;
  source?: SlugSource;
  /** Stable identity of where the slug came from, used for idempotency/collision. */
  slugSourceKey?: string;
  /** Seed for hex fallback (e.g. raw Chinese title); defaults to JSON of source. */
  seed?: string;
  now?: Date;
}

export interface FeaturesResolveResult {
  featureId: string;
  featureDir: string;
  reused: boolean;
}

function yyyyMm(now: Date): string {
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

function chooseSlug(ctx: FeaturesResolveContext): string {
  if (ctx.slug) {
    const s = isValidSlug(ctx.slug) ? ctx.slug : sanitizeSlug(ctx.slug);
    if (!isValidSlug(s)) throw new Error(`invalid slug: ${ctx.slug}`);
    return s;
  }
  if (ctx.source) {
    const derived = deriveSlugFromSource(ctx.source);
    if (derived) return derived;
  }
  return hexFallbackSlug(ctx.module, ctx.seed ?? JSON.stringify(ctx.source ?? {}));
}

function recordedSlugSource(dir: string): string | undefined {
  const snapPath = join(dir, "source-snapshot.json");
  if (!existsSync(snapPath)) return undefined;
  try {
    return JSON.parse(readFileSync(snapPath, "utf-8"))?.slug_source;
  } catch {
    return undefined;
  }
}

export function runFeaturesResolve(ctx: FeaturesResolveContext): FeaturesResolveResult {
  const now = ctx.now ?? new Date();
  const baseSlug = chooseSlug(ctx);
  const sourceKey = ctx.slugSourceKey ?? ctx.slug ?? JSON.stringify(ctx.source ?? {});
  const featuresDir = join(ctx.workspaceRoot, ctx.project, "features");
  const month = yyyyMm(now);

  for (let n = 0; ; n++) {
    const slug = n === 0 ? baseSlug : `${baseSlug}-${n + 1}`;
    const featureId = buildFeatureId(month, slug);
    const featureDir = join(featuresDir, featureId);
    if (!existsSync(featureDir)) {
      mkdirSync(featureDir, { recursive: true });
      return { featureId, featureDir, reused: false };
    }
    const recorded = recordedSlugSource(featureDir);
    if (recorded === undefined || recorded === sourceKey) {
      return { featureId, featureDir, reused: true };
    }
  }
}
