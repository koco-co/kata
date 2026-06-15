# SourceRef 规范

证据引用的两套记法与分层规则。`source_ref` 锚点语法由 `.claude/scripts/_shared/lib/source-ref.ts` 解析，`SR-` 注册前缀由 `.claude/scripts/_shared/schemas/source-ref-registry.yaml`（SourceRefRegistry@1）登记。本文件是这两者的参照说明，不是硬规则；硬规则仍以 `SKILL.md` 为准。

## source_ref 锚点语法

每个 requirement atom 的 `source_ref` 用 `<scheme>#<anchor>` 表达一处可解析的证据位置：

```text
source_ref ::= <scheme>#<anchor>
scheme     ::= prd | knowledge | repo | enhanced
```

`#` 前后都不能为空；scheme 不在上表内（如已废弃的 `plan#...`）一律判非法。

### prd

`prd#<anchor>` —— anchor 解析为 PRD（`prd.md`）某个标题。标题先归一化为 slug（转小写、空格转 `-`、保留中文与 `.-`），anchor 同样归一化后比对；命不中精确 slug 时，再按「标题包含 anchor」做一次模糊匹配。

- `prd#section-2.1.3`
- `prd#2.1.3`（命中标题「2.1.3 审批状态字段定义」）
- `prd#审批状态字段定义`

### knowledge

`knowledge#<type>.<name>` —— 指向 `workspace/{project}/_shared/knowledge/` 下的知识入口。`type` 仅允许 `overview`、`term`、`module`、`pitfall`；解析时按 `<type>.md`、`<type>/`、`<type>s.md`、`<type>s/` 依次找入口文件或目录。`name` 段是给人读的定位，可带点号继续细分。

- `knowledge#overview.数据源默认`
- `knowledge#term.审批.中文解释`
- `knowledge#module.数据质量`

### repo

`repo#<path>(:L<start>(-L<end>)?)` —— 指向只读源仓库里的文件或行区间。`path` 的首段是 repo 短名，映射到调用方传入的 repos 表，或回落到 `workspace/{project}/.kata/repos/<path>`；行号可省略，也可写单行或区间。

- `repo#studio/src/approval/list.tsx`
- `repo#studio/src/approval/list.tsx:L3`
- `repo#studio/src/approval/list.tsx:L45-L60`

源仓库一律只读，引用不改变这一约束（见 `.claude/rules/repo-readonly.md`）。

### enhanced

`enhanced#<anchor>` —— 指向增强需求文档（`enhanced.md`）里的 `<a id="<anchor>"></a>` 锚点。anchor 形态：

- `s-<level>`：顶级小节，如 `s-1`、`s-2`
- `s-<level>-<index>-<uuid>`：子小节，`uuid` 为 4 位十六进制，如 `s-2-1-a1b2`
- `q<n>`：待确认问题，如 `q7`
- `source-facts`：源码事实附录

锚点格式合法但 `enhanced.md` 里找不到对应 `<a id>` 时，按未命中处理。

## SR- 注册前缀（SourceRefRegistry@1）

automation 用例的 `.ts` 文件用 `SR-...` ID 标注证据来源，ID 必须匹配某个已注册前缀，否则 `kata cases lint` 报 `source_ref_unregistered`。格式为 `SR-<前缀>-<标识>`（正则 `SR-[A-Z][A-Z-]*-[A-Z0-9-]+`）。当前登记的前缀：

| 前缀 | 含义 | 产出方 → 消费方 |
| --- | --- | --- |
| `SR-INTENT-*` | case-drafting 阶段识别的 automation intent | case-draft（automation-handoff）→ playwright-automation |
| `SR-ENV-PREFLIGHT-*` | 环境预检证据 | playwright-automation（env-preflight） |
| `SR-UI-PROBE-*` | 真实 UI 探测证据 | playwright-automation（ui-probe） |
| `SR-SELF-RUN-*` | 带退出码的自跑证据 | playwright-automation（self-run） |

新增前缀先在 `source-ref-registry.yaml` 登记，再在用例中使用。

## 证据分层

`source_ref`、`SR-`、`csv::` 这类证据定位标识只存结构化数据层——`metadata.yaml`、RequirementAtom@1、CaseEvidenceMap@1、CoverageMatrix@1、`source_refs.json` 等。交付正文（`cases/archive.md`、`cases/archive.draft.md`、`cases/cases.xmind`）只放人类可读用例内容，不得出现任何 SourceRef 标识。Lanhu/Axure error-fallback 下的 `cases/confirmation-package.md`、`cases/unresolved-summary.md` 是例外，按 fallback 约定本就携带这些引用。
