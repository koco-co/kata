// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0020",
  "title": "验证脏数据独立存储关闭后不再新增异常明细存储",
  "steps": [
    {
      "action": "进入【数据质量 → 项目管理】页面，等待项目列表加载完成",
      "expected": "项目列表展示 test_007"
    },
    {
      "action": "进入 test_007 项目详情，切换到【脏数据管理】",
      "expected": "脏数据存储状态为开启"
    },
    {
      "action": "点击【关闭】，等待关闭操作完成",
      "expected": "提示关闭独立存储成功，脏数据存储状态为关闭"
    },
    {
      "action": "重新执行“v63完整性字段级任务”，等待任务实例查询生成校验异常实例",
      "expected": "最新实例状态为校验异常"
    },
    {
      "action": "打开最新实例详情查看明细入口",
      "expected": "最新实例不新增独立存储明细，历史实例已存储的明细仍可查看"
    },
    {
      "action": "再次点击【开启】，等待配置弹窗加载完成",
      "expected": "弹窗回显上一次保存的 SparkThrift 数据源和存储时效"
    },
    {
      "action": "点击【确定】，等待配置保存完成",
      "expected": "脏数据存储状态为开启，后续校验异常实例恢复明细存"
    }
  ]
} as const;

test.describe("验证脏数据独立存储关闭后不再新增异常明细存储", () => {
  test("C0020 验证脏数据独立存储关闭后不再新增异常明细存储", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
