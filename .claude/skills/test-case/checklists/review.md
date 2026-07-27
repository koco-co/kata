# 交付前自审清单

逐条核对；任何一条不通过就回去修改，改完重跑 `kata cases build` 再重新核对。

## 源文件（cases/需求名.yaml）

- [ ] yaml 通过 `kata cases build --feature <featureDir>` 校验，problem 数为 0。
- [ ] create 模式下存在 `requirement-notes.md`、`test-points.md`；edit 模式的语义变化已同步到这两个文件。
- [ ] yaml 的覆盖范围与 test-points.md 的覆盖清单一致，未覆盖清单里的点不在 yaml 里。
- [ ] `automation.spec_file` 映射用 `kata automation coverage <featureDir>` 核对：`unmapped`（尚未自动化的用例）导致的 exit 1 为预期行为；`missingScript`、`orphanScripts`、`duplicateSpecFile` 必须清零。
- [ ] P0 只标主流程与核心功能，占比约 1/4 ~ 1/3；不允许把所有用例标成同一优先级。用例数 ≥8 时占比由 lint 自动校验，<8 时 lint 不查，需人工核对。
- [ ] 前置条件可以直接执行：环境、数据、账号权限都写具体；正文提到具体表名时，前置条件里有同名的 `CREATE TABLE`。
- [ ] 步骤的 action 与 expected 成对出现；表单字段逐项列出；按钮、字段、枚举值与证据原文逐字一致。
- [ ] 正文中不出现真实主机地址、账号密码等未脱敏信息（真实环境名、标题格式已由 lint 拦截）。
- [ ] 每条事实都有依据（requirement-notes.md / 知识库 / 源码 / 用户确认）；「待确认」字样由 lint 拦截，但要改在源头：未确认的内容一开始就不该写进来。

## 派生物

- [ ] `需求名.xmind` 与 `exports/需求名.md` 是本次由 yaml build 生成的，未经手工修改。
- [ ] `kata cases lint --project <项目> --feature <id> --exit-code` 通过。

## 边界说明

- [ ] 回复里说清已验证的范围（证据来自 requirement-notes.md / DOM / 源码）与未验证的范围（因用户未确认而未覆盖的测试点及原因、占位环境）。
