// 并行分片 B（t12–t23）：与 full-a/full-c 配合 --workers=3 跨文件并行；分片内仍串行。
// 仅作快速跑批入口，交付以 full.spec.ts 为准。
import "../cases/t12-rule-neg-ratio";
import "../cases/t13-rule-zero-ratio";
import "../cases/t14-rule-pos-ratio";
import "../cases/t15-rule-value-range";
import "../cases/t17-rule-enum-count";
import "../cases/t18-rule-str-maxlen";
import "../cases/t19-rule-str-minlen";
import "../cases/t20-rule-format-idcard";
import "../cases/t21-rule-format-mobile";
import "../cases/t22-rule-format-email";
import "../cases/t23-rule-repeat-rate";
