// 岚图已上线需求用例：inventory 一致性校验工具。
// 现阶段交付只保证各 area 切片与 results/inventory.json 自洽（计数/优先级/ID/可追溯字段）；
// 真实 UI 自动化（page-object 流程）留作带环境的 playwright-automation 单独任务，不在本层。

import { readFileSync } from "node:fs";

export const INVENTORY_PATH =
  "workspace/dataAssets/features/v7.0.0/【岚图汽车】【数据质量】已上线需求用例/results/inventory.json";

export type InventoryCase = {
  readonly id: string;
  readonly source_ref: string;
  readonly title: string;
  readonly area: string;
  readonly version: string;
  readonly priority: string;
  readonly line: number;
  readonly section: string;
};

export type Inventory = {
  readonly cases: readonly InventoryCase[];
};

export type AreaExpectation = {
  readonly area: string;
  readonly total: number;
  readonly priority: Readonly<Record<string, number>>;
  readonly versionPattern: RegExp;
};

export function loadInventory(path: string = INVENTORY_PATH): Inventory {
  return JSON.parse(readFileSync(path, "utf8")) as Inventory;
}

// 校验某 area 切片：计数、优先级分布、ID 唯一与格式、source_ref/version/line/title 可追溯。
// 任一不符即 throw，作为 runner 收集期与 playwright 运行期的硬闸门；返回该 area 用例供调用方复用。
export function assertAreaConsistency(
  expectation: AreaExpectation,
  inventory: Inventory = loadInventory(),
): readonly InventoryCase[] {
  const cases = inventory.cases.filter((item) => item.area === expectation.area);
  const fail = (message: string): never => {
    throw new Error(`inventory-consistency[${expectation.area}]: ${message}`);
  };

  if (cases.length !== expectation.total) {
    fail(`area case count ${cases.length} != expected ${expectation.total}`);
  }

  const ids = new Set(cases.map((item) => item.id));
  if (ids.size !== expectation.total) {
    fail(`duplicate ids in area; unique=${ids.size} total=${cases.length}`);
  }

  for (const [priority, expected] of Object.entries(expectation.priority)) {
    const observed = cases.filter((item) => item.priority === priority).length;
    if (observed !== expected) {
      fail(`priority ${priority} count ${observed} != expected ${expected}`);
    }
  }

  for (const item of cases) {
    if (!/^LR-\d{4}$/.test(item.id)) fail(`malformed id ${item.id}`);
    if (!/^src\.case\.archive\.\d{4}@1$/.test(item.source_ref)) {
      fail(`malformed source_ref ${item.source_ref} (${item.id})`);
    }
    if (item.area !== expectation.area) fail(`area drift ${item.id} -> ${item.area}`);
    if (!expectation.versionPattern.test(item.version)) {
      fail(`unexpected version ${item.version} (${item.id})`);
    }
    if (!(item.line > 0)) fail(`non-positive source line (${item.id})`);
    if (item.title.trim().length === 0) fail(`empty title (${item.id})`);
  }

  return cases;
}
