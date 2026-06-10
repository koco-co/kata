---
name: knowledge-curate
description: 查询、记录或维护项目业务知识、规则、术语、模块事实，或问「XX 是什么」(项目业务概念)，统一记录于 _shared/knowledge/。触发短语如「记一下这个规则」「XX 术语什么意思」「更新模块知识」。只问源码实现细节，或需要编写用例、扫描 diff、做 UI 自动化，请转至对应 case-*/defect-analyze/playwright-automation。
argument-hint: '<业务术语 | 规则描述 | "XX 是什么">'
user-invocable: true
model: sonnet
effort: medium
---

# knowledge-curate

查询与维护项目业务知识：把业务事实、规则、术语记录到 `workspace/{project}/_shared/knowledge/`，查询时引用证据。

## 路由边界

以下场景不属本 skill 范围，请转至对应 skill：

- 纯源码实现细节问答（非业务知识）→ 由 AI 直接回答
- 生成或编辑用例 → case-*

## 工作流

1. 查询：在 `workspace/{project}/_shared/knowledge/**` 检索命中条目，并引用它的 SourceRef ID；没有可靠命中时直接说明「知识库无已确认匹配」，不要臆造。
2. 写入前先读 `references/knowledge-rules.md`，按分类规则落盘；置信度低的更新先和用户确认。

## 何时加载哪个文件

| 文件 | 何时读 | 作用 |
| --- | --- | --- |
| references/knowledge-rules.md | 查询或写入知识条目前 | 分类规则、分仓边界和记录流程 |

## 存储规范

- 业务知识存放于 `workspace/{project}/_shared/knowledge/**`，项目规则存放于 `workspace/{project}/_shared/rules/**`。两者分仓存放，不得混写。
- 未明确选定项目前，不得跨项目编辑知识。
- 查询结果必须引用知识条目的 SourceRef ID；没有证据支撑的根因和事实不予写入。
