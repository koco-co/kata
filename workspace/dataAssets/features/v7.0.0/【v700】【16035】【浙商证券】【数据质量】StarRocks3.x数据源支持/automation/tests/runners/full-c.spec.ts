// 并行分片 C（t24–t37）：与 full-a/full-b 配合 --workers=3 跨文件并行；分片内仍串行。
// 仅作快速跑批入口，交付以 full.spec.ts 为准。
import "../cases/t24-rule-distinct-count";
import "../cases/t25-rule-distinct-ratio";
import "../cases/t26-rule-custom-sql";
import "../cases/t27-rule-custom-sql-join";
import "../cases/t29-rule-null-count-multi";
import "../cases/t30-rule-null-rate-multi";
import "../cases/t31-rule-blank-count-multi";
import "../cases/t32-rule-blank-rate-multi";
import "../cases/t33-rule-repeat-count-multi";
import "../cases/t34-rule-repeat-rate-multi";
import "../cases/t35-task-query";
import "../cases/t36-rule-edit-rerun";
import "../cases/t37-rule-delete";
