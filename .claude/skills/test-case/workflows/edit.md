# 编辑：修改、同步、标准化既有用例

## 1. 确认权威源

只编辑 `cases/需求名.yaml`。CSV/XLSX/Markdown/XMind 原件归档到 `cases/imports/`，先转换为 YAML；`cases/exports/` 禁止手改。

## 2. 区分改动性质

- 纯格式或派生物修复：不改变 PRD、测试点和摘要。
- 覆盖设计变化：先更新并确认 `cases/test-points.md`，再更新 YAML 的 `meta.test_points_digest`。
- 需求语义变化：回到 create 的证据刷新、遗漏扫描、逐问确认和 PRD 发布流程；PRD 更新后重新确认测试点。

`prd/prd.md` 是需求事实来源。缺少证据的字段、步骤和预期逐个确认，不能确认的条目维持原样并在交付时说明；不得写「待确认」或「用户确认补充」。

## 3. 修改和重建

- 字段、按钮、Tab、枚举逐字匹配 PRD/知识/源码证据。
- 表单项和两个以上编号项在 YAML 中逐行表达。
- `automation.spec_file` 只跟随真实脚本；缺脚本不得伪造映射或通过状态。

```bash
kata prd lint --feature <featureDir> --exit-code
kata cases build --feature <featureDir>
kata cases lint --project <项目> --feature <版本目录/需求目录名> --exit-code
```

批量标准化要逐条理解语义；单条阻塞时继续完成其余条目，最后统一报告阻塞证据。
