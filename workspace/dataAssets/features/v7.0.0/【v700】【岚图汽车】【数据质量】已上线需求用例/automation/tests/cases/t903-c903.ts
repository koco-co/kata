// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C903",
  "title": "验证【数据质量 规则库配置 规则库-内置规则展示】规则库中新增key范围校验内置规则展示信息正确",
  "steps": [
    {
      "action": "进入【数据质量 → 规则库配置】页面，等待规则库列表加载完成",
      "expected": "规则库配置页面正常打开，列表加载完成"
    },
    {
      "action": "在规则分类筛选中选择\"完整性校验\"，在列表中查找\"key范围校验\"规则",
      "expected": "规则库完整性校验分类下可找到\"key范围校验\"规则"
    },
    {
      "action": "点击\"key范围校验\"规则行查看规则详情",
      "expected": "规则详情显示：\n1) 规则名称=key范围校验\n2) 规则解释=对数据中包含的key范围校验\n3) 规则分类=完整性校验\n4) 关联范围=字段\n5) 规则描述=校验json类型的字段中key名是否完整，对key的范围进行校验"
    },
    {
      "action": "返回规则列表，将鼠标悬浮在\"key范围校验\"的统计函数名称旁的提示图标上，等待tooltip出现",
      "expected": "悬浮提示内容为\"对数据中包含的key范围校验\"，与规则库中\"规则解释\"字段内容一致"
    },
    {
      "action": "导出规则库",
      "expected": "存在key范围校验-对数据中包含的key范围校验-完整性校验"
    }
  ]
} as const;

test.describe("验证【数据质量 规则库配置 规则库-内置规则展示】规则库中新增key范围校验内置规则展示信息正确", () => {
  test("C903 验证【数据质量 规则库配置 规则库-内置规则展示】规则库中新增key范围校验内置规则展示信息正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
