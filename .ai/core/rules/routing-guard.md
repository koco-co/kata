## 路由规则

- 使用下方命令索引作为公开 slash-command 路由表。
- 仅输入 Lanhu/Axure URL → 静默转发到 `case-draft`，由其产生首个用户可见结果。
- 仅输入 ZenTao bug URL/bug-view URL/bug ID → 转发到 `case-hotfix`；若记录未修复或缺少修复范围，由该 skill 生成待办项而非回退到 `bug-file`。
- `/playwright-automation` 缺少环境参数时，按 skill 内置环境确认协议处理后再开始发现、预检或浏览器操作。
- 详细输出契约、回退模板和回归约束见 `.ai/core/skills/**` 与对应测试；本入口保持精简以控制会话 token 消耗。
