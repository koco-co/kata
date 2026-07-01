# 数栈平台架构梳理

## 证据口径

- 线上入口：`http://172.16.122.52/portal/#/`，通过用户提供的 Cookie 用 headless Playwright 访问。
- 源码目录：`/Users/poco/Projects/kata/workspace/dataAssets/.kata/repos`。
- 基准分支：优先使用 `release_6.3.x` 或 `dataAssets/release_6.3.x`。已有未提交改动的仓库未强制切换，避免覆盖本地改动。
- 服务清单：以 EM 截图中的 DTEM / DTinsight 服务为主，结合线上 Portal 与已提供源码做职责映射。

## 线上功能模块

Portal 首页可见产品入口：

- 离线开发
- 实时开发
- 元数据资产
- 数据服务
- 标签洞察
- 智能指标
- 控制台
- 公共管理

元数据资产产品内可见功能域：

- 资产盘点：资产总览、数据源、数据库、数据表等资产统计与目录视图。
- 元数据：数据地图、元数据同步、元模型管理、元数据管理、订阅数据、元数据质量。
- 数据标准：标准统计、标准定义、标准映射、词根管理、码表管理、行业模板、数据库拾取。
- 数据模型：规范建表、规范设计、授权与审批、我的模型。
- 数据质量：概览、规则任务配置、任务实例查询、质量报告、项目管理、脏数据管理。
- 数据治理：治理概览、个人工作台、治理任务管理、健康分管理、治理项目配置、白名单、代码检查、小文件治理。
- 数据安全：数据权限管理、我的权限查看、数据脱敏管理、级别管理、自动分级、分级数据。
- 平台管理：数据源管理、用户管理、角色管理、通知中心。

控制台入口可见：

- 队列管理
- 多集群管理
- 全局配置

## 总体链路

用户从 Portal / DTFront 进入具体产品。请求携带租户、用户、产品编码等上下文，经 Gateway 或前端反向代理路由到领域服务：

- 公共能力走 DTPublicService，提供用户、权限、租户、数据源、告警、License、SSO 等基础能力。
- 元数据资产域主要走 DTAssets 与 DTMetadata。前端请求前缀包括 `/dassets/v1`、`/dmetadata/v1`、`/dassets/v1/valid`。
- 数据开发域由 DTBatch / DTStream 承载任务开发与运行配置，依赖 DTSchedulex、DTEnginePlugin、DatasourceX、SQLParser。
- 执行层通过 DTSchedulex 做作业编排、实例、队列与依赖管理，再由 Engine Plugin 对接 Flink、Spark、Hadoop、ChunJun 等运行环境。
- 元数据、血缘、标准、质量、治理、安全等结果回写到 Metadata / Assets 域，形成资产目录与治理视图。

## 微服务职责映射

| EM 服务 | 架构层 | 当前判断 | 备注 |
| --- | --- | --- | --- |
| DTAddons | 扩展能力 | 截图确认，源码未提供 | 属于 DTEM 分组，需补充源码后确认具体扩展点。 |
| DTBase | 基础依赖 | 截图确认，源码未提供 | 可能承载基础中间件或部署基础包，需补源码确认。 |
| DTFront | 入口层 | 线上与源码确认 | Portal 与多产品前端入口，按产品路由到 DataAssets、Console 等应用。 |
| DTUic | 身份与租户 | 截图确认，源码未提供 | 与 DTPublicService 的 usercenter/authcenter 能力相关，负责账号、租户、登录态。 |
| DTPublicService | 公共服务 | 源码确认 | 模块包括 `pub-usercenter`、`pub-authcenter`、`pub-datasource`、`pub-alert`、`pub-license-manager`、`pub-ranger`、`pub-aiagent` 等。 |
| DTSchedulex | 调度执行 | 源码确认 | 对应 DAGScheduleX / engine，模块包括 master、worker、entrance、client sdk、plugin api 等。 |
| DTSqlParser | 解析服务 | 源码确认 | 提供 SQL 解析、血缘、语法与方言能力，被 IDE、Metadata、Assets、DQ 等域复用。 |
| DTDatasourceX | 连接器 | 源码确认 | 提供 datasource client、server、plugin、launcher 等能力，支撑连接测试、元数据采集、数据预览。 |
| DTEnginePlugin | 执行插件 | 源码确认 | 包含 Flink、Spark、Hadoop、dtscript、native 等执行插件。 |
| DTFlinkSql1.16 | Flink SQL | 部分确认 | engine-plugins 中存在 Flink 相关插件；独立服务源码未提供。 |
| DTMetadata | 元数据域 | 源码确认 | 负责元数据同步、数据源库表、血缘、数据标准、数据模型、权限、审批等能力。 |
| Nacos | 服务发现 | 截图确认 | 作为微服务注册发现与配置依赖使用。 |
| DTFlinkSql2.0 | Flink SQL | 截图确认，源码未提供 | 需补充源码确认与 Flink 1.16 的差异及部署边界。 |
| DTDependency | 依赖服务 | 截图确认，源码未提供 | 可能负责依赖包或任务依赖解析，需源码确认。 |
| ChunJun1.12 | 数据同步 | 部分确认 | 与 Engine Plugin / DatasourceX 协作，用于批流同步或采集任务。 |
| DTAssets | 资产域 | 源码确认 | 覆盖资产盘点、质量、治理、安全、标准、数据地图等资产门户能力。 |
| DTBatch | 离线开发 | 源码确认 | dt-center-ide / batch 服务，负责任务开发、项目、调度任务、血缘查询等。 |
| DTStream | 实时开发 | 截图确认，源码未提供 | Portal 有实时开发入口；需补源码确认实时任务、Flink SQL、发布链路。 |
| DTEasyIndex | 智能指标 | 截图确认，源码未提供 | Portal 有智能指标入口；需补源码确认指标建模、计算与服务接口。 |
| DTDataPortal | 数据门户 | 截图确认，源码未提供 | 需补源码确认与 DataAssets、DataApi 的关系。 |
| DTSsoServer | 认证服务 | 截图确认，源码未提供 | 与 SSO / OAuth 登录链路相关。 |
| DTApi | 数据服务 | 截图确认，源码未提供 | Portal 有数据服务入口；需补源码确认 API 发布、网关、授权和调用统计。 |
| DTGateway | 网关 | 截图确认，源码未提供 | 统一入口、反向代理、鉴权前置或服务路由需补源码确认。 |
| DTAgentshell | Agent 执行 | 截图确认，源码未提供 | 可能负责 agent shell / 采集执行脚本，需补源码确认。 |

