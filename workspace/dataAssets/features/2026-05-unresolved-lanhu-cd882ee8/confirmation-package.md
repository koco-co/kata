## 原始 URL

```
https://lanhuapp.com/web/#/item/project/product?tid=24a1c6b2-a52e-454c-8d51-8aff866598b1&pid=7de90493-e80f-4592-a263-38fb2d2e98c0&versionId=84d0f3b9-9e0a-4416-be96-865ca70a7350&docId=fc0fee93-74f5-4eff-a769-99e68506b296&docType=axure&pageId=cd882ee83c4d440d878b49cc31f67cb6
```

## URL 参数

| 参数 | 值 |
|------|-----|
| tid | `24a1c6b2-a52e-454c-8d51-8aff866598b1` |
| pid | `7de90493-e80f-4592-a263-38fb2d2e98c0` |
| versionId | `84d0f3b9-9e0a-4416-be96-865ca70a7350` |
| docId | `fc0fee93-74f5-4eff-a769-99e68506b296` |
| docType | `axure` |
| pageId | `cd882ee83c4d440d878b49cc31f67cb6` |

## SourceRefs

### SR-LANHU-URL-001
- **内容**: 见上方原始 URL
- **类型**: lanhu.url@1

### SR-USER-INFO-001
- **内容**: 用户提供功能名称“岚图 DQ 规则集”，模块 `dq`
- **前端**: `customltem/dt-insight-studio@dataAssets/release_6.3.x_ltqc`
- **后端**: `customltem/dt-center-assets@release_6.3.x_ltqc`
- **类型**: user.input@1

### SR-PAGEID-SEARCH-001
- **搜索 token**: `cd882ee83c4d440d878b49cc31f67cb6`
- **搜索范围**: `workspace/*/features -g "prd.md" -g "metadata.yaml" -g "manifest.json"`
- **命中数量**: 0

### SR-DOCID-SEARCH-001
- **搜索 token**: `fc0fee93-74f5-4eff-a769-99e68506b296`
- **搜索范围**: `workspace/*/features -g "prd.md" -g "metadata.yaml" -g "manifest.json"`
- **命中数量**: 5
- **命中样例**:
  - `workspace/dataAssets/features/2026-04-dq-builtin-completeness-json-key-range/prd.md`
  - `workspace/dataAssets/features/2026-05-unresolved-lanhu-7afabbf5/metadata.yaml`
  - `workspace/dataAssets/features/2026-04-dq-builtin-validity-json-value-format/prd.md`
  - `workspace/dataAssets/features/2026-04-dq-builtin-validity-multi-rule-logic/prd.md`
  - `workspace/dataAssets/features/2026-04-general-json-config/prd.md`

### SR-PID-SEARCH-001
- **搜索 token**: `7de90493-e80f-4592-a263-38fb2d2e98c0`
- **搜索范围**: `workspace/*/features -g "prd.md" -g "metadata.yaml" -g "manifest.json"`
- **命中数量**: 23
- **命中样例（前 5）**:
  - `workspace/dataAssets/features/2026-04-dq-builtin-reasonability-field-calc-compare/prd.md`
  - `workspace/dataAssets/features/2026-04-dq-rule-set-per-table/prd.md`
  - `workspace/dataAssets/features/2026-04-dq-per-rule-toggle-v2/prd.md`
  - `workspace/dataAssets/features/2026-04-dq-multi-rule-task-per-table/prd.md`
  - `workspace/dataAssets/features/2026-04-dq-report-field-dimension-scope/prd.md`

### SR-ADJACENT-001
- **类型**: neighbor_feature
- **说明**: 相邻 feature `workspace/dataAssets/features/2026-05-unresolved-lanhu-7afabbf5/metadata.yaml` 命中同 docId `fc0fee93-74f5-4eff-a769-99e68506b296`，不同 pageId `7afabbf5f0cf4d0680704ab3b5f20295`

### SR-PLUGIN-CHECK-001
- **工具**: `bun engine/bin/kata plugin-loader check`
- **observed_result**: `{ "matched": false }`
- **inferred_reason**: 无

### SR-CASE-DRAFT-START-001
- **工具**: `bun engine/bin/kata case-draft start --dry-run --json`
- **observed_result**: project=`dataAssets`，source.kind=`lanhu_url`，plugin.name=`lanhu`，plugin.active=`false`
- **inferred_reason**: 无

### SR-FETCH-FAIL-001
- **工具**: `mcp__fetch__fetch_html`
- **observed_error**: `user cancelled MCP tool call`
- **inferred_reason**: 无

### SR-LANHU-PLUGIN-FETCH-001
- **工具**: `bun run plugins/lanhu/fetch.ts`
- **observed_error**: `KATA_LANHU_COOKIE 未配置且自动登录失败。请配置 KATA_LANHU_USERNAME/KATA_LANHU_PASSWORD 或手动设置 KATA_LANHU_COOKIE。`
- **inferred_reason**: 无

## 项目推断

根据 SR-USER-INFO-001 与 SR-DOCID-SEARCH-001 / SR-PID-SEARCH-001，project = `dataAssets`。

## 模块推断

根据 SR-USER-INFO-001，module = `dq`。

## 需要用户补充的信息

- 设计内容（截图或 Axure 导出 PRD）

## 可选后续材料

- 无
