# 更新：导入、同步与标准化既有用例

## Steps

1. 确认权威源
   - 只编辑 `cases/需求名.yaml`。CSV、XLSX、Markdown、XMind 原件归档到 `cases/imports/` 并先转换为 YAML；`cases/exports/` 不手改。
   - 读取 `prd/prd.md`、`cases/test-points.md` 和当前 YAML；若用户只要求纯格式修复，也要确认不会改变业务语义。
   - 完成条件：输入原件已保留，目标 YAML 唯一，PRD 和测试点是否可用已明确。

2. 判定改动层级
   - 纯格式或派生物修复：不改变 PRD、测试点和摘要。
   - 覆盖设计变化：先更新并确认测试点，再更新 YAML 摘要。
   - 需求语义变化：返回 create workflow 的证据刷新、遗漏扫描、逐问确认和 PRD 发布步骤。
   - 缺少证据的字段、步骤和预期保持原样并在交付时说明，不写未决占位词。
   - 完成条件：每个待改项都归入唯一层级，需要用户决策的语义变化已确认。

3. 修改 YAML 并重建
   - 字段、按钮、Tab、枚举逐字匹配 PRD、知识或源码证据；表单项和两个以上编号项在 YAML 中逐行表达。
   - `automation.spec_file` 只跟随真实脚本；缺脚本时保持 `unmapped`。
   - 批量修改先计算完整变更集，再原子写入 YAML；可独立处理的阻塞条目保持原样并在最终结果中逐条列出。

     ```bash
     kata prd lint --feature <feature-dir> --exit-code
     kata cases build --feature <feature-dir>
     kata cases lint --project <项目> --feature <版本目录/需求目录名> --exit-code
     ```

   - 完成条件：源 YAML、摘要链和声明 exports 一致，三个命令均成功；每个保持原样的条目都有证据缺口说明。
