// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1195",
  "title": "验证多层级 key 的「层级关系」与「父 Key」取值正确",
  "steps": [
    {
      "action": "进入【数据质量 → 通用配置 → json格式校验管理】，逐层展开 lvl1 → lvl2 → lvl3 → lvl4 → lvl5",
      "expected": "五层节点均在列表中可见，lvl1、lvl2、lvl3、lvl4 各父层显示展开图标"
    },
    {
      "action": "勾选 lvl1、lvl2、lvl3、lvl4、lvl5 五行，点击顶部【导出】按钮，等待文件下载完成",
      "expected": "1) 五行复选框均选中，列表底部显示「当前选中：5」\n2) 浏览器触发文件下载"
    },
    {
      "action": "打开下载的导出文件，核对各行「层级关系」与「父 Key」",
      "expected": "1) lvl1：层级关系=一层、父 Key=空\n2) lvl2：层级关系=二层、父 Key=lvl1\n3) lvl3：层级关系=三层、父 Key=lvl2\n4) lvl4：层级关系=四层、父 Key=lvl3\n5) lvl5：层级关系=五层、父 Key=lvl4"
    }
  ]
} as const;

test.describe("验证多层级 key 的「层级关系」与「父 Key」取值正确", () => {
  test("C1195 验证多层级 key 的「层级关系」与「父 Key」取值正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
