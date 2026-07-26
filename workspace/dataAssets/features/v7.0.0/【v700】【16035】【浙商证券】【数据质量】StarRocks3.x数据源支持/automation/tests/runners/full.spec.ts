import "./generated.spec";
// full 入口：浅链路（平台授权 / 数据源可选 / 模块契约）+ 规则配置深链路 E2E（建规则→立即执行→实例校验状态）。
import "../cases/t01-starrocks-datasource-rule-wizard";
import "../cases/t02-platform-datasource-authorization";
import "../cases/t03-dq-module-contract";
// 完整性：表行数 / 空值数·空值率 / 空串数·空串率（单字段）
import "../cases/t04-rule-row-count";
import "../cases/t05-rule-null-count";
import "../cases/t06-rule-sum";
import "../cases/t07-rule-null-rate";
import "../cases/t08-rule-blank-count";
import "../cases/t10-rule-blank-rate";
// 准确性：求平均 / 负值比 / 零值比 / 正值比（求和=t06）
import "../cases/t11-rule-avg";
import "../cases/t12-rule-neg-ratio";
import "../cases/t13-rule-zero-ratio";
import "../cases/t14-rule-pos-ratio";
// 规范性：取值范围 / 枚举个数 / 最大长度·最小长度 / 格式(身份证·手机·邮箱)
// 注：数值-枚举范围(原 t16) 已排除——该 6.0 浙商 build 无内联枚举值输入，详见 handoff.excluded。
import "../cases/t15-rule-value-range";
import "../cases/t17-rule-enum-count";
import "../cases/t18-rule-str-maxlen";
import "../cases/t19-rule-str-minlen";
import "../cases/t20-rule-format-idcard";
import "../cases/t21-rule-format-mobile";
import "../cases/t22-rule-format-email";
// 唯一性：重复数(=t09) / 重复率 / 非重复个数 / 非重复占比（单字段）
import "../cases/t09-rule-repeat-count";
import "../cases/t23-rule-repeat-rate";
import "../cases/t24-rule-distinct-count";
import "../cases/t25-rule-distinct-ratio";
// 自定义SQL：单表 / 子查询跨表缺失
import "../cases/t26-rule-custom-sql";
import "../cases/t27-rule-custom-sql-join";
// 规则集导入（t44 skip：导入解析待 .xls）
// 多表比对：字段一致性 / 数值差异百分比 / 字符不区分大小写 / 空值NULL等价 / 五类分类
import "../cases/t28-rule-multi-consistency";
import "../cases/t38-rule-multi-pct-diff";
import "../cases/t39-rule-multi-case-insensitive";
import "../cases/t40-rule-multi-null-equiv";
import "../cases/t41-rule-multi-category";
// 列表查询筛选 / 脏数据管理
import "../cases/t42-rule-list-query";
import "../cases/t43-dirty-data-manage";
// 多字段变体（P2）：空值数·空值率·空串数·空串率·重复数·重复率
import "../cases/t29-rule-null-count-multi";
import "../cases/t30-rule-null-rate-multi";
import "../cases/t31-rule-blank-count-multi";
import "../cases/t32-rule-blank-rate-multi";
import "../cases/t33-rule-repeat-count-multi";
import "../cases/t34-rule-repeat-rate-multi";
// 任务查询 / 规则管理（编辑重跑·删除）
import "../cases/t35-task-query";
import "../cases/t36-rule-edit-rerun";
import "../cases/t37-rule-delete";
