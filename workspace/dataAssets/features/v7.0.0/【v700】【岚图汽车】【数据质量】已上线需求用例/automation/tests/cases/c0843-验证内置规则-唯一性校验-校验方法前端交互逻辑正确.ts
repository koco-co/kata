// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0843",
  "title": "验证「内置规则」-「唯一性校验」-「校验方法」前端交互逻辑正确",
  "steps": [
    {
      "action": "进入「资产」-「数据质量」-「规则任务管理」-「规则库配置」页面",
      "expected": "进入成功"
    },
    {
      "action": "将「唯一性」-「校验方法」-「固定值」「1天波动检测」「7天波动检测」「月度波动检测」「7天平均值波动检测」「月度平均值波动检测」相关规则均关闭",
      "expected": "关闭成功"
    },
    {
      "action": "进入「规则任务管理」-「监控规则配置页面」，添加「唯一性校验」规则，点击「统计函数」下拉框",
      "expected": "不展示「固定值」「1天波动检测」「7天波动检测」「月度波动检测」「7天平均值波动检测」「月度平均值波动检测」可选项"
    },
    {
      "action": "在「内置规则」中开启任一「唯一性」-「校验方法」-「固定值」「1天波动检测」「7天波动检测」「月度波动检测」「7天平均值波动检测」「月度平均值波动检测」相关规则",
      "expected": "开启成功"
    },
    {
      "action": "进入「规则任务管理」-「监控规则配置页面」，添加「唯一性校验」规则，点击「统计函数」下拉框",
      "expected": "不展示「固定值」「1天波动检测」「7天波动检测」「月度波动检测」「7天平均值波动检测」「月度平均值波动检测」可选项"
    }
  ]
} as const;

test.describe("验证「内置规则」-「唯一性校验」-「校验方法」前端交互逻辑正确", () => {
  test("C0843 验证「内置规则」-「唯一性校验」-「校验方法」前端交互逻辑正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
