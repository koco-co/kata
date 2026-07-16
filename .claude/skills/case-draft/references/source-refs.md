# SourceRef 规范

case-draft 只使用一种 canonical、内容寻址的 SourceRef：

```text
<kind>:<id>#sha256:<64 位小写十六进制摘要>
```

解析、生成与新鲜度校验统一由 `.claude/scripts/_shared/lib/source-ref/resolvers.ts` 实现。禁止再生成 `prd#...`、`knowledge#...`、`repo#...`、`enhanced#...` 等旧锚点。

## kind 与定位规则

| kind | 用途 | id 示例 |
| --- | --- | --- |
| `prd.file` | feature `inputs/` 中的 PRD | `prd.file:prd.md` |
| `lanhu.fixture` | Lanhu/Axure 抽取快照 | `lanhu.fixture:page-13204` |
| `design.screenshot` | feature `inputs/` 中的设计截图 | `design.screenshot:form-1.png` |
| `user.confirmation` | 用户在当前需求中的明确确认 | `user.confirmation:scope-v1` |
| `knowledge.entry` | workspace knowledge 条目 | `knowledge.entry:modules.data-quality` |
| `repo.line` | 已确认源码仓库、分支与行 | `repo.line:group/repo@branch:path/file.ts:42` |
| `case.archive` | 历史 Archive 证据 | `case.archive:history.md` |
| `workspace.config` | workspace 配置证据 | `workspace.config:env.prod` |
| `command.output` | 可复现命令输出 | `command.output:probe-1` |

完整示例：

```text
prd.file:prd.md#sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
design.screenshot:form-1.png#sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb
repo.line:group/repo@main:src/form.tsx:42#sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc
```

`source-snapshot.json` 使用 FeatureSourceSnapshot@2：`sources[]` 登记本次实际消费的 SourceRef，`required_source_kinds[]` 记录本需求完成前必须覆盖的 kind。不得对所有输入固定要求 Lanhu、knowledge 与 repo；按实际需求源和风险生成策略。

## SR- 注册前缀（SourceRefRegistry@1）

automation `.ts` 文件使用的 `SR-...` 是另一类登记 ID，不是 requirement atom 的 SourceRef。ID 必须匹配 `source-ref-registry.yaml` 的已注册前缀，否则 `kata cases lint` 报 `source_ref_unregistered`。

| 前缀 | 含义 |
| --- | --- |
| `SR-INTENT-*` | case-drafting 识别的 automation intent |
| `SR-ENV-PREFLIGHT-*` | 环境预检证据 |
| `SR-UI-PROBE-*` | 真实 UI 探测证据 |
| `SR-SELF-RUN-*` | 带退出码的自跑证据 |

## 证据分层

SourceRef、`SR-`、`csv::` 只存结构化数据层：`metadata.yaml`、`.process/source-snapshot.json`、`.process/case-evidence-map.json`、`.process/coverage-matrix.json` 等。交付正文 `cases/archive.md`、`cases/archive.draft.md`、`cases/cases.xmind` 不得出现证据定位标识。

Archive 可包含 `<!-- case_id: C... -->` 隐藏标记；它是用例主键，不是证据定位文本。Lanhu/Axure error-fallback 的 `confirmation-package.md`、`unresolved-summary.md` 可按 fallback 契约携带 SourceRef。
