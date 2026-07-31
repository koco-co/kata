---
title: TreeSelect / Select 用搜索框过滤，不要逐层展开滚动
type: pitfall
tags: []
status: observed
source: 历史知识条目；原始证据未登记，2026-07-31 已降级为 observed
updated: 2026-07-31
---

# TreeSelect / Select 用搜索框过滤，不要逐层展开滚动

## 症状
- 校验 key TreeSelect 数据规模较大（树节点几百~上千）时，脚本逐层展开 + scroll 找节点超时
- `Test timeout of 60000ms exceeded` 在 `selectJsonKeys` / 配置 key 范围规则的步骤里
- 即便没 timeout，单条用例也跑得慢（每个 key 找 2-5s，10 个 key 要 30s+）

## 复现条件
- archive MD 描述包含「校验key 选择 N 个」（N≥3）
- 测试表 JSON 字段实际有几十~几百 key（如 `test_json_value_format` 一层 30+ key、二层带嵌套）
- helper 实现按"展开 → 滚动 → 找节点 click"路径

## 根因
Ant Design TreeSelect / Select dropdown 顶部内置 search input。展开 dropdown 后输入关键字，组件会自动过滤树节点（前端 local filter 或后端 onSearch 回调），目标节点立刻可见，无需逐层展开。

`dropdown.locator("input").first()` 对单 input 场景能拿到搜索框，但当 dropdown 内多 input（如有 footer 操作输入框）时可能拿错。需精确选择器：
- `input.ant-select-tree-input`（TreeSelect 标准 search input class）
- `.ant-select-tree-search input`（包裹层路径）
- `input[type='search']`（HTML 语义层）
- `input:visible` 备选(最弱选择)

## 修复 diff
```diff
  for (const keyName of keyNames) {
-   // 展开根节点 + 逐层 expand
-   const expanders = dropdown.locator(".ant-select-tree-switcher").all();
-   for (const expander of await expanders) {
-     await expander.click().catch(() => undefined);
-     await page.waitForTimeout(200);
-   }
-   // 然后 scroll 找节点
-   const node = dropdown.locator(".ant-select-tree-title").filter({ hasText: keyName });
-   await node.scrollIntoViewIfNeeded();
-   await node.click();
+   // 用搜索框过滤（最快）
+   const searchInput = dropdown
+     .locator("input.ant-select-tree-input, .ant-select-tree-search input, input[type='search']")
+     .first()
+     .or(dropdown.locator("input:visible").first());
+   if (await searchInput.isVisible({ timeout: 1000 }).catch(() => false)) {
+     await searchInput.fill(keyName);
+     await page.waitForTimeout(400);
+   }
+   const node = dropdown.locator(".ant-select-tree-title").filter({ hasText: keyName }).first();
+   await expect(node).toBeVisible({ timeout: 5000 });
+   await node.locator("xpath=ancestor::*[contains(@class,'ant-select-tree-treenode')][1]")
+     .locator(".ant-select-tree-checkbox").first().click();
+   // 多 key：清空再下一轮
+   await searchInput.fill("");
+   await page.waitForTimeout(200);
  }
```

## 验证
现 15693 `selectJsonKeys` (key-range-utils.ts:688-795) 已用搜索框模式，建议 15694 `json-format-suite-helpers.ts` 与 15695 `rule-editor-helpers.ts` 在 subagent A 重生脚本时对齐 G8 模式。

## 关联硬规则
ui-autotest-pitfalls.md#G8

## 关联截图
用户 2026-04-27 反馈截图显示规则集管理 → 编辑规则集 → Step 2 → 添加规则 → 校验内容 TreeSelect 顶部含搜索框，输入 "key123" 立刻过滤树节点（来源：用户对话截图 #2）
