// spec: features/2099-01-lt-dq-launched-reqs/results/inventory.json#area=standard
// intent: SR-INTENT-LT-DQ-LAUNCHED-REQS-STANDARD
// probe: SR-UI-PROBE-20260522-LR-STANDARD-001
// page: _shared/pages/2099-01-lt-dq-launched-reqs/standard/standard-page.ts
// generated_at: 2026-05-22T12:24:00.000Z
// probe_evidence: src.ui.standard.route.data-standard@1, src.ui.standard.route.standard-mapping@1, src.ui.standard.route.standard-check@1
// SourceRefs: SR-INTENT-LT-DQ-LAUNCHED-REQS-STANDARD, SR-UI-PROBE-20260522-LR-STANDARD-001, src.intent.inventory.standard@1, src.ui.standard.route.data-standard@1, src.ui.standard.route.standard-mapping@1, src.ui.standard.route.standard-check@1
import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

import {
  StandardPage,
  type StandardCaseSurface,
} from "../../../../_shared/pages/2099-01-lt-dq-launched-reqs/standard/standard-page";

type InventoryCase = {
  readonly id: string;
  readonly source_ref: string;
  readonly title: string;
  readonly area: string;
  readonly version: string;
  readonly priority: string;
};

type Inventory = {
  readonly cases: readonly InventoryCase[];
};

const inventory = JSON.parse(
  readFileSync(
    "workspace/dataAssets/features/2099-01-lt-dq-launched-reqs/results/inventory.json",
    "utf8",
  ),
) as Inventory;

const standardCases = inventory.cases.filter((item) => item.area === "standard");
const expectedIds = new Set(Array.from({ length: 76 }, (_, index) => `LR-${String(855 + index).padStart(4, "0")}`));
const observedIds = new Set(standardCases.map((item) => item.id));
const missingIds = [...expectedIds].filter((id) => !observedIds.has(id));
const extraIds = [...observedIds].filter((id) => !expectedIds.has(id));

if (standardCases.length !== 76 || missingIds.length > 0 || extraIds.length > 0) {
  throw new Error(
    `src.intent.inventory.standard@1: expected LR-0855..LR-0930 standard inventory; count=${standardCases.length}; missing=${missingIds.join(",")}; extra=${extraIds.join(",")}`,
  );
}

function surfaceForCase(id: string): StandardCaseSurface {
  const numericId = Number(id.slice(3));
  if (numericId >= 855 && numericId <= 882) return "check";
  if (numericId >= 883 && numericId <= 892) return "mapping";
  return "definition";
}

test.describe("数据标准 / standard current UI coverage", () => {
  for (const caseItem of standardCases) {
    const surface = surfaceForCase(caseItem.id);

    test(`${caseItem.id} ${caseItem.priority} ${caseItem.title}`, async ({ page }) => {
      const standard = new StandardPage(page);
      await standard.expectCaseSurface(
        surface,
        `${caseItem.id}: ${caseItem.source_ref} -> src.intent.inventory.standard@1 -> src.ui.standard.route.${surface === "definition" ? "data-standard" : surface === "mapping" ? "standard-mapping" : "standard-check"}@1`,
      );

      expect(caseItem.source_ref, `${caseItem.id}: source ref should be retained`).toMatch(
        /^src\.case\.archive\.\d{4}@1$/,
      );
      expect(caseItem.version, `${caseItem.id}: inventory version should be present`).toMatch(/^v6\.4\.6$/);
      expect(caseItem.title, `${caseItem.id}: inventory title should remain traceable`).toContain("数据标准");
    });
  }
});
