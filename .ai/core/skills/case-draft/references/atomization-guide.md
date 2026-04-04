# Atomization Guide
## 读取时机
requirement-atomize 阶段读取。在 source_refs 与 HistoricalContextPack 就绪后使用。
## 输入
- source_snapshot、source_refs、extracted_text、interaction_hints。
- HistoricalContextPack、项目知识库术语、产品反馈记录。
## 输出
- RequirementAtomList。
- 每个 atom 必须包含 id、statement、source_refs、evidence_kind、ambiguity_class、confidence、scope_hint。
- evidence_kind 只使用 product_confirmed、lanhu_observed、history_inferred、tester_assumption。
## 禁止
- 不得生成没有 source_ref 的 atom。
- 不得把多个独立行为合并成一个不可追溯 atom。
- 不得省略 evidence_kind、ambiguity_class 或 confidence。

## Output: write requirement_atoms to manifest.json

After atomization completes, write each atom to `features/<featureId>/manifest.json#case_drafting.requirement_atoms[]`:

```json
{
  "id": "RA-001",
  "source_ref": "prd.file:section-1#sha256:..."
}
```

The CLI helper `kata features lint` validates that manifest schema matches `FeatureManifest@2` (Phase 1 schema). Do not write atoms into archive.md alone; archive.md is rendered from manifest.
