// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C370",
  "title": "验证【通用配置-json格式校验管理】导入正确文件正常(重复则跳过)",
  "steps": [
    {
      "action": "进入【数据质量 → 通用配置 → json格式校验管理】页面",
      "expected": "1)页面展示「导 入」「导 出」「新 增」按钮\n2)列表列包含「key」「中文名称」「value格式」「数据源类型」「创建人」「创建时间」「更新人」「更新时间」「操作」"
    },
    {
      "action": "点击「导 入」上传正确 xlsx 文件:\n- 重复处理规则: 重复则跳过\n- 数据源类型: SparkThrift2.x",
      "expected": "1)导入成功\n2)已存在 key 保持原值\n3)不存在 key 新增到列表\n4)导入结果无错误文件"
    }
  ]
} as const;

test.describe("验证【通用配置-json格式校验管理】导入正确文件正常(重复则跳过)", () => {
  test("C370 验证【通用配置-json格式校验管理】导入正确文件正常(重复则跳过)", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
