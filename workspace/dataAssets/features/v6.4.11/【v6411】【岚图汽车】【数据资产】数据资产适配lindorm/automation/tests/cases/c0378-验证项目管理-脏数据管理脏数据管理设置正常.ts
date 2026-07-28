// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0378",
  "title": "验证【项目管理-脏数据管理】脏数据管理设置正常",
  "steps": [
    {
      "action": "进入【数据质量 → 项目管理 → 脏数据管理】页面",
      "expected": "1)页面展示「独立存储」说明\n2)列表列包含「数据源」「数据源类型」「脏数据存储库」「数据存储时效」「更新人」「脏数据存储」「操作」"
    },
    {
      "action": "点击 SparkThrift2.x 数据源行「编辑」并配置脏数据存储",
      "expected": "1)编辑弹窗打开\n2)可设置脏数据存储库和数据存储时效\n3)保存后列表回显更新人和最新配置"
    },
    {
      "action": "分别开启和关闭脏数据存储后执行异常规则任务",
      "expected": "1)开启时校验不通过明细可查看并下载\n2)关闭时不写入独立脏数据存储或按源库策略处理"
    }
  ]
} as const;

test.describe("验证【项目管理-脏数据管理】脏数据管理设置正常", () => {
  test("C0378 验证【项目管理-脏数据管理】脏数据管理设置正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
