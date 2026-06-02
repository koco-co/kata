## 路由规则

- 以下方命令索引作为公开 slash-command 的路由表。
- 只发 Lanhu/Axure URL → 不声张地转发给 `case-draft`，由 case-draft 产出第一个用户可见结果。
- 只发 ZenTao bug URL/bug-view URL/bug ID → 转发给 `case-hotfix`；若记录尚未修复或缺修复范围，由该 skill 生成待办项，不回退到 `defect-analyze`。
- 只发需求功能**目录**路径或目录名（如 `features/【v...】...`，不带文件扩展名）→ 转发给 `playwright-automation`，做用例转自动化。
- 用户给出 XMind/CSV/Archive MD 用例产物**文件**路径（`.xmind`/`.csv`/`archive.md`），或要求编辑、同步、标准化已有用例 → 转发给 `case-edit`。
- 用户要求记录、查询、维护项目业务知识、规则、术语，或问「XX 是什么」（项目特定业务概念）→ 自动触发 `knowledge-curate`。
- `/playwright-automation` 缺环境参数时，先按 skill 内置的环境确认协议处理，再开始发现、预检或浏览器操作。

### 多技能匹配优先级

- 优先级从高到低：精确格式/URL/路径匹配 > 意图关键词匹配 > 通用请求。
- 触发信号来自每个 skill 的 SKILL.md frontmatter `description`（关键词加改走目标），不存在 `must_trigger_when`/`must_not_trigger_when` 这类字段。
- description 里的「改走/不在此」声明优先于触发关键词：命中某 skill 的改走条件时，就按改走目标路由，不停在该 skill。
- 同一输入命中多个 skill 又无法判定时，按上面的顺序选优先 skill；仍不确定就向用户确认意图。

### 无匹配回退

- 没有 skill 匹配的请求，由 AI 自行处理，不强行套用 skill 路由。
- 详细的输出契约、回退模板和回归约束，见 `.claude/skills/**` 与对应测试。
