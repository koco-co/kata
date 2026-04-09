# Case Review Evidence Gates
## 读取时机
case-review 与 output 阶段读取。用来判定草稿能否成为最终 archive.md 与 cases.xmind。
## 输入
- DraftCaseSet、CoverageMatrix、source_refs_json、EnhancedPrd。
- CaseReviewReport、blocking_pending.count。
## 输出
- unsupported_claims、blocking_unknown_in_final_steps、history_inferred_as_product_confirmed 的审查结果。
- archive.md、cases.xmind，或 archive.draft.md、unresolved-summary.md。
## 禁止
- 不得保留 unsupported_claims 后输出最终用例。
- 不得把 history_inferred 标成 product_confirmed。
- 不得在 blocking pending 非 0 时输出 archive.md 或 cases.xmind。
