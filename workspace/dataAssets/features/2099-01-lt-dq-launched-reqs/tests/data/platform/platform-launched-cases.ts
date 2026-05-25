export const PLATFORM_SOURCE_REFS = {
  inventory: "src.intent.inventory.platform@1",
  shellProbe: "src.ui.dataAssets.shell@1",
  platformRoot: "src.ui.lr-platform.platform-root@1",
  dataSourceAutoImport: "src.ui.lr-platform.data-source-auto-import@1",
  notificationSetting: "src.ui.lr-platform.notification-setting@1",
  notificationRecord: "src.ui.lr-platform.notification-record@1",
  jsonConfig: "src.ui.lr-platform.json-config@1",
  reportDimension: "src.ui.lr-platform.report-dimension@1",
} as const;

export type PlatformSurface =
  | "jsonConfig"
  | "reportDimensionHive"
  | "reportDimensionDoris"
  | "generalConfigMenu"
  | "notification";

export function platformSurfaceForCase(id: string): PlatformSurface {
  const numericId = Number(id.slice(3));
  if (numericId >= 27 && numericId <= 67) return "jsonConfig";
  if (numericId >= 418 && numericId <= 426) return "reportDimensionDoris";
  if (numericId >= 427 && numericId <= 435) return "reportDimensionHive";
  if (numericId === 417 || numericId === 436 || numericId === 437) return "generalConfigMenu";
  if (numericId >= 453 && numericId <= 455) return "notification";
  throw new Error(`${id}: no platform surface mapping`);
}

export const PLATFORM_EXPECTED_IDS = [
  ...Array.from({ length: 41 }, (_, index) => `LR-${String(27 + index).padStart(4, "0")}`),
  ...Array.from({ length: 21 }, (_, index) => `LR-${String(417 + index).padStart(4, "0")}`),
  ...Array.from({ length: 3 }, (_, index) => `LR-${String(453 + index).padStart(4, "0")}`),
] as const;
