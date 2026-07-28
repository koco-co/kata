// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1237",
  "title": "验证【「数据标准」-「标准管理」新增「落标检查」版块】「标准管理」-「落标检查」-「落标检查任务」-「编辑检查任务」-「检查范围」页面内容",
  "steps": [
    {
      "action": "进入【资产】-【数据标准】-【标准管理】-【落标检查】页面",
      "expected": "进入成功"
    },
    {
      "action": "定位到测试用任务 【test】，点击 [编辑] 按钮",
      "expected": "进入[检查范围]配置页面"
    },
    {
      "action": "【检查范围】UI Check",
      "expected": "【检查数据范围】\n[选择数据源][数据库][数据表]\n[选择分区（选择已有分区/选择动态分区/手动输入分区）]\n【对标标准】\n[标准目录]\n[车型关联字段]\n[取消][下一步]\n以上内容正常显示"
    },
    {
      "action": "【选择字段】UI Check",
      "expected": "【检查数据范围】\n[字段名称查询框]\n[勾选框][字段][是否开启检查]\n[检查项]（精度倍数/数据精度/值域范围/数据长度/空值数/重复数）\n[分页栏]\n[批量开启][批量关闭]\n【规则包设置】\n[规则包数量下拉框][悬浮提示]\n[取消][临时检查][下一步]\n以上内容正常显示"
    },
    {
      "action": "【调度配置】UI Check",
      "expected": "【检查周期】\n[调度周期][生效日期][具体时间]\n【告警通知】[悬浮提示]\n[告警方式][悬浮提示]：\n[短信][邮箱]\n[钉钉]\n[自定义告警通道Hep4c6TO]\n[自定义告警通道saePItOS]\n[自定义告警通道aGuV4thH]\n[自定义告警通道EGYugtUm]\n[自定义告警——企业微信]\n[中信建投]\n[标准jar]\n[取消][上一步][新增][新增并立即执行]\n以上内容正常显示"
    }
  ]
} as const;

test.describe("验证【「数据标准」-「标准管理」新增「落标检查」版块】「标准管理」-「落标检查」-「落标检查任务」-「编辑检查任务」-「检查范围」页面内容", () => {
  test("C1237 验证【「数据标准」-「标准管理」新增「落标检查」版块】「标准管理」-「落标检查」-「落标检查任务」-「编辑检查任务」-「检查范围」页面内容", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
