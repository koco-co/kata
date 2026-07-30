# 编写：需求源 → 完整 PRD → 测试点 → 用例

## 1. 定位 feature

从需求源核实项目、版本、顶层需求 ID、客户、模块和需求名；只问无法查证且会改变目录身份的决策。运行：

```bash
kata features resolve --project <项目> --module <模块> --description <需求名> \
  --feature-version <vX.Y.Z> [--customer <客户>] [--requirement-id <顶层需求ID>] --json
```

无迭代版本才使用 `--standing`。身份由 `<项目>:<版本目录>/<需求目录名>` 推导，不写 metadata。

## 2. 提取蓝湖证据

```bash
kata prd extract --url <含 docId/versionId/pageId 的完整链接> --feature <featureDir>
```

只生成 `prd/evidence/lanhu.json` 与 `prd/assets/`，不得直接生成 PRD。相同 docId/versionId/pageId 且摘要和图片完整时使用缓存；版本变化或显式 `--force` 才重取。提取失败时阻断，不得从 URL 猜需求。

非蓝湖材料也必须先整理成可追踪证据，再进入以下确认流程。

## 3. 注入知识并准备源码

先读取已验证知识：

```bash
kata knowledge read --project <项目> --module <模块>
```

再按真实需求身份准备相关仓库：

```bash
kata repos prepare --project <项目> --module <模块> --customer <客户或标品>
```

分支只取 `config/repos/sources.yaml` 的 `branch`。命令必须匹配显式 `modules/customers`；无匹配即阻断。准备后用 `kata repos grep/show` 查当前实现、枚举和约束，不询问可查事实。

## 4. 遗漏与冲突扫描

对蓝湖、verified 知识与 release 源码进行两轮检查：

1. 梳理需求明确写出的目标、范围、角色、字段、状态、异常、兼容和验收。
2. 查蓝湖遗漏、来源冲突及用户可能没考虑到的问题，重点覆盖权限、边界值、枚举全集、历史数据、失败恢复、并发、兼容和依赖影响。

冲突解释：

- 蓝湖表示预期变更；
- verified 知识表示既有业务规则；
- release 源码表示当前实现和技术约束；
- 目标行为冲突时由用户决策。

## 5. 逐问确认并记录会话

一次只问一个问题，按依赖顺序推进。每题必须包含：

- 当前证据及冲突；
- 不决策的风险和业务影响；
- 一个明确的推荐答案；
- 用户的最终答案。

把知识查询、已准备仓库的 branch/commit、两轮遗漏扫描、运行时问题、答案、证据和决策写入 `prd/.process/session.json`。不得把「待确认」写进正式产物。第一轮结束后再做一次遗漏扫描；然后向用户展示完整决策摘要，单独取得“发布最终 PRD”的确认，才把 session 状态设为 `publish_confirmed`。

会话结构与完整示例见 [../examples/prd-session.json](../examples/prd-session.json)。运行时 Q 编号只保留在 `.process`，正式 PRD 将其整理为 `PD-001` 等可读决策。

## 6. 定稿并检查 PRD

```bash
kata prd finalize --feature <featureDir>
kata prd lint --feature <featureDir> --exit-code
```

PRD frontmatter 只允许 `source/source_url/requirement_id/evidence_digest`。正文按相关性输出：身份来源、背景目标、范围、角色前置、现状变更、业务场景、字段校验、状态数据、异常兼容、依赖影响、产品决策、验收、截图追踪。空章节跳过。图片只引用已存在的 `assets/...`。

刷新既有 PRD 时先提取并比较 evidence digest；未完成差异分析、补问和发布确认前不得覆盖。确认后原子替换 `prd/prd.md`，Git 保存历史；测试点和用例摘要链随即过期。

## 7. 设计并确认测试点

只从最终 PRD 派生测试点，引用 `FR/BR/ER/AC/PD`。与用户确认覆盖范围、优先级和明确不覆盖项，不再重复确认需求。按 [../templates/test-points.md](../templates/test-points.md) 写入 `cases/test-points.md`，frontmatter 的 `prd_digest` 为完整 `prd/prd.md` 的 SHA-256。

## 8. 写 YAML 并构建

格式见 [../examples/cases.yaml](../examples/cases.yaml)。`meta.test_points_digest` 记录完整 `cases/test-points.md` 的 SHA-256；`source_ref` 引用测试点 ID。`meta.case_module_id` 必填，未知写 `""`；默认导出 XMind。

```bash
kata cases build --feature <featureDir>
kata cases lint --project <项目> --feature <版本目录/需求目录名> --exit-code
```

修复源 YAML 后重建，禁止手改派生物。
尚未实现自动化且没有 `automation.spec_file` 的用例由 coverage 报告为 `unmapped`，不得伪造脚本或通过状态。

## 9. 知识闭环

仅将跨需求复用、已确认且有来源的规则写回知识库；需求特有内容留在 PRD。遇到冲突写 `conflicting`，不得覆盖旧结论。写入后运行 `kata knowledge index --project <项目>`。
