// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C323",
  "title": "验证选择「手动关联离线任务周期」-配置项交互正确",
  "steps": [
    {
      "action": "进入「数据质量」-「规则任务管理」-「调度属性」配置页面",
      "expected": "进入成功"
    },
    {
      "action": "「调度周期」选择「手动关联离线任务周期」",
      "expected": "选择成功"
    },
    {
      "action": "鼠标hover 「手动关联离线任务周期」「？」",
      "expected": "提示\"手动关联离线任务周期，需要设置质量任务的调度周期，支持选择按天/周/月运行，设置后会取质量任务运行当天关联的离线任务的最后一次任务实例跑完后，再跑质量任务。使用注意：1、若离线任务调度周期大于质量任务的调度周期（比如离线周期为周，质量为天），会存在质量任务空跑的情况\""
    },
    {
      "action": "校验配置",
      "expected": "展示「质量任务周期」「生效日期」必填配置项"
    },
    {
      "action": "「质量任务周期」选择「天」，「生效日期」选择「2025-11-01～2025-11-02」",
      "expected": "配置成功"
    },
    {
      "action": "「质量任务周期」选择「周」，「生效日期」选择「2025-11-01～2025-11-02」，「选择时间」可多选「星期一，星期二」",
      "expected": "配置成功"
    },
    {
      "action": "「质量任务周期」选择「月」，「生效日期」选择「2025-11-01～2025-11-02」，「选择时间」可多选「每月1号，每月2号」",
      "expected": "配置成功"
    }
  ]
} as const;

test.describe("验证选择「手动关联离线任务周期」-配置项交互正确", () => {
  test("C323 验证选择「手动关联离线任务周期」-配置项交互正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
