// spec: features/2099-01-lt-dq-launched-reqs/results/inventory.json#area=metadata
// intent: SR-INTENT-LT-DQ-LAUNCHED-REQS-METADATA
// probe: SR-UI-PROBE-20260522-LR-METADATA-001
// page: _shared/pages/2099-01-lt-dq-launched-reqs/metadata/metadata-page.ts
// page: _shared/pages/2099-01-lt-dq-launched-reqs/quality/quality-page.ts
// page: _shared/pages/2099-01-lt-dq-launched-reqs/platform/launched-platform-page.ts
// generated_at: 2026-05-23T00:00:00.000Z
// probe_evidence: results/260522-lr-metadata-probe-01/playwright/ui-probe/probe-retry-2.json
// SourceRefs: SR-INTENT-LT-DQ-LAUNCHED-REQS-METADATA, SR-UI-PROBE-20260522-LR-METADATA-001, src.intent.inventory.metadata@1, results/260522-lr-metadata-probe-01/playwright/ui-probe/probe-retry-2.json
import { readFileSync } from "node:fs";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";

import { MetadataPage } from "../../../../_shared/pages/2099-01-lt-dq-launched-reqs/metadata/metadata-page";
import { LaunchedPlatformPage } from "../../../../_shared/pages/2099-01-lt-dq-launched-reqs/platform/launched-platform-page";
import { QualityPage } from "../../../../_shared/pages/2099-01-lt-dq-launched-reqs/quality/quality-page";
import { getEnvConfig } from "../../../../_shared/runtime/env-profile";
import {
  METADATA_EXPECTED_IDS,
  METADATA_SOURCE_REFS,
  metadataCoverageForCase,
  type MetadataCoverageSurface,
} from "../data/metadata/metadata-launched-cases";

type InventoryCase = {
  readonly id: string;
  readonly source_ref: string;
  readonly title: string;
  readonly area: string;
  readonly version: string;
  readonly priority: "P0" | "P1" | "P2";
  readonly line: number;
  readonly section: string;
};

type Inventory = {
  readonly cases: readonly InventoryCase[];
};

const inventory = JSON.parse(
  readFileSync(
    "workspace/dataAssets/features/【v6410】【岚图汽车】【数据质量】已上线需求主流程用例/results/inventory.json",
    "utf8",
  ),
) as Inventory;

const metadataCases = inventory.cases.filter((item) => item.area === "metadata");
const expectedIds = new Set<string>(METADATA_EXPECTED_IDS);
const observedIds = new Set(metadataCases.map((item) => item.id));
const missingIds = [...expectedIds].filter((id) => !observedIds.has(id));
const extraIds = [...observedIds].filter((id) => !expectedIds.has(id));

if (metadataCases.length !== 40 || missingIds.length > 0 || extraIds.length > 0) {
  throw new Error(
    `${METADATA_SOURCE_REFS.inventory}: expected 40 metadata inventory cases; count=${metadataCases.length}; missing=${missingIds.join(",")}; extra=${extraIds.join(",")}`,
  );
}

const sourceOrder = new Map(metadataCases.map((item, index) => [item.id, index]));
const orderedMetadataCases = [...metadataCases].sort(
  (left, right) => (sourceOrder.get(left.id) ?? 0) - (sourceOrder.get(right.id) ?? 0),
);

function coverageKey(coverage: MetadataCoverageSurface): string {
  return `${coverage.kind}:${coverage.surface}`;
}

test.describe("元数据 / metadata current UI coverage", () => {
  test.describe.configure({ mode: "serial" });

  let context: BrowserContext;
  let page: Page;
  let metadata: MetadataPage;
  let platform: LaunchedPlatformPage;
  let quality: QualityPage;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext({ storageState: getEnvConfig().auth.sessionPath });
    page = await context.newPage();
    metadata = new MetadataPage(page);
    platform = new LaunchedPlatformPage(page);
    quality = new QualityPage(page);
  });

  test.afterAll(async () => {
    await context?.close();
  });

  for (const caseItem of orderedMetadataCases) {
    const coverage = metadataCoverageForCase(caseItem.id);
    const sourceIndex = sourceOrder.get(caseItem.id);

    test(`${caseItem.id} ${caseItem.priority} L${caseItem.line} ${caseItem.title}`, async () => {
      expect(caseItem.area, `${caseItem.id}: inventory area should remain metadata`).toBe("metadata");
      expect(caseItem.version, `${caseItem.id}: inventory version should be traceable`).toMatch(/^v6\.4\.(3|5|10)$/);
      expect(caseItem.line, `${caseItem.id}: source line should be retained`).toBeGreaterThan(0);
      expect(caseItem.source_ref, `${caseItem.id}: source ref should be retained`).toMatch(
        /^src\.case\.archive\.\d{4}@1$/,
      );
      expect(sourceIndex, `${caseItem.id}: source order index should be retained`).toBeGreaterThanOrEqual(0);

      const key = coverageKey(coverage);
      const sourceRef = `${caseItem.id}: ${caseItem.source_ref} -> ${METADATA_SOURCE_REFS.inventory} -> ${coverage.probe} -> ${key}`;
      if (coverage.kind === "metadata") {
        await metadata.expectCaseSurface(coverage.surface, sourceRef);
      } else if (coverage.kind === "quality") {
        await quality.expectCaseSurface(coverage.surface, sourceRef);
      } else if (coverage.surface === "generalConfigMenu") {
        await platform.expectGeneralConfigMenu(sourceRef);
      } else {
        throw new Error(`${caseItem.id}: unsupported platform surface ${coverage.surface}`);
      }
    });
  }
});
