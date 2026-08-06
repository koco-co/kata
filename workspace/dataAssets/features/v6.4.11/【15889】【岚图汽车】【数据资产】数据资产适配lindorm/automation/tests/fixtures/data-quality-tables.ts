// main-flow-fixtures.ts — 主流程页对象依赖的环境预置业务表
//
// 这些表是环境里预先造好的业务 fixture 数据，不属于运行时 env profile
// （config/private/environments/*.yaml 只描述数据源/库，不登记业务表）。集中在此登记，
// 环境迁移或换数时只需核对本文件。

/** 数据源类型在 UI 下拉中的显示名（config/private/environments 只登记数据源名，不含类型显示名）。 */
export const SPARKTHRIFT_SOURCE_TYPE_LABEL = "SparkThrift2.x";

/** 自定义正则挂载校验使用的预置规则集主表。 */
export const DQ_RULE_MAIN_TABLE = "dwd_voyah_dq_rule_01_main";

/** 报告关联维表设置使用的前置维表。 */
export const VEHICLE_INFO_DIM_TABLE = "dim_voyah_vehicle_info";

/** 规则集/规则任务深链路校验使用的预置车辆质量规则集表。 */
export const VEHICLE_QUALITY_RULESET_TABLE = "dwd_vehicle_quality_di";

/** 报告与完整性校验使用的预置车辆订单表。 */
export const VEHICLE_ORDER_TABLE = "dwd_vehicle_order_di";
