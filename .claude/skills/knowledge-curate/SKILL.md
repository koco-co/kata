---
name: knowledge-curate
description: 查询、记录或维护项目业务知识、规则、术语、模块事实，或问「XX 是什么」(项目业务概念)，统一记录于 _shared/knowledge/。触发短语如「记一下这个规则」「XX 术语什么意思」「更新模块知识」。只问源码实现细节，或要写编用例、扫 diff、做 UI 自动化的改走对应 case-*/defect-analyze/playwright-automation。
argument-hint: '<业务术语 | 规则描述 | "XX 是什么">'
user-invocable: true
model: sonnet
effort: medium
---

# knowledge-curate

查询与维护项目业务知识：把业务事实 / 规则 / 术语记录到 `workspace/{project}/_shared/knowledge/`，查询时回指证据。

## 路由边界

description 已覆盖触发场景；此处只说明改走目标：

- 纯源码实现细节问答（非业务知识）→ 由 AI 直接答。
- 生成或编辑用例 → case-*。

## 工作流

1. 查询：在 `workspace/{project}/_shared/knowledge/**` 检索命中条目并回指其 SourceRef ID；无可靠命中时明说「知识库无已确认匹配」，不臆造。
2. 写入前读 `references/knowledge-rules.md`，按分类规约落盘；低置信度更新先与用户确认。

## 何时加载哪个文件

| 文件 | 何时读 | 作用 |
| --- | --- | --- |
| references/knowledge-rules.md | 查询或写入知识条目前 | 分类规约、分仓边界与记录流程 |

## 硬规则（不变量）

- 业务知识存于 `workspace/{project}/_shared/knowledge/**`，项目规则存于 `workspace/{project}/_shared/rules/**`——两者分仓，不混写。
- 未明确选定项目前不得跨项目编辑知识——跨项目写入会污染其它项目的知识库。
- 查询结果回指知识条目的 SourceRef ID；无证据支撑的根因/事实不写入。
