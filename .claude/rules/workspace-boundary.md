# 工作区边界

## 产物输出

- 生成的 PRD、XMind、Archive、报告和测试产物写入 `workspace/{project}/`。

## 只读证据

- `workspace/{project}/.kata/repos/**` 为只读证据源，kata 工作流不得推送、提交或修改源仓库。

## Runtime Context

- Local context 只能个性化语气或声明的项目默认值。
- Local context 不得定义路由、策略、写范围、插件权限、证据要求或输出模式。
- 项目规则和知识通过 runtime skill 与 workspace 知识库加载；历史文档仅作背景输入。
