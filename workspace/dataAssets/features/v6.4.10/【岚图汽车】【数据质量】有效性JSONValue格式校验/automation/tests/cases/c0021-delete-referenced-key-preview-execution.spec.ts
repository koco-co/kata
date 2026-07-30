// spec: features/validity-json-value-format/archive.md#case=t21-key-value
// intent: SR-INTENT-MIGRATED
// probe: SR-UI-PROBE-MIGRATED
// META: {"id":"t21","priority":"P1","title":"【P1】验证删除已被规则引用的key后value格式预览弹窗和执行校验任务正常"}
import { expect, test } from "../../../../../../_shared/automation/fixtures/step-screenshot";
import { PREVIEW_DELETE_SCENARIO } from "../fixtures/test-data";
import {
  openScenarioRuleSetPackage,
  openValueFormatPreview,
} from "../flows/rule-set-flow";
import {
  ensureExecutedJsonTask,
  ensureJsonFormatTask,
  getTaskDetailRuleCard,
  openTaskInstanceDetail,
  waitForVisibleTaskRow,
} from "../flows/rule-task-flow";
import { deleteKey, gotoJsonConfigPage } from "../../../../../../_shared/automation/pages/data-quality/json-configuration";
import { describeByDatasource } from "../fixtures/suite-matrix";

test.setTimeout(600000);

describeByDatasource("规则集管理", () => {
  test("验证删除已被规则引用的key后value格式预览弹窗和执行校验任务正常", async ({ page }) => {
    await gotoJsonConfigPage(page);
    await deleteKey(page, "preview-key-x", { force: true }).catch(() => undefined);

    await ensureJsonFormatTask(page, PREVIEW_DELETE_SCENARIO);

    await gotoJsonConfigPage(page);
    await deleteKey(page, "preview-key-x", { force: true });

    const rulePackage = await openScenarioRuleSetPackage(page, PREVIEW_DELETE_SCENARIO);
    const ruleForm = rulePackage.locator(".ruleForm").first();
    const previewModal = await openValueFormatPreview(page, ruleForm);

    await expect(previewModal).toContainText("preview-key-y");
    await expect(previewModal).not.toContainText("preview-key-x");
    await page.keyboard.press("Escape").catch(() => undefined);

    await ensureExecutedJsonTask(page, PREVIEW_DELETE_SCENARIO);
    const instanceRow = await waitForVisibleTaskRow(page, PREVIEW_DELETE_SCENARIO.taskName);
    const detailDrawer = await openTaskInstanceDetail(page, instanceRow);
    const ruleCard = getTaskDetailRuleCard(detailDrawer, "格式-json格式校验");

    await expect(ruleCard).toContainText(/校验通过/);
    await expect(ruleCard).toContainText("preview-key-y");
    await expect(ruleCard).not.toContainText("preview-key-x");
  });
});
