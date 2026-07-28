// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0098",
  "title": "验证【血缘关系】功能正常",
  "steps": [
    {
      "action": "点击任务详情【血缘关系】按钮",
      "expected": "展示【表级血缘】【字段级血缘】【展示文字信息】【资产类型】【导航器】【任务按钮】"
    },
    {
      "action": "点击【表级血缘】按钮",
      "expected": "展示当前任务的上下游表"
    },
    {
      "action": "！文案校验",
      "expected": "每个节点都可右击查看该节点的全链路血缘，存在逆向可展开节点时建议右击查看~"
    },
    {
      "action": "点击中央【任务按钮】",
      "expected": "弹任务详情弹窗"
    },
    {
      "action": "表详情弹窗内容校验",
      "expected": "正确展示“ 标签名称复制按钮”“标签名称”“标签英文名称”“标签ID”“所属实体”“标签描述”“创建人”“创建时间””最近修改人“最近修改时间”“查看详情”"
    },
    {
      "action": "点击【字段级血缘】",
      "expected": "展示当前任务所有字段及血缘关系"
    },
    {
      "action": "点击【字段名称】",
      "expected": "存在血缘字段时，弹血缘字段，没有血缘字段时，提示“字段血缘关系为空”"
    },
    {
      "action": "点击【展示文字信息】按钮",
      "expected": "展示当前任务全名"
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
  test("C0098 验证【血缘关系】功能正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
