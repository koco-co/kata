# dtstack-sdk

DTStack 平台前置条件 CLI + SDK。覆盖 SQL 执行（平台 API / 直连 DB）、离线项目幂等创建、资产元数据同步。

## 安装

已通过根 workspace 链接，无需单独安装。在测试代码里：

```ts
import { precondSetup } from "dtstack-sdk";
```

## 配置

通过 `kata env run <env> -- ...` 运行时，平台地址和 Cookie 直接来自
`config/private/environments/<env>.yaml` 的 `url` 与 `auth.cookie`。`--config` 或
`DTSTACK_CONFIG` 仍可显式提供 direct DB datasource 配置；不再使用独立
session 文件。

```yaml
defaultEnv: example-env
environments:
  example-env:
    baseUrl: https://example.invalid
    login:
      username: user@example.invalid
      password: ${DTSTACK_PASSWORD}
datasources:
  doris-example-env:
    type: doris
    host: example.invalid
    port: 9030
    username: root
    password: ${DORIS_PASSWORD}
```

## 命令

详见 [`docs/usage.md`](docs/usage.md)（与 `--help` 输出同源）。

## 测试

在仓库根目录运行：

```bash
bun run test:tools
```
