# runtime/playwright

Playwright 共享工具库，封装 Ant Design 组件交互、页面导航、通用测试工具函数。

## 目录结构

```text
runtime/playwright/
├── ant-design/           ← Ant Design 专属
│   ├── interactions.ts   ← Select / Modal / Drawer / Table / Form / Tabs 等交互
│   ├── navigation.ts     ← Sider 侧边栏菜单导航
│   └── index.ts          ← barrel export
├── utils.ts              ← uniqueName / todayStr / waitForUiSettled（通用测试工具）
├── index.ts              ← 统一导出（外部 API 不变）
└── README.md
```

## 导入链

```text
spec 文件
  → workspace/dataAssets/_shared/fixtures/step-screenshot.ts
  → workspace/dataAssets/_shared/helpers/test-setup.ts
    → shared/helpers/index.ts
      → runtime/playwright/index   ← 本目录
        ├── ant-design/         ← Ant Design 组件交互
        └── utils.ts            ← 通用工具函数
```

Spec 文件直接从项目共享目录或本目录的稳定相对路径导入；项目统一使用仓库根 `tsconfig.json`，不再为 `workspace/dataAssets` 维护独立 alias。以下示例均从 feature automation 目录（`workspace/<project>/features/<version>/<feature>/automation/`）起算：

```typescript
// 项目共享 fixture 与 helpers（helpers 会 re-export 本库的交互与工具函数）
import { test, expect } from "../../../../_shared/fixtures/step-screenshot";
import { selectAntOption, uniqueName } from "../../../../_shared/helpers/test-setup";
// 也可以直接导入本库（向上 6 级到仓库根）
import { waitForUiSettled } from "../../../../../../runtime/playwright";
```

## 修改须知

- Ant Design 组件交互改动 → `ant-design/` 目录
- 通用测试工具改动 → `utils.ts`
- 修改后须在至少一个项目的 spec 中验证
