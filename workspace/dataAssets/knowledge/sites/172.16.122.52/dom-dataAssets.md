---
title: 172.16.122.52 DataAssets DOM
type: module
tags: [selector, dataAssets, 数据地图, 热门标签, 字段标签, 自动分级, 识别模式, 数据脱敏]
status: verified
source: ui.probe.snapshot@2026-05-13-ci63-rank-increment-mode
updated: 2026-05-13
---


# 172.16.122.52 DataAssets DOM

## 数据地图路由

- 数据地图首页为 `#/metaDataCenter`，页面正文包含 `热门标签`、`热门查询`，热门标签接口为 `/dassets/v1/datamap/hotLabel/list`。
- 数据地图搜索页为 `#/metaDataSearch`，顶部结果类型选择器为 `.searchResult__header--select`。选择 `字段` 后筛选区显示 `字段标签`；选择 `数据表` 时显示 `表标签`。
- 数据地图搜索页的搜索输入区域为 `#search-header`，搜索按钮为 `.searchResult__header--btn`；字段模式搜索 `name` 触发 `/dassets/v1/datamap/queryDetail`，payload 包含 `metaType: 2` 与 `search: "name"`，结果区 `.searchResult__body` 展示字段名、数据源/库/表路径、`资产类型：字段`、`字段中文名`、`字段标签`。SourceRef: `SR-UI-PROBE-202506-FIELD-FUZZY-CI63`。

## 标签接口

- 表详情页添加表标签请求 `/dassets/v1/label/addBindLabel`，payload 包含 `labelType: 1`, `metaType: 1`, `metaId: tableId`。
- 字段标签请求同接口，payload 包含 `labelType: 2`, `metaType: 2`, `metaId: tableId`, `columnId`。
- 删除绑定标签使用 `/dassets/v1/label/deleteByBindLabelId`，payload 为 `{ ids: [bindId] }`。

## 选择器

- 字段/表标签筛选框可通过 `.ant-form-item` 包含文本 `字段标签` 或 `表标签` 后定位内部 `.ant-select`。
- Ant Select 下拉选项为 `.ant-select-dropdown .ant-select-item-option-content`。

## 自动分级配置页

- 自动分级列表路由为 `#/dataClassify/hierarchicalSet`，添加规则后进入 `#/dataClassify/hierarchicalSet/classesRule`。
- 列表页添加按钮文本会渲染为带空格的 `添 加`，可用 `button` + `/添\s*加/` 定位。
- 添加规则第一步包含 `规则名称`、`所属分级`、`所属分类`；`所属分级` 是 Ant Select，`所属分类` 是 Ant TreeSelect。
- 配置规则页包含 `识别模式` 单选组，`增量识别` 默认选中，radio payload 映射为 `config.model: 0`；`全量识别` 映射为 `config.model: 1`。
- 识别模式帮助浮层实际文案包含 `全量识别：自动分级默认对已配置的所有数据全量识别`，以及 `增量识别：对已配置但未分级的数据、和已分级但级别低于当前所选级别的数据进行识别`。
- 配置页选择 SparkThrift2.x 后，数据源下拉可见 `pw_test_HADOOP`；数据源选择后数据库下拉默认显示 `全部`，并可展开 `pw_test`。

## 数据质量规则任务配置

- 规则任务配置列表路由为 `#/dq/rule?pid={projectId}`；新建单表校验规则路由为 `#/dq/rule/add?pid={projectId}`。在 ci63 站点，`#/dq/ruleSet?pid=9` 与 `#/home?pid=9` 会显示“亲，是不是走错地方了？”。SourceRef: `ui.probe.snapshot@2`, `ui.probe.snapshot@3`。
- 新建单表校验规则第一步包含 `规则名称`、`选择数据源`、`选择数据库`、`选择数据表`，Ant Select 可通过 `.ant-form-item` 文本定位。SourceRef: `ui.probe.snapshot@3`。
- ci63 / pw_test 下 `pw_test_HADOOP`、`pw_test`、`dq_test_user_info_300` 可完成监控对象配置，表字段接口 `/dassets/v1/valid/monitor/tablecolumn` 返回 `create_time`、`update_time`、`register_time`、`last_login_time` 等时间字段。SourceRef: `ui.probe.snapshot@5`, `ui.probe.snapshot@6`。
- 当前 ci63 站点点击新建单表校验规则的 `添加规则`，菜单实际显示 `完整性校验`、`准确性校验`、`规范性校验`、`唯一性校验`、`自定义SQL`，未显示 `时效性校验`。SourceRef: `ui.probe.snapshot@7`。
- 当前 ci63 站点在完整性校验表单中，默认仍显示 `规则类型`、`字段`、`统计函数`、`校验方法`、`期望值`、`强弱规则`、`规则描述`；切换 `规则类型=表级` 后 `统计函数` 仅显示 `表行数`，尚未观察到 `多表数据行数比对`、`选择对比表` 或 `比对细节设置`。SourceRef: `ui.probe.snapshot@8`, `ui.probe.snapshot@10`。
- ci63 数据质量深链路需要在页面上下文写入 `sessionStorage["X-Valid-Project-ID"] = "9"`；`#/dq/rule/add?pid=9` 这类新建页在注入项目上下文后 reload，才稳定渲染 `新建单表校验规则`、`规则名称`、`选择数据源`、`选择数据库`、`选择数据表`。SourceRef: `SR-UI-PROBE-002`。

## 元数据同步

- 元数据同步周期同步列表路由为 `#/metaDataSync`，正文包含 `周期同步`、`新增周期同步任务`。SourceRef: `SR-UI-PROBE-202505-METADATA-SYNC-CI63`。
- 周期同步表格表头顺序为 `数据源`、`数据库`、`数据表`、`调度周期`、`同步状态`、`最近一次实例状态`、`最近同步时间`、`操作`；`最近一次实例状态` 位于 `同步状态` 后。SourceRef: `SR-UI-PROBE-202505-METADATA-SYNC-CI63`。
- `最近一次实例状态` 表头使用 Ant Table filter trigger，可通过 `.ant-table-thead th` 包含表头文本后定位 `.ant-table-filter-trigger`；筛选下拉项为 `未提交`、`同步中`、`同步完成`、`未完成`、`同步失败`。SourceRef: `SR-UI-PROBE-202505-METADATA-SYNC-CI63`。

## 数据脱敏管理

- 数据脱敏管理路由为 `#/dataDesensitization`，左侧数据安全子菜单包含 `数据权限管理`、`数据脱敏管理`、`级别管理`、`自动分级`、`分级数据`。SourceRef: `SR-UI-PROBE-002`。
- 数据脱敏管理列表页正文包含 `新增规则`，表头顺序为 `规则名称`、`直接脱敏表`、`脱敏方式`、`最近修改人`、`最近修改时间`、`操作`。SourceRef: `SR-UI-PROBE-003`。
- `新增规则` 弹窗包含表单项 `规则名称`、`脱敏方式`、`覆盖方式`、`样例数据`；脱敏方式选项为 `覆盖`、`转义脱敏`、`算法脱敏`，默认覆盖方式包含 `全部覆盖`、`部分覆盖`。SourceRef: `SR-UI-PROBE-003`。
- `新增规则` 弹窗切换 `转义脱敏` 后展示 `转义字符` 表格，表头为 `原字符`、`替换字符`、`操作` 并提供 `添加转义`；切换 `算法脱敏` 后仅保留 `规则名称`、`脱敏方式`、`样例数据`。SourceRef: `SR-UI-PROBE-004`。
