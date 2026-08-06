export interface FeatureRef {
  project: string;
  relativePath: string;
  featureDir: string;
  featureKey: string;
  title: string;
  version: string;
  module: string;
  requirementId?: string;
  customer?: string;
}
