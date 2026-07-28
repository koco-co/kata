// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1332",
  "title": "验证【数据标准导入标准功能调整】「导入模板」-「导入结果」导入失败",
  "steps": [
    {
      "action": "打开下载的导入模板文件，按规则填写内容（根据失败类型对应填写测试且分为两种情况测试：1、原标准与文档标准存在该情况 2、文档标准存在该情况）",
      "expected": "2. 点击【导入标准】按钮"
    },
    {
      "action": "测试场景1【相同标准名称】",
      "expected": "点击【导入标准】按钮"
    },
    {
      "action": "测试场景2【同一个\"英文名称\"标准的不同车型业务属性不同】",
      "expected": "点击【导入标准】按钮"
    },
    {
      "action": "测试场景3【填写字段不符合要求格式】",
      "expected": "点击【导入标准】按钮"
    },
    {
      "action": "【存在多个失败原因，用英文分号分割展示】",
      "expected": "点击后自动下载导入异常记录文件，文件中包含导入数据和失败原因，失败原因一列展示"
    },
    {
      "action": "点击下载【异常记录】按钮",
      "expected": "确认导入失败记录未出现在列表中"
    },
    {
      "action": "进入【资产】-【数据标准】-【标准管理】-【标准定义】页面",
      "expected": ""
    }
  ]
} as const;

test.describe("验证【数据标准导入标准功能调整】「导入模板」-「导入结果」导入失败", () => {
  test("C1332 验证【数据标准导入标准功能调整】「导入模板」-「导入结果」导入失败", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
