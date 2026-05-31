---
name: knowledge-curate
description: 查询、记录或维护项目业务知识、规则、术语与模块事实，统一沉淀于 workspace/{project}/_shared/knowledge/。用户问「XX 是什么」或要写入业务规则时用。
when_to_use: 触发短语如「记一下这个规则」「XX 术语什么意思」「更新模块知识」。只问源码实现细节、或要写编用例、扫 diff、做 UI 自动化的不在此。
user-invocable: true
model: sonnet
effort: medium
paths:
  - "workspace/**/_shared/knowledge/**"
---

# knowledge-curate

查询与维护项目业务知识：把业务事实 / 规则 / 术语沉淀到 `workspace/{project}/_shared/knowledge/`，查询时回指证据。

## 路由边界

- 触发：记录 / 更新 / 写入业务知识、规则、术语；查询业务概念或「XX 是什么」。
- 改走：纯源码实现细节问答（非业务知识）→ 由 AI 直接答；生成或编辑用例 → case-*。

## 工作流

1. 查询：在 `workspace/{project}/_shared/knowledge/**` 检索命中条目并回指其 SourceRef ID；无可靠命中时明说「知识库无已确认匹配」，不臆造。
2. 写入前读 `references/knowledge-rules.md`，按分类规约落盘；低置信度更新先与用户确认。

## 何时加载哪个文件

| 文件 | 何时读 | 作用 |
| --- | --- | --- |
| references/knowledge-rules.md | 查询或写入知识条目前 | 分类规约、分仓边界与沉淀流程 |

## 硬规则（不变量）

- 业务知识存于 `workspace/{project}/_shared/knowledge/**`，项目规则存于 `workspace/{project}/_shared/rules/**`——两者分仓，不混写。
- 未明确选定项目前不得跨项目编辑知识。
- 查询结果回指知识条目的 SourceRef ID；无证据支撑的根因/事实不写入。
