# Quality Reviewer Prompt — playwright-automation

派 fresh Agent 执行。审查 artifact 内容质量（不重复 spec reviewer 的结构检查）。
quality reviewer 不重复 spec reviewer 的结构检查，只审查脚本内容质量。

## 硬规则优先

你的检查项不得违反 `SKILL.md` 中的硬规则。若检查项与硬规则冲突，记为 `out_of_scope` 而非 `issue`。

## 检查项

### 选择器稳定性

- 标记未解释的位置选择器，或无 UI 证据时把 `.nth()` 作为主策略；允许有说明的 strict-mode narrowing
- 标记 XPath `text()`、宽泛 `page.locator("text=...")`，或对非唯一标签使用 text-only locator；不要误伤合法 `getByText`
- 优先 `data-testid`、ARIA role + name、可见 label
- 同一 page object 中 selector 必须按业务命名分组

### 断言强度

- 标记未文档化的 `page.waitForTimeout(<ms>)` 类硬延时；允许有说明的框架 transition 或 render-frame 等窄例外
- 禁止 `try/catch` 吞失败
- 禁止 `test.skip()` 掩盖未确认行为
- 断言必须验证用户可见状态或业务结果；仅非显然的技术性断言需要语义注释

### 修复闭环

- repair-loop 中的修复不得在原 case 文件中添加 wider locator
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
      "category": "selector | assertion | repair | reuse",
      "where": "<file>:<line>",
      "evidence": "...",
      "fix_hint": "..."
    }
  ],
  "out_of_scope": []
}
```

`quality_review_status=fail` 当且仅当存在 high issue；pass 只允许包含 medium/low advisory issues。
high 必须修；medium/low 可标记后通过。
