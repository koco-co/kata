// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C066",
  "title": "验证【血缘关系】功能正常",
  "steps": [
    {
      "action": "点击表详情【血缘关系】按钮",
      "expected": "展示【表级血缘】【字段级血缘】【展示文字信息】【资产类型】【导航器】【表按钮】"
    },
    {
      "action": "点击【表级血缘】按钮",
      "expected": "展示当前表的上下游表"
    },
    {
      "action": "！文案校验",
      "expected": "每个节点都可右击查看该节点的全链路血缘，存在逆向可展开节点时建议右击查看~"
    },
    {
      "action": "点击中央【表按钮】",
      "expected": "弹表详情弹窗"
    },
    {
      "action": "表详情弹窗内容校验",
      "expected": "展示“表名””复制按钮”“技术属性模块”“业务属性模块“字段信息”“非分区字段”“分区字段””字段名称字段中文名搜索框“"
    },
    {
      "action": "输入存在的字段名称，字段中文名，点击搜索",
      "expected": "返回匹配的字段信息"
    },
    {
      "action": "输入不存在的字段名称，字段中文名，点击搜索",
      "expected": "展示“暂无数据”"
    },
    {
      "action": "点击分页，切换pagesize",
      "expected": "pagesize切换成功，数据展示正确，跳转正确"
    },
    {
      "action": "点击【字段级血缘】",
      "expected": "展示当前表所有字段及血缘关系"
    },
    {
      "action": "点击【字段名称】",
      "expected": "存在血缘字段时，弹血缘字段，没有血缘字段时，提示“字段血缘关系为空”"
    },
    {
      "action": "点击【展示文字信息】按钮",
      "expected": "展示当前表全名"
    },
    {
      "action": "点击【居中】按钮",
      "expected": "图居中展示"
    },
    {
      "action": "点击【放大】按钮",
      "expected": "图放大"
    },
    {
      "action": "点击【放小】按钮",
      "expected": "图放小"
    },
    {
      "action": "点击【下载】按钮",
      "expected": "下载血缘PNG成功，查看内容正确"
    },
    {
      "action": "点击【展示/隐藏】按钮",
      "expected": "展示/不展示导航器"
    }
  ]
} as const;

test.describe("验证【血缘关系】功能正常", () => {
  test("C066 验证【血缘关系】功能正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
