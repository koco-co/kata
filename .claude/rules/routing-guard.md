## 路由规则

- 使用下方命令索引作为公开 slash-command 路由表。
- 仅输入 Lanhu/Axure URL → 静默转发到 `case-draft`，由 case-draft 产生首个用户可见结果。
- 仅输入 ZenTao bug URL/bug-view URL/bug ID → 转发到 `case-hotfix`；若记录未修复或缺少修复范围，由该 skill 生成待办项而非回退到 `bug-file`。
- 用户提供 XMind/CSV/Archive MD 用例产物路径或要求编辑/同步/标准化已有用例 → 转发到 `case-edit`。
- 用户要求记录、查询、维护项目业务知识/规则/术语，或询问「XX 是什么」（涉及项目特定业务概念）→ 静默触发 `knowledge-curate`。
- `/playwright-automation` 缺少环境参数时，按 skill 内置环境确认协议处理后再开始发现、预检或浏览器操作。

### 多技能匹配优先级

- 精确格式/URL/路径匹配 > 意图关键词匹配 > 通用请求。
- 各 skill 的 `must_not_trigger_when` 优先级高于 `must_trigger_when`；must_not_trigger_when 明确排除的场景不路由到该 skill。
- 同一输入命中多个 skill 且无法判定时，按上述顺序选择优先 skill；仍不确定时向用户确认意图。

### 无匹配回退

- 无 skill 匹配的请求由 AI 自行处理，不强制套用 skill 路由。
- 详细输出契约、回退模板和回归约束见 `.agents/skills/**`、`.claude/skills/**` 与对应测试。
