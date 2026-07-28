// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0007",
  "title": "验证数据质量报告中校验内容默认显示前两个悬浮展示全部",
  "steps": [
    {
      "action": "进入【数据质量 → 数据质量报告】页面，等待报告列表加载完成",
      "expected": "数据质量报告页面正常打开，报告列表加载完成"
    },
    {
      "action": "找到\"task_json_key_range_tooltip_report\"对应的最新报告，点击进入报告详情页，定位到 key范围校验规则行的\"校验内容\"/\"详情说明\"列",
      "expected": "报告详情页正常打开，可定位到 key范围校验规则行"
    },
    {
      "action": "观察\"校验内容\"列在非悬浮状态下的显示内容",
      "expected": "1) 校验内容列默认仅展示前两个key信息\n2) 显示形如\"key1-key2...\"（或符合源码截断样式），超出部分以省略号\"...\"截断显示"
    },
    {
      "action": "将鼠标悬浮在\"校验内容\"列的文本上，等待tooltip出现",
      "expected": "鼠标悬浮后，tooltip中完整展示全部4个key信息：\"key1-key2;key11-key22\""
    }
  ]
} as const;

test.describe("验证数据质量报告中校验内容默认显示前两个悬浮展示全部", () => {
  test("C0007 验证数据质量报告中校验内容默认显示前两个悬浮展示全部", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
