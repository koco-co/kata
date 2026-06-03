# 工作区边界

## 产物输出

- 生成的 PRD、XMind、Archive、报告和测试产物写入 `workspace/{project}/`。

## 只读证据

- 源仓库（`workspace/{project}/.kata/repos/**`）的只读约束见 `.claude/rules/repo-readonly.md`。

## 本地 Runtime 上下文

- 本地上下文只能用来调整语气，或声明项目的默认值。
- 本地上下文不得定义路由、策略、写入范围、插件权限、证据要求或输出模式。
- 项目规则和知识由 runtime skill 与 workspace 知识库加载；历史文档只作背景输入。
