# Codex Skill 维护方式

## 目录边界

Claude Code 与 Codex 使用不同的提示词正文：

```text
.claude/skills/<name>/     Claude Code Skill
.agents/skills/<name>/     Codex Skill
.claude/scripts/_shared/   两边暂时共用的 CLI、Schema 与运行代码
```

`case-draft` 与 `playwright-automation` 已改为 Codex 原生目录。修改这些目录不会改变 `.claude/skills/**`。

尚未迁移的 Skill 暂时保留指向 Claude 目录的兼容软链接。每迁移一个 Skill，都要同时完成：

1. 将对应 `.agents/skills/<name>` 软链接换成真实目录。
2. 删除 Claude 专用模型名、工具名、固定代理拓扑和机械步骤。
3. 保留触发条件、输入输出、安全边界、状态和项目独有规则。
4. 为原生目录增加结构检查和最小合同测试。
5. 更新中英文 README 与变更记录。

## 原生 Skill 的正文

一份 Codex Skill 应优先说明：

- 何时使用，何时交给其他 Skill。
- 哪些输入会改变范围，哪些缺口可以标记后继续。
- 产物目录、文件格式和状态名称。
- 删除、写入共享环境、凭据处理等不可越过的边界。
- 哪些结果必须真实运行后才能声明。

不要写入：

- 固定模型名。
- 固定子代理数量或模型分工。
- 与任务规模无关的长阶段清单。
- 可由 CLI、Schema 或 lint 稳定检查的机械规则。
- Claude Code 专用工具名。

## 检查

```bash
bun run lint:skills:codex
bun run lint:agents
bun run lint:docs
```

Codex lint 接受两种合法入口：列入原生清单的真实目录，以及尚未迁移、目标正确的兼容软链接。原生 Skill 中出现 Claude 专用工具名或固定 Claude 模型名时，检查失败。
