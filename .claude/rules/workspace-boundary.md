# 工作区边界

## 产物输出

- 生成的 PRD、XMind、Archive、报告和测试产物写入 `workspace/{project}/`。

## 只读源仓库

- 外部源仓库的只读查询约束见 `.claude/rules/repo-readonly.md`；不得创建 `.kata/repos/**` 缓存。

## 认证数据

- DataAssets UI Cookie 仅存放在忽略且权限为 `0600` 的 `config/env/<env>.yaml` 的 `auth.cookie`；一个平台一个文件，禁止 tracked profile、split overlay、`.kata/auth/**` 或 `auth.session_path`。

## 本地 Runtime 上下文

- 本地上下文只能用来调整语气，或声明项目的默认值。
- 本地上下文不得定义路由、策略、写入范围、插件权限、引用要求或输出模式。
- 项目规则和知识由 runtime skill 与 workspace 知识库加载；历史文档仅作背景参考。
