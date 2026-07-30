// suite-case-helpers.ts — 「有效性-json value格式校验」套件 describe 参数化
//
// 与 v6.4.7 有效性多规则 feature 中手写的
//   for (const datasource of ACTIVE_DATASOURCES) { test.describe(...beforeEach(setCurrentDatasource)...) }
// 模式等价，封装为单个 helper：按激活数据源逐个声明 describe 分组，
// 每个分组在 beforeAll/beforeEach 中切换当前数据源，并在 beforeEach 中执行套件前置条件（带缓存，二次执行为空操作）。

import { test } from "../../fixtures/step-screenshot";
import { loadPlaywrightAutomationConfig } from "../../../../../lib/automation/playwright-config";
import {
  ACTIVE_DATASOURCES,
  clearCurrentDatasource,
  runSuitePreconditions,
  setCurrentDatasource,
  SUITE_NAME,
} from "../../../features/v6.4.10/【岚图汽车】【数据质量】有效性JSONValue格式校验/automation/tests/fixtures/test-data";

/**
 * 按数据源参数化 describe 分组。
 * @param pageName 页面名（如「规则集管理」「校验结果查询」「数据质量报告」「规则库配置」）
 * @param fn 分组内用例声明回调
 */
export function describeByDatasource(pageName: string, fn: () => void): void {
  for (const datasource of ACTIVE_DATASOURCES) {
    test.describe(`${SUITE_NAME} - ${pageName} - ${datasource.reportName}`, () => {
      test.beforeAll(() => {
        setCurrentDatasource(datasource);
      });

      test.beforeEach(async ({ page }) => {
        setCurrentDatasource(datasource);
        // 与 v6.4.7 前置条件约定一致：只读/跳过模式下不执行建表前置。
        if (loadPlaywrightAutomationConfig().skipPreconditionSetup) {
          return;
        }
        await runSuitePreconditions(page, datasource);
      });

      test.afterAll(() => {
        clearCurrentDatasource();
      });

      fn();
    });
  }
}
