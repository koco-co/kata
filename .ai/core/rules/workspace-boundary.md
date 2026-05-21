# 工作区边界

## 产物输出

- 生成的 PRD、XMind、Archive、报告和测试产物写入 `workspace/{project}/`。

## 只读证据

- `workspace/{project}/.kata/repos/**` 为只读证据源，kata 工作流不得推送、提交或修改源仓库。

## 投影系统

- Runtime 投影从 `.ai/core/**` 生成；编辑 `.ai/core` 源契约后运行 `bun engine/bin/kata ai-core projection render`。
- `.claude/` 与 `.agents/` 是 runtime 投影目录，不得作为源直接编辑。

## Runtime Context

- Local context 只能个性化语气或声明的项目默认值。
- Local context 不得定义路由、策略、写范围、插件权限、证据要求或输出模式。
- 项目规则和知识通过声明的 `.ai/core` 上下文通道加载；文档仅为历史输入。
