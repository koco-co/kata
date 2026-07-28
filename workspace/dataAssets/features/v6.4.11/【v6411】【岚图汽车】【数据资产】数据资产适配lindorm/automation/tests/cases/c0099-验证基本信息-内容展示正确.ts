// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0099",
  "title": "验证【基本信息】-内容展示正确",
  "steps": [
    {
      "action": "点击表详情页右侧【基本信息】栏",
      "expected": "【资产类型】【任务类型】【描述信息】【标签】【数据目录】信息展示正确"
    },
    {
      "action": "点击修改描述信息，修改为“test”",
      "expected": "描述信息更新正确"
    },
    {
      "action": "点击添加标签，输入标签名“table_tag”，保存",
      "expected": "保存成功"
    },
    {
      "action": "点击添加数据目录",
      "expected": "弹数据目录下拉框选择弹窗"
    },
    {
      "action": "选择数据目录，确认",
      "expected": "数据目录添加成功，数据地图二级页面选择该数据目录时，展示当前任务"
    },
    {
      "action": "再次点击【基本信息】栏",
      "expected": "侧边栏收起"
    }
  ]
} as const;

test.describe("验证【基本信息】-内容展示正确", () => {
  test("C0099 验证【基本信息】-内容展示正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
