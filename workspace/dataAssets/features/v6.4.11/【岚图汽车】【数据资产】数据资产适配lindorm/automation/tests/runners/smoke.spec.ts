// spec: features/2099-01-lt-dq-main-flow/岚图主流程用例整理.md#batch=01-assets-inventory
// intent: SR-2099-01-AI-001
// probe: results/preflight-260519-01/playwright/preflight/probe4-discoveries.json
// page: _shared/pages/2099-01-lt-dq-main-flow/assets-inventory-page.ts
// META: {"id":"smoke","priority":"P1","title":"资产盘点 P1 冒烟自动化入口"}
// SourceRefs: SR-2099-01-AI-001, SR-SELF-RUN-001
import "../cases/c0001-验证第一次进入资产平台弹资产功能引导弹窗";
import "../cases/c0002-验证已接入数据源统计数据正确";
import "../cases/c0003-验证数据地图分布图数据正确";
import "../cases/c0004-验证数据目录分布图数据正确";
import "../cases/c0005-验证数据价值排行图数据正确";
import "../cases/c0006-验证存储资源情况图数据正确";
import "../cases/c0007-验证元数据变化趋势图数据正确";
import "../cases/c0008-验证资产查询趋势图数据正确";
import "../cases/c0009-验证数据地图一级页面UI展示";
import "../cases/c0010-验证数据地图搜索框交互元素展示";
import "../cases/c0011-验证数据表类型-搜索结果符合预期";
import "../cases/c0012-验证离线任务类型-搜索结果符合预期";
import "../cases/c0013-验证实时任务类型-搜索结果符合预期";
import "../cases/c0014-验证API类型-搜索结果符合预期";
import "../cases/c0015-验证智能标签类型-搜索结果符合预期";
import "../cases/c0016-验证指标类型-搜索结果符合预期";
import "../cases/c0017-验证最近查询功能正确";
import "../cases/c0018-验证数据地图资产类型图标及对应表数量展示";
import "../cases/c0019-验证数据表表数量统计正确";
import "../cases/c0020-验证离线任务任务数量统计正确";
import "../cases/c0021-验证实时任务任务数量统计正确";
import "../cases/c0022-验证API数量统计正确";
import "../cases/c0023-验证智能标签标签数量统计正确";
import "../cases/c0024-验证指标指标数量统计正确";
import "../cases/c0025-验证页面交互功能正常";
import "../cases/c0026-验证数据地图数据源类型列表按表数量倒序展示";
import "../cases/c0027-验证表来源-表数量分类统计正确";
import "../cases/c0028-验证页面交互功能正常";
import "../cases/c0030-验证表标签功能正常";
import "../cases/c0031-验证字段标签功能正常";
import "../cases/c0032-验证视图标签功能正常";
import "../cases/c0033-验证数据地图历史查询记录分色展示";
import "../cases/c0034-验证查询关键词展示大小逻辑正确";
import "../cases/c0035-验证查询关键字次数统计正确";
import "../cases/c0036-验证查询关键字跳转功能正确";
import "../cases/c0037-验证数据地图二级页面及表信息UI展示";
import "../cases/c0038-验证筛选条件组合查询功能正常";
import "../cases/c0039-验证数据地图数据目录操作按钮及筛选框展示";
import "../cases/c0040-验证数据目录-新增功能正确";
import "../cases/c0041-验证数据目录-查询功能正确";
import "../cases/c0042-验证数据目录-编辑功能正确";
