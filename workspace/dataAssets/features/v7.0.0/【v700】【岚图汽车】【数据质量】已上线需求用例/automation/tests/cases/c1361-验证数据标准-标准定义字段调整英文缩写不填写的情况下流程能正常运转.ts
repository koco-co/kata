// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1361",
  "title": "验证【「数据标准」-「标准定义」字段调整】「英文缩写」不填写的情况下流程能正常运转",
  "steps": [
    {
      "action": "进入【资产】-【数据标准】-【标准管理】-【标准定义】页面",
      "expected": "进入成功"
    },
    {
      "action": "点击【新建标准】按钮",
      "expected": "进入[新建标准]配置页面"
    },
    {
      "action": "业务属性配置如下：\n[中文名称] 测试\n[英文名称] Test_&Box\n[英文缩写] 不作填写\n[标准目录] tst\n（非必填项不作填写）",
      "expected": "[新建标准]配置完成"
    },
    {
      "action": "点击【保存】按钮",
      "expected": "弹出提示\"数据标准保存成功\"，返回【标准定义】页面"
    },
    {
      "action": "找到【测试】标准，点击编辑",
      "expected": "进入【编辑标准】配置页面"
    },
    {
      "action": "点击【上线】按钮",
      "expected": "弹出提示\"数据标准发布成功\"，返回【标准定义】页面"
    },
    {
      "action": "点击【下线】按钮",
      "expected": "弹出确认框\"该数据标准已被引用至0张数据表，下线数据标准数据表中将不再展示字段的标准标签信息，且会同步删除标准映射结果\"，点击确认框[下线]按钮，标准状态改为[待上线]"
    }
  ]
} as const;

test.describe("验证【「数据标准」-「标准定义」字段调整】「英文缩写」不填写的情况下流程能正常运转", () => {
  test("C1361 验证【「数据标准」-「标准定义」字段调整】「英文缩写」不填写的情况下流程能正常运转", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
