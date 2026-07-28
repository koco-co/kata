// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0015",
  "title": "验证编辑界面选择字段校验逻辑和选择其他表校验关系逻辑关系校验",
  "steps": [
    {
      "action": "进入【数据资产】-【数据质量】-【规则任务管理】-选择weiyi_01，点击表名",
      "expected": "右侧弹出具体规则信息"
    },
    {
      "action": "选择一个唯一性校验，点击编辑",
      "expected": "唯一性校验具体配置框进入编辑状态"
    },
    {
      "action": "逻辑修改为允许重复-或-唯一，点击保存",
      "expected": "保存失败，提醒不允许选择允许重复"
    },
    {
      "action": "逻辑修改为允许重复-且-允许重复，点击保存",
      "expected": "保存失败，提醒必须有一个字段校验逻辑选择唯一，否则规则无法生效"
    }
  ]
} as const;

test.describe("验证编辑界面选择字段校验逻辑和选择其他表校验关系逻辑关系校验", () => {
  test("C0015 验证编辑界面选择字段校验逻辑和选择其他表校验关系逻辑关系校验", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
