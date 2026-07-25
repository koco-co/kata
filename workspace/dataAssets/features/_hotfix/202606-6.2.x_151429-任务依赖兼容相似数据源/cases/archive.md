---
suite_name: "Hotfix 用例 - 【数据资产】数据血缘任务间依赖与实际依赖对不上"
description: "记录 Bug #151429 当前环境复现前置与修复回归检查点"
case_count: 1
keywords: "6.2 | 数据资产/元数据 | | CDH_CDH 5.16.2,DTHadoop_DTHadoop 2.0.0 | 6.2 | 任务依赖查询未兼容相似数据源导致展示缺失"
tags:
  - hotfix
  - bug-151429
create_at: "2026-06-29"
status: 草稿
origin: zentao
zentao_url: "http://zenpms.dtstack.cn/zentao/bug-view-151429.html"
---

## 数据资产

### 元数据

#### 表详情

##### 【P1】【151429】验证【任务依赖】基础展示并记录相似数据源缺失复现条件

> 前置条件

```
1. 当前验证环境不要求部署 hotfix_6.2.x_151429 修复包；未部署修复分支时，本用例只验证可复现前置和现场证据采集，不得断言修复效果通过。
2. 已在数据资产【元数据】-【数据地图】中定位表详情：
   - 表名：test_info_1
   - 数据库：pw_test
   - 数据源：pw_test_HADOOP
   - 表来源：SparkThrift2.x
3. 该表【任务依赖】-【离线任务】当前已存在基础依赖记录：
   - 任务名称：mysql2spark
   - 任务类型：数据同步
   - 和该表的关系：产出该表
   - 负责人：admin@dtstack.com
4. 修复回归场景需要额外准备或定位一张满足 #151429 缺陷条件的表：
   - 【血缘关系】表级血缘中存在除产出表同步任务外的实际依赖离线任务，任务清单记录为 {{lineage_offline_task_names}}。
   - 【任务依赖】-【离线任务】展示数量少于表级血缘中的实际依赖任务数，缺失任务记录为 {{missing_task_names}}。
   - 缺失任务来自相似数据源组内不同 dtCenterSourceId，或由跨相似数据源的表血缘生成。
5. 如当前环境无法定位第 4 条数据，不判定修复通过或失败；仅完成 test_info_1 基础展示核验，并将“无法复现缺失任务”记录为阻塞。
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据资产【元数据】-【数据地图】搜索表 test_info_1，打开表详情并核对右侧技术属性：<br>- 表名：test_info_1<br>- 数据库：pw_test<br>- 数据源：pw_test_HADOOP<br>- 表来源：SparkThrift2.x | 1)进入「表详情」页<br>2)页面展示「表结构」「数据预览」「血缘关系」「任务依赖」页签<br>3)当前表的表名、数据库、数据源与前置条件记录一致 |
| 2 | 点击「任务依赖」页签，查看「离线任务」区域，核对基础依赖记录：<br>- 任务名称：mysql2spark<br>- 任务类型：数据同步<br>- 和该表的关系：产出该表<br>- 负责人：admin@dtstack.com | 1)任务依赖列表展示「任务名称」「任务类型」「和该表的关系」「负责人」<br>2)离线任务列表存在 mysql2spark 记录<br>3)mysql2spark 的任务类型、和该表的关系、负责人分别为「数据同步」「产出该表」「admin@dtstack.com」 |
| 3 | 点击「血缘关系」页签，切换或保持「表级血缘」，记录除 mysql2spark 外是否存在实际依赖离线任务：<br>- 任务清单：{{lineage_offline_task_names}}<br>- 任务数量：{{lineage_offline_task_count}} | 1)表级血缘区域加载完成<br>2)若仅能看到 mysql2spark 或无法看到额外离线任务，记录「当前环境未复现缺失依赖」，本轮不继续断言修复效果<br>3)若存在额外离线任务，继续执行第 4 步 |
| 4 | 在存在额外血缘离线任务时，回到「任务依赖」页签并对比「离线任务」列表：<br>- 血缘任务清单：{{lineage_offline_task_names}}<br>- 任务依赖清单：{{table_rely_offline_task_names}}<br>- 缺失任务清单：{{missing_task_names}} | 1)未部署修复分支时，若 {{missing_task_names}} 非空，记录为 #151429 可复现证据，不判定修复通过<br>2)已部署 hotfix_6.2.x_151429 修复分支时，{{missing_task_names}} 必须为空，任务依赖清单应覆盖血缘中的实际依赖离线任务 |
| 5 | 打开浏览器 Network，查看本次「任务依赖」页签触发的 `/dataMap/tableRely/page` 请求，保存请求与响应证据：<br>- tableId：{{table_id}}<br>- metaType：离线任务对应值，以页面实际请求为准<br>- 响应任务清单：{{table_rely_offline_task_names}} | 1)请求返回成功<br>2)响应结果与页面「离线任务」列表一致<br>3)若第 4 步存在缺失任务，响应证据中同步记录缺失清单，用于修复分支部署后再次回归 |
