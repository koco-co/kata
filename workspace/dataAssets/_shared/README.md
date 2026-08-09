# dataAssets 共享项目元数据

本目录只保存 canonical YAML 作者共用的项目枚举，不存放自动化执行代码。Web UI
实现统一位于 `automation/playwright-web-ui/suites/data-assets/`。

## 目录

- `_meta/customers.yaml`：项目客户枚举。
- `_meta/modules.yaml`：项目模块枚举。

## 边界

- workspace 中不得重新创建 feature-local 或 `_shared/automation` 执行代码。
- executor 不读取本目录或 `config/private`；CLI 只把版本化 manifest 与受控环境传给 executor。
- 可复用 UI 能力按稳定业务域放进 data-assets Python suite，出现两个真实消费者后再抽象。

## 验证

```bash
bun cli/bin/kata.ts cases lint --project dataAssets --exit-code
uv run --locked --no-sync ruff check automation
uv run --locked --no-sync pyright
```
