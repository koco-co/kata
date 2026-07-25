# 交付前自审清单

逐条过；任一条不过就回去改，改完重跑 `kata cases build` 再查。

## 源文件（cases/需求名.yaml）

- [ ] yaml 通过 `kata cases build --feature <featureDir>` 校验，零 problem。
- [ ] 每条用例标题以「验证」开头，从标题能看出检查点。
- [ ] P0 只给主流程与核心功能，占比约 1/4 ~ 1/3；没有全标同一优先级的偷懒分布。
- [ ] 前置条件可执行：环境、数据、账号权限都具体；正文提到具体表名时，前置里有同名 `CREATE TABLE`。
- [ ] 步骤 action / expected 成对；表单字段逐项列出；按钮、字段、枚举值与证据原文逐字一致。
- [ ] 环境名全部占位（`${DataSourceA}` 等），正文无真实环境名、主机、账号密码。
- [ ] 每条事实有依据（prd.md / 知识库 / 源码 / 用户确认）；yaml 全文无「待确认」字样——lint 会拦，但要改在源头，未确认的内容一开始就不该写进来。

## 派生物

- [ ] `需求名.xmind` 与 `exports/需求名.md` 是本次 yaml build 出来的，没有手改。
- [ ] `kata cases lint --project <项目> --feature <id> --exit-code` 通过。

## 边界说明

- [ ] 回复里说清已验证范围（证据来自 prd.md / DOM / 源码）与未验证范围（用户未确认而未覆盖的测试点及原因、占位环境）。
