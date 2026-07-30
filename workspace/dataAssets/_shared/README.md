# dataAssets 共享自动化

本目录只保留被至少两个独立 feature 实际复用的 dataAssets 自动化能力。单 feature
页面对象、流程、断言、fixture 与前置条件必须放回对应 feature 的
`automation/tests/` 领域目录。

## 目录

- `_meta/`：客户、模块等项目级枚举。
- `automation/fixtures/`：跨 feature 的 Playwright fixture。
- `automation/flows/`：跨 feature 的完整业务流程。
- `automation/pages/<product-domain>/`：按稳定产品域组织的页面对象。目录名不得包含
  版本、客户、需求编号或日期。
- `automation/preconditions/`：跨 feature 的前置数据与项目准备。
- `automation/runtime/`：dataAssets 环境解析、URL 与 Cookie 等运行时能力。
- `automation/assertions/`：仅在出现跨 feature 复用断言时创建。

仓库级 Playwright 与 Ant Design 工具直接从 `runtime/automation/playwright` 导入，不在
本目录建立 barrel 或兼容转发层。

## 边界

- 共享文件必须能追溯到至少两个独立 feature 的直接或传递引用。
- 失去全部消费者的文件删除；只剩一个 feature 使用的文件迁回该 feature。
- 环境值统一由 `automation/runtime/env-profile.ts` 解析，不直接读取废弃环境变量。
- 环境预置业务表登记在所属 feature 的 `automation/tests/fixtures/`，不进入共享 runtime。
- 不创建 `helpers/`、`rules/` 或按历史需求命名的 `pages/` 目录。

## 验证

```bash
bun run type-check:workspace
bun cli/bin/kata.ts automation lint --shared --exit-code
bun run test:workspace
```
