// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C019",
  "title": "验证脏数据独立存储开启后可查看和下载异常明细",
  "steps": [
    {
      "action": "进入【数据质量 → 项目管理】页面，等待项目列表加载完成",
      "expected": "项目列表展示 test_007"
    },
    {
      "action": "进入 test_007 项目详情，切换到【脏数据管理】",
      "expected": "页面展示脏数据存储说明、数据源、数据源类型、脏数据存储库、数据存储时效、操作"
    },
    {
      "action": "点击【开启】或【编辑】配置脏数据独立存储，等待配置弹窗加载完成",
      "expected": "弹窗展示校验数据源、是否存储到源库、脏数据存储库、数据存储时效字段"
    },
    {
      "action": "选择校验数据源为 SparkThrift 数据源",
      "expected": "脏数据存储库下拉框加载完成"
    },
    {
      "action": "是否存储到源库选择【是】",
      "expected": "脏数据存储库自动匹配源库或展示可选源库"
    },
    {
      "action": "数据存储时效输入 90 天，点击【确定】，等待配置保存完成",
      "expected": "脏数据存储状态为开启，数据存储时效展示 90 天"
    },
    {
      "action": "重新执行“v63完整性字段级任务”，等待任务实例查询生成校验异常实例",
      "expected": "最新实例状态为校验异常"
    },
    {
      "action": "打开实例详情，点击【查看明细】，等待明细表格加载完成",
      "expected": "明细数据展示 user_code 为空的记录；明细数量和样例 id 与 `SELECT id FROM dq_test_user_info_300 WHERE user_code IS NULL LIMIT 20` 查询结果一致"
    },
    {
      "action": "点击明细下载入口，等待下载任务完成",
      "expected": "下载文件生成成功，文件内容包含 user_code 字段和 SparkThrift 明细查询中的样例 id"
    }
  ]
} as const;

test.describe("验证脏数据独立存储开启后可查看和下载异常明细", () => {
  test("C019 验证脏数据独立存储开启后可查看和下载异常明细", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