## 已提供源码能确认的模块

### DTPublicService

- 代码位置：`dt-insight-plat/dt-public-service`
- API 前缀：线上请求与源码均指向 `/api/publicService`
- 核心模块：
  - `pub-usercenter`：用户、组织、租户等基础信息。
  - `pub-authcenter`：菜单、角色、权限、产品授权。
  - `pub-datasource`：数据源统一管理。
  - `pub-alert`：告警与通知。
  - `pub-license-manager`：License 与产品可用性。
  - `pub-ranger`：数据权限与安全集成。
  - `pub-sdk`：供其他服务调用公共服务的 SDK。

### DTSchedulex / Engine

- 代码位置：`dt-insight-plat/DAGScheduleX`
- 核心模块：
  - `engine-master`：调度主控、任务分发、队列与实例管理。
  - `engine-worker`：任务执行 worker。
  - `engine-entrance`：任务提交入口。
  - `engine-client-sdk`：供 Batch / Stream / DQ 等上层服务提交任务。
  - `engine-plugin-api`：执行插件抽象。
  - `engine-common`：调度公共模型与工具。

### DTDatasourceX

- 代码位置：`dt-insight-plat/datasourcex`
- 核心模块：
  - `datasourcex-client`：上层服务调用 SDK。
  - `datasourcex-server`：数据源能力服务端。
  - `datasourcex-plugin`：不同数据源连接插件。
  - `datasourcex-launcher` / `datasourcex-shell`：启动与运维入口。

### DTMetadata

- 代码位置：`dt-insight-web/dt-center-metadata`
- 主要能力：
  - 数据源、数据库、表、字段元数据管理。
  - 元数据同步与自动同步。
  - 数据血缘、数据地图、搜索。
  - 数据标准、词根、码表、标准映射。
  - 数据模型、规范建表、审批与权限。

### DTAssets

- 代码位置：`dt-insight-web/dt-center-assets`
- API 前缀：`/dassets/v1`，质量相关能力复用 `/dassets/v1/valid`
- 主要能力：
  - 资产盘点、数据目录、资产检索。
  - 数据质量任务、规则、实例、报告。
  - 数据治理工作台、治理任务、健康分、白名单、代码检查、小文件治理。
  - 数据安全、脱敏、分级分类、权限查看。

### DTBatch

- 代码位置：`dt-insight-web/dt-center-ide`
- 主要能力：
  - 离线任务开发、项目空间、任务调度配置。
  - 调用 DTSchedulex / Engine 提交与管理任务。
  - 调用 DTPublicService 管理数据源与权限上下文。
  - 调用 DTMetadata / SQLParser 处理表、血缘与 SQL 解析。

### DTEnginePlugin

- 代码位置：`dt-insight-engine/engine-plugins`
- 主要能力：
  - Flink、Spark、Hadoop、dtscript、native 等执行插件。
  - 供 DTSchedulex / Engine 按任务类型加载运行时插件。

## 待补源码后可继续细化

当前缺少或无法从已给源码直接确认的服务包括：

- DTBase
- DTGateway
- DTUic
- DTSsoServer
- DTApi
- DTStream
- DTEasyIndex
- DTDataPortal
- DTAddons
- DTDependency
- DTAgentshell
- DTFlinkSql1.16 独立服务边界
- DTFlinkSql2.0 独立服务边界

建议优先补充 `DTGateway`、`DTUic`、`DTApi`、`DTStream`、`DTEasyIndex`、`DTDataPortal` 源码，因为这些服务会决定入口路由、登录鉴权、数据服务、实时开发、指标与门户产品边界。
