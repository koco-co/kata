import { test } from "../../../../../../../_shared/automation/fixtures/step-screenshot";
import {
  ACTIVE_DATASOURCES,
  clearCurrentDatasource,
  setCurrentDatasource,
} from "../../fixtures/test-data";
import { verifyRequiredKeyRangeField } from "../../flows/rule-set-flow";

const CASE_TITLE = "验证未选择校验内容时保存key范围校验规则提示必填";

for (const datasource of ACTIVE_DATASOURCES) {
  test.describe(`完整性 key 范围校验 - ${datasource.reportName}`, () => {
    test.describe.configure({ timeout: 600000 });
    test.beforeAll(() => setCurrentDatasource(datasource));
    test.beforeEach(() => setCurrentDatasource(datasource));
    test.afterAll(() => clearCurrentDatasource());

    test(CASE_TITLE, async ({ page }) => {
      await verifyRequiredKeyRangeField(page, "content");
    });
  });
}
