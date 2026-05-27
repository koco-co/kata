# 岚图已上线需求用例 Stage 3 Evidence

本记录只覆盖 Stage 3 新增或改写的字段、按钮、菜单路径和接口文案；历史存量文案仍以 Markdown 原始用例、DOM 知识库、源码和模块知识库为证据来源。

## R7 接口与页面证据

- `POST /dassets/v1/scheduleJob/affectCountStatistic`：后端 `ScheduleJobController` 暴露 `/affectCountStatistic`，注释为“血缘影响数统计”。证据：`workspace/dataAssets/.kata/repos/customltem/dt-center-assets/web/src/main/java/com/dtstack/assets/controller/schedule/ScheduleJobController.java:184`、`:186`。
- `血缘影响数统计` 业务实现：`LineageCommonService.affectCountStatistic()` 以支持血缘的数据源为输入做统计。证据：`workspace/dataAssets/.kata/repos/customltem/dt-center-assets/service/src/main/java/com/dtstack/assets/service/lineage/LineageCommonService.java:56`、`:59`、`:61`。
- `资产盘点`页面及首屏资产盘点接口：DOM 知识库记录 `#/assetsStatistics?pid=92`，正文包含资产盘点首屏内容，首屏资源接口返回 HTTP 200。SourceRef: `SR-UI-PROBE-20260522-ASSETS-001`，证据：`workspace/dataAssets/_shared/knowledge/sites/shuzhan63-test-ltqc.k8s.dtstack.cn/dom-dataAssets.md:59`、`:60`。
- 资产盘点统计相关前端接口：`resourceDistribution`、`dataPreview`、`dataValueRank` 等接口在前端 `reqUrls.ts` 中定义。证据：`workspace/dataAssets/.kata/repos/customltem/dt-insight-studio/apps/dataAssets/src/consts/reqUrls.ts:156`-`:164`。

## R8 字段与按钮证据

- `规则任务管理` 菜单和路由：DOM 知识库记录 `规则任务管理` 链接为 `#/dq/rule`。证据：`workspace/dataAssets/_shared/knowledge/sites/shuzhan63-test-ltqc.k8s.dtstack.cn/dom-dataAssets.md:26`、`:50`、`:51`。
- `校验结果查询` 与 `数据质量报告` 菜单和路由：DOM 知识库记录 `#/dq/taskQuery`、`#/dq/qualityReport`。证据：`workspace/dataAssets/_shared/knowledge/sites/shuzhan63-test-ltqc.k8s.dtstack.cn/dom-dataAssets.md:27`、`:28`、`:52`-`:55`。
- 数据质量链路：模块知识库记录 `规则库配置 → 规则集管理 → 规则任务管理 → 校验结果查询 → 数据质量报告`，并说明规则任务保存后会在校验结果查询生成记录。证据：`workspace/dataAssets/_shared/knowledge/modules/data-quality.md:13`、`:28`-`:34`。
- `新建监控规则` 按钮、规则任务列表列头：共享 Page Object 记录规则任务管理页面按钮和列头。证据：`workspace/dataAssets/_shared/pages/2099-01-lt-dq-launched-reqs/quality/quality-page.ts:54`-`:62`。
- `临时保存` 按钮与 `临时保存成功` 提示：前端中文 locale 包含按钮和提示文案。证据：`workspace/dataAssets/.kata/repos/customltem/dt-insight-studio/apps/dataAssets/src/locales/zh-CN/index.ts:8132`、`:8133`、`:8151`、`:8152`。
- `完整性校验`、`规则名称`、`规则类型`、`规则描述` 字段：前端中文 locale 包含对应字段和校验提示。证据：`workspace/dataAssets/.kata/repos/customltem/dt-insight-studio/apps/dataAssets/src/locales/zh-CN/index.ts:6964`、`:7198`、`:7202`、`:7204`、`:7205`。
