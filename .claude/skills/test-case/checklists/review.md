# 交付前自审

- [ ] 每条用例标题符合统一公式「验证【模块】-【功能点】<操作>，<可观测结果>(条件)」；结果可观测、条件尾随括号，无「在…时」/下划线/通用断言词。
- [ ] `prd/prd.md` 是唯一最终需求文档，`kata prd lint --exit-code` 通过；正文无未决词或失效图片。
- [ ] 蓝湖证据、知识、release 源码和用户决策均可追踪。
- [ ] PRD 使用稳定 `FR/BR/ER/AC/PD` ID；`cases/test-points.md` 逐项引用。
- [ ] `prd_digest` → `meta.test_points_digest` 摘要链有效；`kata cases build` 通过。
- [ ] YAML 是唯一用例源；`source_ref` 落到测试点，明确不覆盖项未混入 YAML。
- [ ] `meta.case_module_id` 存在。
- [ ] `cases/exports/` 全部由本次 build 生成，与 YAML 数量和语义一致。
- [ ] `kata cases lint --exit-code` 通过。
- [ ] 自动化映射无缺失脚本、孤儿脚本或重复映射。
- [ ] 只把跨需求可复用且已确认的规则写回知识库，并重建索引。
- [ ] 交付说明区分已验证事实、假设与未验证范围。
