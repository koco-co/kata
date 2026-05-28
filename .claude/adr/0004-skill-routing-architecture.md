# ADR-0004: Skill 路由架构

**状态**: 已采纳  
**日期**: 2026-05-11，2026-05-28 更新
**关联**: AGENTS.md / CLAUDE.md 路由规则, `.claude/contracts/routes/*.yaml`

## 背景

用户在 Claude Code 或 Codex 中输入自然语言时，系统需要判断该输入对应哪个 product skill。早期依赖简单的关键词匹配，导致以下问题：

1. **误路由**：用户提供 ZenTao bug URL 时被路由到 bug-file 而非 case-hotfix。
2. **多技能冲突**：用户提供 XMind 路径并要求生成 Playwright 脚本时，case-edit 和 playwright-automation 都可能匹配。
3. **静默路由**：部分场景需要静默处理（如 knowledge-curate 的查询），用户不应感知路由过程。

## 决策

采用三层路由架构：

### 第一层：触发条件 (`must_trigger_when` / `must_not_trigger_when`)

每个 skill 在 `.claude/contracts/routes/<skill>.yaml` 中声明：
- `must_trigger_when`：明确应当路由到此 skill 的场景。
- `must_not_trigger_when`：明确不应路由到此 skill 的场景（优先级高于 `must_trigger_when`）。

### 第二层：匹配优先级

```
精确格式/URL/路径匹配 > 意图关键词匹配 > 通用请求
```

### 第三层：路由规则（AGENTS.md / CLAUDE.md）

在 `CLAUDE.md` 中定义明确的转发规则：

| 输入 | 目标 Skill |
|------|-----------|
| Lanhu/Axure URL | case-draft |
| ZenTao bug URL/ID | case-hotfix |
| XMind/CSV/Archive 路径 | case-edit |
| 业务知识询问 | knowledge-curate |
| `/playwright-automation` | playwright-automation |
| 其他 | AI 自行处理 |

### 多技能冲突处理

- `must_not_trigger_when` 优先级高于 `must_trigger_when`。
- 同一输入命中多个 skill 时按上述优先级选择。
- 仍不确定时向用户确认意图。

### 无匹配回退

无 skill 匹配的请求由 AI 自行处理，不强制套用 skill 路由。

## 理由

1. **减少误路由**：`must_not_trigger_when` 提供了反向排除机制，比正向匹配更可靠。
2. **路由可测试**：每个 skill 的触发条件定义在 route contract 中，可以编写回归测试验证路由行为。
3. **用户透明**：静默路由（如 knowledge-curate 查询）不会打断用户工作流。
4. **渐进增强**：现有未被路由的请求退化为 AI 自行处理，不会产生功能回退。

## 后果

- 新增 skill 时必须明确定义 route contract、graph entry 和 runtime skill。
- `must_not_trigger_when` 中的场景需要与其他 skill 协商以避免重复。
- 路由规则变更需要同步更新 `AGENTS.md`、`CLAUDE.md` 和 `.claude/contracts/routes/*.yaml`。

## 关联

- `AGENTS.md` / `CLAUDE.md` — 命令索引和路由规则
- `.claude/contracts/routes/*.yaml` — 各 skill 的触发条件
- `engine/src/skills/route-check.ts` — 路由契约检查
