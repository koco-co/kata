# runtime/automation/playwright

仓库级 Playwright 工具库，封装 Ant Design 交互、导航与不依赖具体项目的测试工具。

## 目录

```text
runtime/automation/playwright/
├── ant-design/
│   ├── interactions.ts
│   ├── navigation.ts
│   └── index.ts
├── utils.ts
├── index.ts
└── README.md
```

项目代码直接导入本目录；项目专属环境、fixture 与业务流程留在
`workspace/<project>/_shared/automation/`。

标准 feature 用例文件（`automation/tests/cases/*.spec.ts`）示例：

```typescript
import {
  selectAntOption,
  uniqueName,
  waitForUiSettled,
} from "../../../../../../../../runtime/automation/playwright";
import {
  expect,
  test,
} from "../../../../../../_shared/automation/fixtures/step-screenshot";
```

## 修改边界

- Ant Design 组件交互放在 `ant-design/`。
- 不依赖具体项目的测试工具放在 `utils.ts`。
- dataAssets URL、Cookie、项目 ID 等项目能力不得放入本目录。
- 修改后运行对应单元测试、workspace 类型检查及至少一个真实调用方验证。
