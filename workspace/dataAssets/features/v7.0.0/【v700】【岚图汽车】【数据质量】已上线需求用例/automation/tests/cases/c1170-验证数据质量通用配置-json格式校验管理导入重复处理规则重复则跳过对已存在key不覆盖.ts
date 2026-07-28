// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1170",
  "title": "验证【数据质量 通用配置-json格式校验管理 导入】重复处理规则「重复则跳过」对已存在key不覆盖",
  "steps": [
    {
      "action": "进入【数据质量 → 通用配置】页面，等待json格式校验管理列表数据加载完成",
      "expected": "页面正常加载，skipKey 记录的value格式显示 ^[a-z]+$"
    },
    {
      "action": "点击【导入】按钮，在导入弹窗中确认重复处理规则为「重复则跳过」（默认值），上传包含key skipKey（value格式为 ^[A-Z]+$）的XLSX文件，点击【确定】按钮，等待接口响应完成",
      "expected": "弹窗关闭，列表刷新，skipKey 记录的value格式仍为 ^[a-z]+$，未被覆盖"
    }
  ]
} as const;

test.describe("验证【数据质量 通用配置-json格式校验管理 导入】重复处理规则「重复则跳过」对已存在key不覆盖", () => {
  test("C1170 验证【数据质量 通用配置-json格式校验管理 导入】重复处理规则「重复则跳过」对已存在key不覆盖", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
