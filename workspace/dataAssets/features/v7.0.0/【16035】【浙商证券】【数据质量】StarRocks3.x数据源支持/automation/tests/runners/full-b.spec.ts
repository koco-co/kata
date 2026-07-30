// 并行分片 B（t12–t23）：与 full-a/full-c 配合 --workers=3 跨文件并行；分片内仍串行。
// 仅作快速跑批入口，交付以 full.spec.ts 为准。
import "../cases/c0012-验证StarRocks3x数据源完整性校验字段级空串率多字段规则校验";
import "../cases/c0013-验证StarRocks3x数据源准确性校验求和规则校验";
import "../cases/c0014-验证StarRocks3x数据源准确性校验求平均规则校验";
import "../cases/c0015-验证StarRocks3x数据源准确性校验负值比规则校验";
import "../cases/c0017-验证StarRocks3x数据源准确性校验正值比规则校验";
import "../cases/c0018-验证StarRocks3x数据源规范性校验数值-取值范围规则校验";
import "../cases/c0019-验证StarRocks3x数据源规范性校验数值-枚举范围规则校验";
import "../cases/c0020-验证StarRocks3x数据源规范性校验数值-枚举个数规则校验";
import "../cases/c0021-验证StarRocks3x数据源规范性校验字符串-最大长度规则校验";
import "../cases/c0022-验证StarRocks3x数据源规范性校验字符串-最小长度规则校验";
import "../cases/c0023-验证StarRocks3x数据源规范性校验格式-身份证号规则校验";
