// 并行分片 C（t24–t37）：与 full-a/full-b 配合 --workers=3 跨文件并行；分片内仍串行。
// 仅作快速跑批入口，交付以 full.spec.ts 为准。
import "../cases/c0024-验证StarRocks3x数据源规范性校验格式-手机号规则校验";
import "../cases/c0025-验证StarRocks3x数据源规范性校验格式-邮箱规则校验";
import "../cases/c0026-验证StarRocks3x数据源唯一性校验重复数单字段规则校验";
import "../cases/c0027-验证StarRocks3x数据源唯一性校验重复数多字段规则校验";
import "../cases/c0029-验证StarRocks3x数据源唯一性校验重复率多字段规则校验";
import "../cases/c0030-验证StarRocks3x数据源唯一性校验非重复个数规则校验";
import "../cases/c0031-验证StarRocks3x数据源唯一性校验非重复占比规则校验";
import "../cases/c0032-验证StarRocks3x数据源自定义SQL单表规则校验与表删除异常";
import "../cases/c0033-验证StarRocks3x数据源自定义SQL子查询跨表缺失规则校验";
import "../cases/c0034-验证StarRocks3x数据源多表比对规则字段一致性校验";
import "../cases/c0035-验证StarRocks3x数据源多表比对数值差异百分比匹配条件";
import "../cases/c0036-验证StarRocks3x数据源多表比对字符不区分大小写匹配条件";
import "../cases/c0037-验证StarRocks3x数据源多表比对空值与NULL等价匹配条件";
