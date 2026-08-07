# 交付前自审

- [ ] 用例标题模版: 验证【模块】-【功能点】<操作>，<可观测结果>(条件)
- [ ] `kata prd lint --exit-code` 通过
- [ ] 澄清清单每条判定落 `session.json`：`asked` 已答、`skipped`/`self-resolved` 有理由或结论
- [ ] `kata cases build` 通过
- [ ] `kata cases lint --exit-code` 通过
- [ ] `cases/test-points.md` 逐项引用 PRD 稳定 ID
- [ ] 每条用例 `source_ref` 落到测试点；不覆盖项不得出现在用例里
- [ ] 中文报错/提示文案与前后端源码逐字符核对（导入导出、逆向条件、xlsx 单元格报错优先），英文文案不纳入
- [ ] 源码捕获的报错场景全部覆盖到用例，不得留「待核实」遗留
- [ ] 只把跨需求可复用且已确认的规则写回知识库，并重建索引
- [ ] 交付说明区分已验证事实、假设与未验证范围
