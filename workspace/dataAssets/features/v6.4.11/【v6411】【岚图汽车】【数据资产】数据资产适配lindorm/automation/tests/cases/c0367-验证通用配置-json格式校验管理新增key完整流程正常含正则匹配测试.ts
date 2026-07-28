// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0367",
  "title": "验证【通用配置-json格式校验管理】新增key完整流程正常(含正则匹配测试)",
  "steps": [
    {
      "action": "进入【数据质量 → 通用配置 → json格式校验管理】页面",
      "expected": "1)页面展示「导 入」「导 出」「新 增」按钮\n2)列表列包含「key」「中文名称」「value格式」「数据源类型」「创建人」「创建时间」「更新人」「更新时间」「操作」"
    },
    {
      "action": "点击「新 增」并填写:\n- key: vehicle\n- 中文名称: 车辆信息\n- value格式: ^[A-Za-z0-9_{}:\\\",]+$\n- 数据源类型: SparkThrift2.x\n- 测试数据: {\"vin\":\"LTV202601160001AA\"}\n点击「正则匹配测试」并保存",
      "expected": "1)正则匹配测试成功\n2)key 保存成功并展示在列表\n3)规则集配置「格式-json格式校验」时可选择该 key"
    }
  ]
} as const;

test.describe("验证【通用配置-json格式校验管理】新增key完整流程正常(含正则匹配测试)", () => {
  test("C0367 验证【通用配置-json格式校验管理】新增key完整流程正常(含正则匹配测试)", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
