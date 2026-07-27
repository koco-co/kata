# 完整性JSONKey范围校验 — automation/scripts

本目录当前没有脚本，只存放本说明。自动化资产全部在 `automation/tests/` 下。

## 实际布局

| 路径 | 用途 |
|------|------|
| `automation/tests/cases/` | 用例脚本 `t{nn}-{slug}.ts`（共 37 个：根目录 10 个 + 9 个模块子目录，索引见 `cases/README.md`） |
| `automation/tests/fixtures/` | 测试数据/夹具（`key-range-data.ts`、`key-range-legacy-data.ts`、`test-data.ts`、`tasks.json`） |
| `automation/tests/runners/` | Playwright runner：`smoke.spec.ts`、`full.spec.ts`（full 经 `generated.ts` 注册表加载用例，勿手改） |

跨 feature 复用的页面对象与 helper 在 `workspace/dataAssets/_shared/`（pages/helpers/fixtures）。

## 运行

Playwright 必须经 `kata runs exec` 运行（由 CLI 分配 `runs/<run-id>/` 并注入 `KATA_RUN_PATH`、`KATA_ALLURE_RESULTS_DIR`），禁止裸跑：

```bash
# 冒烟
kata runs exec 【v6410】【岚图汽车】【数据质量】完整性JSONKey范围校验 --project dataAssets -- \
  kata env run <env> -- bunx playwright test \
  workspace/dataAssets/features/v6.4.10/【v6410】【岚图汽车】【数据质量】完整性JSONKey范围校验/automation/tests/runners/smoke.spec.ts

# 全量
kata runs exec 【v6410】【岚图汽车】【数据质量】完整性JSONKey范围校验 --project dataAssets -- \
  kata env run <env> -- bunx playwright test \
  workspace/dataAssets/features/v6.4.10/【v6410】【岚图汽车】【数据质量】完整性JSONKey范围校验/automation/tests/runners/full.spec.ts
```
