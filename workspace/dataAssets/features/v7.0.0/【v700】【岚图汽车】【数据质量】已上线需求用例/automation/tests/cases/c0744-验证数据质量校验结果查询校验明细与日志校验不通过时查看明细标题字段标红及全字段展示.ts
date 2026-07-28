// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0744",
  "title": "验证【数据质量 校验结果查询 校验明细与日志】校验不通过时查看明细：标题、字段标红及全字段展示",
  "steps": [
    {
      "action": "进入【数据质量 → 校验结果查询】页面，等待页面加载完成",
      "expected": "校验结果查询页面正常打开，列表加载完成"
    },
    {
      "action": "找到\"task_json_key_range_test\"最新执行记录，找到质检结果为\"校验不通过\"的规则行",
      "expected": "目标规则行可正常定位，数据展示完整"
    },
    {
      "action": "点击该规则行操作列的【查看明细】按钮，等待明细弹窗加载完成",
      "expected": "成功打开明细页面，页面加载不报错"
    },
    {
      "action": "观察明细页面的标题文案、数据列表字段列数、以及id=10记录的\"info\"字段展示样式",
      "expected": "1) 明细标题显示\"查看\"完整性校验-key范围校验\"明细\"\n2) 数据列表展示原表全部字段（id、info等）\n3) id=10记录的\"info\"字段内容以红色字体或红色背景高亮标红展示\n4) 不符合要求的数据（id=10）出现在列表中"
    }
  ]
} as const;

test.describe("验证【数据质量 校验结果查询 校验明细与日志】校验不通过时查看明细：标题、字段标红及全字段展示", () => {
  test("C0744 验证【数据质量 校验结果查询 校验明细与日志】校验不通过时查看明细：标题、字段标红及全字段展示", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
