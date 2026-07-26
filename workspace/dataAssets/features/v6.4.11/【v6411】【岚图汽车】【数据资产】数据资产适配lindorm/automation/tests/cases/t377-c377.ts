// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C377",
  "title": "验证【项目管理-项目信息】默认监控数据源库设置生效",
  "steps": [
    {
      "action": "进入【数据质量 → 项目管理 → 项目信息】并打开当前项目配置",
      "expected": "1)项目详情加载成功"
    },
    {
      "action": "设置默认监控数据源库为 SparkThrift2.x 数据源并保存",
      "expected": "1)默认监控数据源库保存成功\n2)新建规则集/规则任务时默认带出该数据源库"
    }
  ]
} as const;

test.describe("验证【项目管理-项目信息】默认监控数据源库设置生效", () => {
  test("C377 验证【项目管理-项目信息】默认监控数据源库设置生效", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
