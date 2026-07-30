# 交付前自审

- [ ] `prd/prd.md` 是唯一最终需求文档，`kata prd lint --exit-code` 通过。
- [ ] 蓝湖证据、知识、release 源码和用户决策均可追踪；正文无 MCP 工作提示、未决词或不存在的图片。
- [ ] PRD 使用稳定 `FR/BR/ER/AC/PD` ID；`cases/test-points.md` 逐项引用。
- [ ] `prd_digest` 与 `meta.test_points_digest` 摘要链有效，`kata cases build` 通过。
- [ ] YAML 是唯一用例源；测试点引用通过 `source_ref` 落到用例，明确不覆盖项未混入 YAML。
- [ ] `meta.case_module_id` 存在；用例标题、优先级、前置条件、步骤和预期符合规范。
- [ ] `cases/exports/` 全部由本次 build 生成，XMind/YAML 数量和语义一致。
- [ ] `kata cases lint --exit-code` 通过；自动化映射没有缺失脚本、孤儿脚本或重复映射。
- [ ] 只把跨需求可复用且已确认的规则写回知识库，并重建索引。
- [ ] 交付说明区分已验证事实、假设与仍未验证范围。
