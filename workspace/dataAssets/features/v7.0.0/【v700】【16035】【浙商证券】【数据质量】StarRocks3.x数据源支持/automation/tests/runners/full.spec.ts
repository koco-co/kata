// full 入口：浅链路（平台授权 / 数据源可选 / 模块契约）+ 规则配置深链路 E2E（建规则→立即执行→实例校验状态）。
import "../cases/t01-starrocks-datasource-rule-wizard";
import "../cases/t02-platform-datasource-authorization";
import "../cases/t03-dq-module-contract";
// 深链路：完整性(表级 表行数 / 字段级 空值数)、准确性(求和)、唯一性(重复数)。每条建规则→执行→断言校验通过/异常双向。
import "../cases/t04-rule-row-count";
import "../cases/t05-rule-null-count";
import "../cases/t06-rule-sum";
import "../cases/t09-rule-repeat-count";
