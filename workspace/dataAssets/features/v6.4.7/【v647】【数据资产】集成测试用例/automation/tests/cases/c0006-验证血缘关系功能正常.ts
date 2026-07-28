// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0006",
  "title": "验证【血缘关系】功能正常",
  "steps": [
    {
      "action": "在数据地图中打开 wwz_001 表详情，点击【血缘关系】按钮",
      "expected": "页面顶部/侧边展示【表级血缘】【字段级血缘】切换按钮；工具栏可见【展示文字信息】【居中】【放大】【放小】【下载】【展示/隐藏导航器】按钮；画布中央显示 wwz_001 表节点"
    },
    {
      "action": "点击【表级血缘】按钮",
      "expected": "画布中显示 wwz_001 的上游节点（wwz_002、wwz_003）和下游节点；上下游节点数量与离线血缘 SQL 一致"
    },
    {
      "action": "查看血缘图提示文案",
      "expected": "页面存在文字”每个节点都可右击查看该节点的全链路血缘，存在逆向可展开节点时建议右击查看~”"
    },
    {
      "action": "点击画布中央的 wwz_001 【表按钮】",
      "expected": "弹出表详情弹窗，弹窗可见"
    },
    {
      "action": "查看表详情弹窗内容",
      "expected": "弹窗中显示”wwz_001”表名及复制按钮；技术属性模块、业务属性模块可见；字段列表展示 id、name 两个非分区字段；页面包含”字段名称”和”字段中文名”搜索框"
    },
    {
      "action": "在搜索框输入字段名”id”，点击搜索",
      "expected": "字段列表过滤后仅显示 id 字段一行，字段类型为 INT，中文名为”用户ID”"
    },
    {
      "action": "在搜索框输入不存在的字段名”xyz_not_exist”，点击搜索",
      "expected": "字段列表区域显示”暂无数据”"
    },
    {
      "action": "调整分页 pagesize（如改为 5/10/20），切换页码",
      "expected": "pagesize 切换后列表行数与所选值一致；页码跳转后数据对应正确，无重复/丢失"
    },
    {
      "action": "点击【字段级血缘】",
      "expected": "画布切换为字段级视图，展示 wwz_001 的所有字段（id、name）及各字段对应的上游字段连线"
    },
    {
      "action": "点击字段”id”节点",
      "expected": "因 wwz_002.id → wwz_001.id 存在血缘，弹出血缘字段面板并显示来源字段信息；点击无血缘字段时提示”字段血缘关系为空”"
    },
    {
      "action": "点击【展示文字信息】按钮",
      "expected": "画布中各节点显示完整表全名（如 database.wwz_001）"
    },
    {
      "action": "点击【居中】按钮",
      "expected": "血缘图在视口内居中展示，画布偏移量归零"
    },
    {
      "action": "点击【放大】按钮",
      "expected": "血缘图比例放大，节点变大"
    },
    {
      "action": "点击【放小】按钮",
      "expected": "血缘图比例缩小，节点变小"
    },
    {
      "action": "点击【下载】按钮",
      "expected": "下载成功，生成 PNG 文件；PNG 内容包含 wwz_001、wwz_002、wwz_003 节点及连线"
    },
    {
      "action": "点击【展示/隐藏导航器】按钮",
      "expected": "导航器小地图在显示/隐藏状态间切换，当前状态与按钮图标一致"
    }
  ]
} as const;

test.describe("验证【血缘关系】功能正常", () => {
  test("C0006 验证【血缘关系】功能正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
