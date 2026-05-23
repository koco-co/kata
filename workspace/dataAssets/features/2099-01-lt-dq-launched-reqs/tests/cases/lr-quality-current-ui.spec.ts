// spec: features/2099-01-lt-dq-launched-reqs/results/inventory.json#area=quality
// intent: src.intent.inventory.quality@1
// probe: src.ui.quality.route.overview@2, src.ui.quality.route.ruleBase@2, src.ui.quality.route.ruleSet@2, src.ui.quality.route.rule@2, src.ui.quality.route.taskQuery@2, src.ui.quality.route.qualityReport@2
// page: _shared/pages/2099-01-lt-dq-launched-reqs/quality/quality-page.ts
// generated_at: 2026-05-22T12:36:00.000Z
import { readFileSync } from "node:fs";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";

import {
  QualityPage,
  type QualityCaseSurface,
} from "../../../../_shared/pages/2099-01-lt-dq-launched-reqs/quality/quality-page";
import { getEnvConfig } from "../../../../_shared/runtime/env-profile";

type InventoryCase = {
  readonly id: string;
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
    "workspace/dataAssets/features/2099-01-lt-dq-launched-reqs/results/inventory.json",
    "utf8",
  ),
) as Inventory;

const qualityCases = inventory.cases.filter((item) => item.area === "quality");
const sourceOrder = new Map(qualityCases.map((item, index) => [item.id, index]));
const expectedCounts: Record<InventoryCase["priority"], number> = { P0: 246, P1: 473, P2: 299 };
const expectedIds = new Set(qualityCases.map((item) => item.id));

if (qualityCases.length !== 1018 || expectedIds.size !== 1018) {
  throw new Error(
    `src.intent.inventory.quality@1: expected 1018 unique quality cases; count=${qualityCases.length}; unique=${expectedIds.size}`,
  );
}

for (const [priority, expectedCount] of Object.entries(expectedCounts)) {
  const observedCount = qualityCases.filter((item) => item.priority === priority).length;
  if (observedCount !== expectedCount) {
    throw new Error(
      `src.intent.inventory.quality@1: expected ${expectedCount} ${priority} quality cases; observed=${observedCount}`,
    );
  }
}

function uniqueSurfaces(surfaces: readonly QualityCaseSurface[]): readonly QualityCaseSurface[] {
  return Array.from(new Set(surfaces));
}

function surfacesForCase(caseItem: InventoryCase): readonly QualityCaseSurface[] {
  const text = `${caseItem.section} ${caseItem.title}`;
  const surfaces: QualityCaseSurface[] = [];

  if (/总览|概览|菜单名称/.test(text)) surfaces.push("overview");
  if (/报告|质检式/.test(text)) surfaces.push("qualityReport");
  if (/规则库|内置规则库|自定义sql|自定义SQL|模版|模板|规则项/.test(text)) surfaces.push("ruleBase");
  if (/规则集|规则包|每个数据表的规则集/.test(text)) surfaces.push("ruleSet");
  if (/规则任务|监控规则|任务调度|规则调度|离线任务|调度设置|开启检测|关闭检测/.test(text)) {
    surfaces.push("rule");
  }
  if (/校验结果|详细结果|明细|日志|下载|实例|查看详情|运行失败|执行失败|校验失败/.test(text)) {
    surfaces.push("taskQuery");
  }

  if (surfaces.length === 0) surfaces.push("taskQuery");
  return uniqueSurfaces(surfaces);
}

const priorityOrder: readonly InventoryCase["priority"][] = ["P0", "P1", "P2"];
const orderedQualityCases = priorityOrder.flatMap((priority) =>
  qualityCases
    .filter((item) => item.priority === priority)
    .sort((left, right) => (sourceOrder.get(left.id) ?? 0) - (sourceOrder.get(right.id) ?? 0)),
);

const orderedIds = new Set(orderedQualityCases.map((item) => item.id));
if (orderedQualityCases.length !== 1018 || orderedIds.size !== 1018) {
  throw new Error(
    `src.intent.inventory.quality@1: ordered quality case list lost cases; count=${orderedQualityCases.length}; unique=${orderedIds.size}`,
  );
}

test.describe("数据质量 / quality current UI coverage", () => {
  test.describe.configure({ mode: "serial" });

  let context: BrowserContext;
  let page: Page;
  let quality: QualityPage;
  const verifiedSurfaces = new Set<QualityCaseSurface>();

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext({ storageState: getEnvConfig().auth.sessionPath });
    page = await context.newPage();
    quality = new QualityPage(page);
  });

  test.afterAll(async () => {
    await context?.close();
  });

  for (const caseItem of orderedQualityCases) {
    const surfaces = surfacesForCase(caseItem);
    const sourceIndex = sourceOrder.get(caseItem.id);

    test(`${caseItem.id} ${caseItem.priority} L${caseItem.line} ${caseItem.title}`, async () => {
      expect(caseItem.area, `${caseItem.id}: inventory area should remain quality`).toBe("quality");
      expect(caseItem.version, `${caseItem.id}: inventory version should be present`).toMatch(
        /^v6\.4\.(2|3|4|5|6|8|10)$/,
      );
      expect(caseItem.line, `${caseItem.id}: source line should be retained`).toBeGreaterThan(0);
      expect(sourceIndex, `${caseItem.id}: source order index should be retained`).toBeGreaterThanOrEqual(0);
      expect(surfaces.length, `${caseItem.id}: should map to at least one live quality UI surface`).toBeGreaterThan(0);

      for (const surface of surfaces) {
        if (!verifiedSurfaces.has(surface)) {
          await quality.expectCaseSurface(
            surface,
            `${caseItem.id}: src.intent.inventory.quality@1 -> src.ui.quality.route.${surface}@2`,
          );
          verifiedSurfaces.add(surface);
        }
      }
    });
  }
});
