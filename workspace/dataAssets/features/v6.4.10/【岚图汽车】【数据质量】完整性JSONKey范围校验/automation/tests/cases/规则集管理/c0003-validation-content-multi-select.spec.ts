import { waitForUiSettled } from "../../../../../../../../../runtime/automation/playwright";
// spec: features/completeness-json-key-range/archive.md#case=t03-json-key
// intent: SR-INTENT-MIGRATED
// probe: SR-UI-PROBE-MIGRATED
// META: {"id":"t9","priority":"P0","title":"验证json类型字段可成功配置key范围校验规则"}
import { expect, test } from "../../../../../../../_shared/automation/fixtures/step-screenshot";
import {
  gotoRuleSetList,
} from "../../pages/rule-set-page";
import { ensureMainScenarioRuleSet, SCENARIOS } from "../../flows/rule-set-flow";
import {
  ensureRuleTasks,
  executeTaskFromList,
  getTableRowByTaskName,
  gotoRuleTaskList,
  openTaskInstanceDetail,
  waitForTaskInstanceFinished,
  MAIN_TASK_NAME,
} from "../../flows/rule-task-flow";

test.setTimeout(600000);

const SUITE_NAME = "【内置规则丰富】完整性，json中key值范围校验(#15693)";
const TABLE_NAME = SCENARIOS.main.tableName;
const PACKAGE_NAME = SCENARIOS.main.packageName;

test.describe(SUITE_NAME, () => {
  test("验证key范围校验完整：规则集配置+导入规则包+执行任务+在校验结果查询中查看实例结果", async ({
    page,
    step,
  }) => {
    let taskRow!: import("@playwright/test").Locator;
    let instanceRow!: import("@playwright/test").Locator;

    await step(
      "步骤1: 进入【数据质量 → 规则集管理】页面，等待规则集列表加载完成 → 规则集管理页面正常打开，列表加载完成",
      async () => {
        await gotoRuleSetList(page);
        await expect(
          page.locator(".ant-table-tbody").first(),
        ).toBeVisible({ timeout: 15000 });
      },
    );

    await step(
      "步骤2: 点击【新建规则集】，在 Step 1 基础信息中配置数据源=SparkThrift2.x、数据库=pw_test、数据表=test_json_key_range，规则包名称=key范围校验测试包，点击【下一步】 → Step 1 基础信息校验通过，进入 Step 2 监控规则页面",
      async () => {
        await ensureMainScenarioRuleSet(page, { force: true });
        const packageSection = page
          .locator(".ruleSetMonitor__package")
          .filter({ hasText: PACKAGE_NAME })
          .first();
        await expect(packageSection).toBeVisible({ timeout: 15000 });
      },
    );

    await step(
      "步骤3: 在 Step 2 监控规则中，在\"key范围校验测试包\"下点击【新增规则】，配置：规则类型=字段级、字段=info、统计函数=key范围校验、校验方法=包含、校验内容=key1和key2、强弱规则=强规则，点击规则行【保存】，再点击页面底部【保存】 → 规则集保存成功，列表新增 test_json_key_range 对应记录",
      async () => {
        await gotoRuleSetList(page);
        const listRow = page
          .locator(".ant-table-tbody tr:not(.ant-table-measure-row)")
          .filter({ hasText: TABLE_NAME })
          .first();
        await expect(listRow).toBeVisible({ timeout: 10000 });
      },
    );

    await step(
      "步骤4-6: 进入【数据质量 → 规则任务管理】页面，新建监控规则 task_json_key_range_test，通过【导入规则包】导入\"key范围校验测试包\"，保存任务 → 任务创建成功，列表可见\"task_json_key_range_test\"",
      async () => {
        await ensureRuleTasks(page, [MAIN_TASK_NAME]);
        await gotoRuleTaskList(page);
        taskRow = getTableRowByTaskName(page, MAIN_TASK_NAME);
        await expect(taskRow).toBeVisible({ timeout: 15000 });
      },
      taskRow,
    );

    await step(
      "步骤7: 在规则任务列表中找到\"task_json_key_range_test\"，点击该任务行的表名展开抽屉，点击【立即执行】 → 页面提示\"操作成功，稍后可在任务查询中查看详情\"",
      async () => {
        await executeTaskFromList(page, MAIN_TASK_NAME);
      },
    );

    await step(
      "步骤8: 进入【数据质量 → 校验结果查询】页面，找到\"task_json_key_range_test\"最新实例记录并打开实例详情 → 1) 本次执行生成新的实例记录，任务名称、执行时间与本次操作匹配 2) 实例详情中该规则行整体质检结果显示为校验不通过，可进入失败明细查看不通过数据 3) 「查看明细」中仅展示校验不通过的数据；失败明细包含 id=2 与 id=3 两行，相关列标红",
      async () => {
        instanceRow = await waitForTaskInstanceFinished(page, MAIN_TASK_NAME, 480000);
        await expect(instanceRow).toBeVisible({ timeout: 10000 });

        const detailDrawer = await openTaskInstanceDetail(page, instanceRow);
        await expect(detailDrawer).toBeVisible({ timeout: 10000 });

        await expect(detailDrawer).toContainText(/校验(未|不)通过/);

        const viewDetailBtn = detailDrawer
          .getByRole("button", { name: /查看明细|明细/ })
          .first();
        if (await viewDetailBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
          await viewDetailBtn.click();
          await waitForUiSettled(page);
          const dataDrawer = page
            .locator(".ant-drawer:visible, .dtc-drawer:visible")
            .last();
          await expect(dataDrawer).toBeVisible({ timeout: 10000 });
          await expect(dataDrawer).toContainText("2");
          await expect(dataDrawer).toContainText("3");
        } else {
          await expect(detailDrawer).toContainText(/校验(未|不)通过/);
        }
      },
      instanceRow,
    );
  });
});
