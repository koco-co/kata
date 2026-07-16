# Quality 评审 Prompt — playwright-automation

派全新子代理执行。只审查 artifact 内容质量，不重复 spec 评审的结构检查，专注脚本内容质量。

## 必须遵守的规则优先

你的检查项不得违反 `SKILL.md` 中必须遵守的规则。检查项与这些规则冲突时，记为 `out_of_scope`，而不是 `issue`。

## 检查项

### 选择器稳定性

- 标记无说明的位置选择器，或缺乏 UI 证据时把 `.nth()` 当主策略；允许有说明的 strict-mode narrowing
- 标记 XPath `text()`、宽泛 `page.locator("text=...")`，或对非唯一标签使用 text-only locator；不要误伤合法 `getByText`
- 优先 `data-testid`、ARIA role + name、可见 label
- 同一 page object 中 selector 必须按业务命名分组

### 断言强度

- 标记无文档说明的 `page.waitForTimeout(<ms>)` 硬延时；允许有注释的框架 transition 或 render-frame 等窄例外
- 禁止 `try/catch` 吞失败
- 禁止 `test.skip()` 掩盖未确认行为
- 断言必须验证用户可见状态或业务结果；仅不明显的技术性断言需要语义注释

### 步骤与断言的真实性（fidelity）

逐条核对生成 spec 的动作和断言，与源用例的 `steps`、`expected_visible_result`、`assertions` 是否对得上：

- 用例含创建/导入/运行/下载等业务动作步骤，但 spec 只有导航 + 可见性断言、零状态变更动作 → high
- spec 用 `toBeVisible`/`toContainText` 等代替了用例写明的 `expected_visible_result` → high
- 业务流程用例被简化成「进页面看元素在不在」，只测页面表层、不测业务结果 → high

high 必须修；当前环境确实无法真实实现的用例，须如实排除，记入 `handoff.excluded_cases`，不得表面通过蒙混过去。

### UI-only 业务变更与规则审计

- 创建、编辑、保存、导入、运行、发布、映射、删除或状态检查通过 `page.request`、`fetch`、axios 或业务 API helper 代替页面操作，且没有用户对该具体动作的书面授权 → high
- API 被动监听、只读 oracle 或用户明确授权的具体动作不误报；授权证据必须进入 handoff
- 规则类 case 缺少逐项源规格审计，或提交的规则数量、重复指纹、规则包、数据源、抽样、分区、过滤、强弱设置与源用例不一致 → high
- 状态变化 case 没有唯一记录名称/ID、状态、路由和截图或 Allure 证据 → high

### 修复

- repair-loop 的修复不得在原 case 文件中添加 wider locator
- 修复不得绕过断言，必须解决根因

### Page Object 复用度

- 同一交互模式在两个 case 出现 → 必须抽到 `_shared/pages/`
- helper 不得 import 测试断言库

## 输出格式

返回 JSON：

```json
{
  "quality_review_status": "pass | fail",
  "issues": [
    {
      "severity": "high | medium | low",
      "category": "selector | assertion | repair | reuse | fidelity",
      "where": "<file>:<line>",
      "evidence": "...",
      "fix_hint": "..."
    }
  ],
  "out_of_scope": []
}
```

`quality_review_status=fail` 当且仅当存在 high issue；pass 时只能包含 medium 或 low 这类提示性 issue。
high 必须修；medium 和 low 标记出来即可通过。
