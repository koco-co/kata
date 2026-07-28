// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0509",
  "title": "验证通知配置-新增功能正常",
  "steps": [
    {
      "action": "1. 进入资产页面\n2. 点击平台管理-通知中心-通知配置\n3. 点击新增按钮\n4. 校验新增通知配置的UI",
      "expected": "弹新增通知配置的弹窗，界面展示【接收人/通知模块/取消/确定】等按钮"
    },
    {
      "action": "1. 进入资产页面\n2. 点击平台管理-通知中心-通知配置\n3. 点击新增按钮，选择所有的通知模块",
      "expected": "页面展示【数据治理待治理项通知/数据质量规则触发告警/元数据实时同步告警/元数据周期同步告警】模块"
    },
    {
      "action": "1. 进入资产页面\n2. 点击平台管理-通知中心-通知配置\n3. 点击新增按钮，输入必填信息，点击取消/确定按钮",
      "expected": "点击取消按钮，弹窗关闭，通知配置新增失败，点击确定按钮，弹窗关闭，通知配置新增成功，页面自动刷新展示新增的通知配置信息"
    }
  ]
} as const;

test.describe("验证通知配置-新增功能正常", () => {
  test("C0509 验证通知配置-新增功能正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
