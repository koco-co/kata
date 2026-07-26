// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1171",
  "title": "验证【数据质量 通用配置-json格式校验管理 导入】重复处理规则「重复则覆盖更新」生效",
  "steps": [
    {
      "action": "进入【数据质量 → 通用配置】页面，等待json格式校验管理列表数据加载完成",
      "expected": "页面正常加载，existKey 记录的value格式显示 ^[a-z]+$"
    },
    {
      "action": "点击【导入】按钮，在导入弹窗中将重复处理规则切换为「重复则覆盖更新」，上传包含key existKey（value格式为 ^[A-Z]+$）的XLSX文件，点击【确定】按钮，等待接口响应完成",
      "expected": "弹窗关闭，列表刷新，existKey 记录的value格式更新为 ^[A-Z]+$"
    }
  ]
} as const;

test.describe("验证【数据质量 通用配置-json格式校验管理 导入】重复处理规则「重复则覆盖更新」生效", () => {
  test("C1171 验证【数据质量 通用配置-json格式校验管理 导入】重复处理规则「重复则覆盖更新」生效", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
