// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C523",
  "title": "验证【数据质量 规则任务管理 key删除后关联影响】删除已被规则引用的key后value格式预览弹窗和执行校验任务正常",
  "steps": [
    {
      "action": "进入【数据质量 → 规则任务管理】页面，等待规则任务列表加载完成",
      "expected": "规则任务列表正常加载"
    },
    {
      "action": "进入【数据质量 → 规则集管理】页面，找到规则集\"rule_set_preview_del_test\"，点击操作列的【编辑】按钮，进入 Step 2 监控规则页面，找到「格式-json格式校验」规则行，点击「value格式预览」按钮，等待弹窗加载",
      "expected": "弹窗正常打开，仅展示「preview-key-y」的格式信息，已删除的「preview-key-x」不在列表中"
    },
    {
      "action": "关闭弹窗，返回规则任务列表，找到「key删除预览测试任务」，点击【立即执行】按钮",
      "expected": "页面弹出提示信息，提示任务已提交执行"
    },
    {
      "action": "进入【数据质量 → 校验结果查询】页面，找到「key删除预览测试任务」最新实例记录并打开实例详情",
      "expected": "1) 本次执行生成新的实例记录，任务名称与执行时间与本次操作匹配\n2) 实例状态显示「已完成」，最新校验结果显示「校验通过」\n3) 实例详情中「格式-json格式校验」规则的详情说明仅引用「preview-key-y」，不再展示已删除的「preview-key-x」\n4) 页面未出现引用已删除 key 的报错信息"
    }
  ]
} as const;

test.describe("验证【数据质量 规则任务管理 key删除后关联影响】删除已被规则引用的key后value格式预览弹窗和执行校验任务正常", () => {
  test("C523 验证【数据质量 规则任务管理 key删除后关联影响】删除已被规则引用的key后value格式预览弹窗和执行校验任务正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
