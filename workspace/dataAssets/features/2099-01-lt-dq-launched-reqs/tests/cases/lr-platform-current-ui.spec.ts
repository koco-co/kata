// spec: features/2099-01-lt-dq-launched-reqs/results/inventory.json#area=platform
// intent: src.intent.inventory.platform@1
// probe: results/260522-lr-platform-probe-01/playwright/ui-probe/probe.json
// page: _shared/pages/2099-01-lt-dq-launched-reqs/platform/launched-platform-page.ts
// SourceRefs: src.ui.lr-platform.json-config@1, src.ui.lr-platform.report-dimension@1, src.ui.lr-platform.notification-setting@1, src.ui.lr-platform.notification-record@1
import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

import { LaunchedPlatformPage } from "../../../../_shared/pages/2099-01-lt-dq-launched-reqs/platform/launched-platform-page";
import { getEnvConfig } from "../../../../_shared/runtime/env-profile";
import {
  PLATFORM_EXPECTED_IDS,
  PLATFORM_SOURCE_REFS,
  platformSurfaceForCase,
} from "../data/platform/platform-launched-cases";

type InventoryCase = {
  readonly id: string;
  readonly title: string;
  readonly area: string;
  readonly version: string;
  readonly priority: string;
};

type Inventory = {
  readonly cases: readonly InventoryCase[];
};

test.use({ storageState: getEnvConfig().auth.sessionPath });
test.setTimeout(120_000);

const inventory = JSON.parse(
  readFileSync(
    "workspace/dataAssets/features/2099-01-lt-dq-launched-reqs/results/inventory.json",
    "utf8",
  ),
) as Inventory;

const platformCases = inventory.cases.filter((item) => item.area === "platform");
const expectedIds = new Set<string>(PLATFORM_EXPECTED_IDS);
const observedIds = new Set(platformCases.map((item) => item.id));
const missingIds = [...expectedIds].filter((id) => !observedIds.has(id));
const extraIds = [...observedIds].filter((id) => !expectedIds.has(id));

if (platformCases.length !== 65 || missingIds.length > 0 || extraIds.length > 0) {
  throw new Error(
    `${PLATFORM_SOURCE_REFS.inventory}: expected 65 platform inventory cases; count=${platformCases.length}; missing=${missingIds.join(",")}; extra=${extraIds.join(",")}`,
  );
}

test.describe("平台管理 / platform current UI coverage", () => {
  for (const caseItem of platformCases) {
    test(`${caseItem.id} ${caseItem.priority} ${caseItem.title}`, async ({ page }) => {
      const platform = new LaunchedPlatformPage(page);
      const surface = platformSurfaceForCase(caseItem.id);

      if (surface === "jsonConfig") {
        await platform.expectJsonValidationConfig(
          `${caseItem.id}: ${PLATFORM_SOURCE_REFS.inventory} -> ${PLATFORM_SOURCE_REFS.jsonConfig}`,
        );
      } else if (surface === "reportDimensionDoris") {
        await platform.expectReportDimension(
          `${caseItem.id}: ${PLATFORM_SOURCE_REFS.inventory} -> ${PLATFORM_SOURCE_REFS.reportDimension}`,
          "doris",
        );
      } else if (surface === "reportDimensionHive") {
        await platform.expectReportDimension(
          `${caseItem.id}: ${PLATFORM_SOURCE_REFS.inventory} -> ${PLATFORM_SOURCE_REFS.reportDimension}`,
          "hive",
        );
      } else if (surface === "generalConfigMenu") {
        await platform.expectGeneralConfigMenu(
          `${caseItem.id}: ${PLATFORM_SOURCE_REFS.inventory} -> ${PLATFORM_SOURCE_REFS.reportDimension}`,
        );
      } else {
        await platform.expectNotificationCenter(
          `${caseItem.id}: ${PLATFORM_SOURCE_REFS.inventory} -> ${PLATFORM_SOURCE_REFS.notificationSetting} / ${PLATFORM_SOURCE_REFS.notificationRecord}`,
        );
      }

      expect(caseItem.version, `${caseItem.id}: inventory version should be traceable`).toMatch(
        /^v6\.4\.(3|10)$/,
      );
      expect(caseItem.title.trim().length, `${caseItem.id}: inventory title should remain traceable`).toBeGreaterThan(
        0,
      );
    });
  }
});
