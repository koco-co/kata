// spec: features/completeness-json-key-range/archive.md#case=t31-case-31
// intent: SR-INTENT-MIGRATED
// probe: SR-UI-PROBE-MIGRATED
// page: _shared/pages/PLACEHOLDER-page.ts
// META: {"id":"t31","priority":"P1","title":"验证下载明细数据中校验字段标红展示"}
import { test } from "../../../../../../../_shared/automation/fixtures/step-screenshot";
import {
  ensureRuleTasks,
  executeTaskFromList,
  waitForTaskInstanceFinished,
  MAIN_TASK_NAME,
} from "../../flows/rule-task-flow";

test.setTimeout(600000);

const SUITE_NAME = "【内置规则丰富】完整性，json中key值范围校验(#15693)";

test.describe(SUITE_NAME, () => {
  test("验证下载明细数据中校验字段标红展示", async ({ page, step }) => {
    await step("步骤1: 准备前置条件（规则集+任务）", async () => {
      await ensureRuleTasks(page, [MAIN_TASK_NAME]);
    });

    await step("步骤2: 执行任务并等待完成", async () => {
      await executeTaskFromList(page, MAIN_TASK_NAME);
      await waitForTaskInstanceFinished(page, MAIN_TASK_NAME, 480000);
    });

    await step("步骤3: 下载明细数据 → 校验字段标红展示", async () => {
      // TODO: 此用例需要处理文件下载（Playwright download event）+ 解析 Excel 单元格样式。
      //       Excel 解析依赖 exceljs 或 xlsx 库，需确认是否已安装。
      //       当前先做骨架，待下载处理就绪后补充。
      test.skip(true, "需要文件下载处理 + Excel 解析能力，暂不自动执行");
    });
  });
});
