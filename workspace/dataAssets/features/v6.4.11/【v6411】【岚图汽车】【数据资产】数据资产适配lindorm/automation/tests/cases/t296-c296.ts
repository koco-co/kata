// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C296",
  "title": "验证【规则库配置-自定义正则】新增自定义正则与正则匹配测试正常",
  "steps": [
    {
      "action": "进入【数据质量 → 规则库配置】并点击「自定义正则」页签",
      "expected": "1)展示「新增自定义正则」入口\n2)列表列包含「规则名称」「规则分类」「关联范围」「关联规则数」「规则描述」"
    },
    {
      "action": "点击「新增自定义正则」并填写表单:\n- 规则名称: 车辆VIN正则\n- 规则分类: 有效性校验\n- 关联范围: 字段\n- 规则描述: 校验车辆VIN格式\n- 正则表达式: ^[A-Z0-9]{17}$\n- 测试数据: LTV202601160001AA\n点击「正则匹配测试」",
      "expected": "1)正则匹配测试返回匹配成功\n2)保存后自定义正则列表展示「车辆VIN正则」\n3)规则集配置自定义正则时可选择该规则"
    }
  ]
} as const;

test.describe("验证【规则库配置-自定义正则】新增自定义正则与正则匹配测试正常", () => {
  test("C296 验证【规则库配置-自定义正则】新增自定义正则与正则匹配测试正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
