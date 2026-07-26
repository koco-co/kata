// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1363",
  "title": "验证【「数据标准」-「标准定义」字段调整】「英文名称」进行重复性校验，存在重复提示\"已存在相同标准\"",
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
      "action": "业务属性配置如下：\n[中文名称] 测试\n[英文名称] Test_&Box\n[英文缩写] t_b\n[标准目录] tst\n（非必填项不作填写）",
      "expected": "[新建标准]配置完成"
    },
    {
      "action": "点击【保存】按钮",
      "expected": "弹出提示\"数据标准保存成功\"，返回【标准定义】页面"
    },
    {
      "action": "相同内容重复创建",
      "expected": "在配置内容脱离焦点后提示\"与已有标准\"测试\"/\"Test_&Box\"/\"t_&b\"冲突\""
    },
    {
      "action": "点击【保存】按钮",
      "expected": "弹出提示\"与已有标准\"测试\"/\"Test_&Box\"/\"t_&b\"冲突\"，不作保存操作"
    }
  ]
} as const;

test.describe("验证【「数据标准」-「标准定义」字段调整】「英文名称」进行重复性校验，存在重复提示\"已存在相同标准\"", () => {
  test("C1363 验证【「数据标准」-「标准定义」字段调整】「英文名称」进行重复性校验，存在重复提示\"已存在相同标准\"", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
