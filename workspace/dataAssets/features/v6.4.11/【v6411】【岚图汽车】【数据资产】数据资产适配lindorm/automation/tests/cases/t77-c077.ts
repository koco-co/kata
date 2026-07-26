// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C077",
  "title": "验证【血缘关系】功能正常",
  "steps": [
    {
      "action": "点击表详情【血缘关系】按钮",
      "expected": "展示【表级血缘】【展示文字信息】【资产类型】【导航器】【任务按钮】"
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
      "action": "点击中央【任务按钮】",
      "expected": "弹任务详情弹窗"
    },
    {
      "action": "任务详情弹窗内容校验",
      "expected": "展示“任务名称”“任务名称复制按钮”“查看详情按钮”“任务SQL按钮”“任务类型”“责任人”“创建时间”“最近修改人”“最近修改时间”“描述”"
    },
    {
      "action": "点击【任务SQL】按钮",
      "expected": "弹【查看SQL】弹窗，展示任务SQL内容，【取消】【复制】【关闭弹窗】按钮"
    },
    {
      "action": "点击【查看SQL】-【复制】按钮",
      "expected": "任务SQL内容复制成功"
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
  test("C077 验证【血缘关系】功能正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
