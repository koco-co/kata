// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0446",
  "title": "验证级别管理添加编辑级别支持开放用户等级配置",
  "steps": [
    {
      "action": "查看添加/编辑级别流程",
      "expected": "1）增加“开放用户等级”下拉单选项\n2）下拉选项：L1～L5\n3）hover提示：设置后，归属于该级别的字段只开放给对应用户等级的用户查看，默认开放给全量用户（L1级别表示最低级别用户，L1及以上等级用户均有查看权限）"
    },
    {
      "action": "添加级别，配置“开放用户等级”为L1",
      "expected": "添加级别成功，开放用户等级数据正确"
    },
    {
      "action": "编辑级别，配置“开放用户等级”为L2",
      "expected": "编辑级别成功，开放用户等级数据正确"
    }
  ]
} as const;

test.describe("验证级别管理添加编辑级别支持开放用户等级配置", () => {
  test("C0446 验证级别管理添加编辑级别支持开放用户等级配置", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
