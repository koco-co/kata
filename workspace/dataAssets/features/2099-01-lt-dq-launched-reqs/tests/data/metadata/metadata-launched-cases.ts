import type { MetadataCaseSurface } from "../../../../../_shared/pages/2099-01-lt-dq-launched-reqs/metadata/metadata-page";
import type { PlatformSurface } from "../platform/platform-launched-cases";
import type { QualityCaseSurface } from "../../../../../_shared/pages/2099-01-lt-dq-launched-reqs/quality/quality-page";

export const METADATA_SOURCE_REFS = {
  inventory: "src.intent.inventory.metadata@1",
  metadataCenterProbe: "src.ui.metadata.retry2-metadata-center@1",
  metadataManageProbe: "src.ui.metadata.retry2-menu-元数据管理@1",
  metadataSyncProbe: "src.ui.metadata.retry2-menu-元数据同步@1",
  metaModelManageProbe: "src.ui.metadata.retry2-menu-元模型管理@1",
  subscriptionProbe: "src.ui.metadata.retry2-menu-订阅的数据@1",
  qualityProbe:
    "src.ui.quality.route.rule@2, src.ui.quality.route.taskQuery@2, src.ui.quality.route.qualityReport@2",
  platformProbe: "src.ui.lr-platform.report-dimension@1",
} as const;

export const METADATA_EXPECTED_IDS = [
  ...Array.from({ length: 8 }, (_, index) => `LR-${String(15 + index).padStart(4, "0")}`),
  "LR-0025",
  "LR-0026",
  ...Array.from({ length: 27 }, (_, index) => `LR-${String(375 + index).padStart(4, "0")}`),
  "LR-0806",
  "LR-0807",
  "LR-0808",
] as const;

export type MetadataCoverageKind = "metadata" | "quality" | "platform";

export type MetadataCoverageSurface =
  | { readonly kind: "metadata"; readonly surface: MetadataCaseSurface; readonly probe: string }
  | { readonly kind: "quality"; readonly surface: QualityCaseSurface; readonly probe: string }
  | { readonly kind: "platform"; readonly surface: PlatformSurface; readonly probe: string };

export function metadataCoverageForCase(id: string): MetadataCoverageSurface {
  const numericId = Number(id.slice(3));

  if ((numericId >= 15 && numericId <= 22) || numericId === 25 || numericId === 26) {
    return { kind: "metadata", surface: "dataMap", probe: METADATA_SOURCE_REFS.metadataCenterProbe };
  }
  if (numericId >= 375 && numericId <= 393) {
    if (numericId === 375 || numericId === 380) {
      return { kind: "quality", surface: "taskQuery", probe: METADATA_SOURCE_REFS.qualityProbe };
    }
    if (numericId >= 376 && numericId <= 379) {
      return { kind: "quality", surface: "qualityReport", probe: METADATA_SOURCE_REFS.qualityProbe };
    }
    if (numericId >= 381 && numericId <= 392) {
      return { kind: "quality", surface: "rule", probe: METADATA_SOURCE_REFS.qualityProbe };
    }
    return { kind: "platform", surface: "generalConfigMenu", probe: METADATA_SOURCE_REFS.platformProbe };
  }
  if (numericId === 394 || numericId === 395 || numericId === 396 || numericId === 397 || numericId === 401) {
    return { kind: "metadata", surface: "metadataManage", probe: METADATA_SOURCE_REFS.metadataManageProbe };
  }
  if (numericId === 398) {
    return { kind: "metadata", surface: "metaModelManage", probe: METADATA_SOURCE_REFS.metaModelManageProbe };
  }
  if (numericId === 399 || numericId === 400) {
    return { kind: "metadata", surface: "metadataSync", probe: METADATA_SOURCE_REFS.metadataSyncProbe };
  }
  if (numericId >= 806 && numericId <= 808) {
    return { kind: "quality", surface: "rule", probe: METADATA_SOURCE_REFS.qualityProbe };
  }

  throw new Error(`${id}: no metadata coverage surface mapping`);
}
