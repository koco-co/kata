// 并行分片 A（t01–t11）：与 full-b/full-c 配合 --workers=3 跨文件并行；分片内仍串行。
// 仅作快速跑批入口，交付以 full.spec.ts 为准。
import "../cases/c0001-验证StarRocks3x数据源经引入与质量项目授权后数据质量可选用";
import "../cases/c0002-验证概览页正确统计StarRocks3x数据源规则任务数据";
import "../cases/c0003-验证规则集导入规则包后直接执行批量校验StarRocks3x数据表";
import "../cases/c0004-验证StarRocks3x数据源完整性校验表级表行数规则校验";
import "../cases/c0005-验证StarRocks3x数据源完整性校验字段级空值数单字段规则校验";
import "../cases/c0006-验证StarRocks3x数据源完整性校验字段级空值数多字段规则校验";
import "../cases/c0007-验证StarRocks3x数据源完整性校验字段级空值率单字段规则校验";
import "../cases/c0008-验证StarRocks3x数据源完整性校验字段级空值率多字段规则校验";
import "../cases/c0009-验证StarRocks3x数据源完整性校验字段级空串数单字段规则校验";
import "../cases/c0010-验证StarRocks3x数据源完整性校验字段级空串数多字段规则校验";
import "../cases/c0011-验证StarRocks3x数据源完整性校验字段级空串率单字段规则校验";
