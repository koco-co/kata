import type { FeatureRef } from "./types.ts";

export interface FeatureBrowseMenus {
  pickProject(): Promise<string | undefined>;
  pickVersion(project: string): Promise<string | undefined>;
  pickFeature(project: string, version: string): Promise<FeatureRef | undefined>;
  openFeature(feature: FeatureRef): Promise<void>;
}

/**
 * Browse project -> version -> feature and keep the parent level open after
 * returning from the feature action menu.
 */
export async function browseProjectFeature(menus: FeatureBrowseMenus): Promise<void> {
  for (;;) {
    const project = await menus.pickProject();
    if (!project) return;
    for (;;) {
      const version = await menus.pickVersion(project);
      if (!version) break;
      for (;;) {
        const ref = await menus.pickFeature(project, version);
        if (!ref) break;
        await menus.openFeature(ref);
      }
    }
  }
}
