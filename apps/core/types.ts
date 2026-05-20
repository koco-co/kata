/**
 * Shared types for the kata platform read layer.
 * Re-exports the engine FeatureRow so every transport imports one source.
 */
export type { FeatureRow } from "kata-engine";

export interface ProjectSummary {
  readonly name: string;
  readonly featureCount: number;
}

export interface ArtifactInfo {
  readonly name: string;
  readonly bytes: number;
}

export interface XmindNode {
  readonly title: string;
  readonly markers: readonly string[];
  readonly note: string | null;
  readonly children: readonly XmindNode[];
}

export interface XmindSheet {
  readonly title: string;
  readonly root: XmindNode;
}

export interface SkillSummary {
  readonly id: string;
  readonly name: string;
  readonly kind: string | null;
  readonly status: string | null;
  readonly summary: string | null;
  readonly mustTriggerWhen: readonly string[];
  readonly mustNotTriggerWhen: readonly string[];
  readonly inputs: readonly string[];
  readonly outputs: readonly string[];
}

export interface FeatureDetail {
  readonly metadata: unknown;
  readonly manifest: unknown;
  readonly recentRuns: readonly string[];
  readonly artifacts: readonly ArtifactInfo[];
}
