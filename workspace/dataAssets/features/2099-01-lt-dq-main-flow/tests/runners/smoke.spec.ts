// spec: features/2099-01-lt-dq-main-flow/岚图主流程用例整理.md#batch=01-assets-inventory
// intent: SR-2099-01-AI-001
// probe: results/preflight-260519-01/playwright/preflight/probe4-discoveries.json
// page: _shared/pages/2099-01-lt-dq-main-flow/assets-inventory-page.ts
// META: {"id":"smoke","priority":"P1","title":"资产盘点 P1 冒烟自动化入口"}
// SourceRefs: SR-2099-01-AI-001, SR-SELF-RUN-001
import "../cases/t01-assets-inventory-stats";
import "../cases/t02-assets-inventory-ui-contract";
import "../cases/t03-metadata-data-map-shell";
import "../cases/t04-metadata-sync-model-shell";
import "../cases/t05-standard-statistic-check-shell";
import "../cases/t06-model-build-table-shell";
import "../cases/t07-data-quality-shell";
import "../cases/t08-data-security-shell";
import "../cases/t09-platform-management-shell";
import "../cases/t10-assets-inventory-trends";
import "../cases/t11-model-build-table-type-hdfs";
import "../cases/t12-metadata-search-statistics";
import "../cases/t13-data-quality-report-config";
import "../cases/t14-standard-directory-mapping-shell";
import "../cases/t15-data-quality-result-filters";
import "../cases/t16-metadata-data-map-secondary-shell";
import "../cases/t17-data-quality-overview-dashboard";
import "../cases/t17-metadata-table-detail-shell";
import "../cases/t18-standard-data-standard-detail-shell";
import "../cases/t19-metadata-data-catalog-actions-shell";
import "../cases/t20-data-quality-common-config-json-shell";
import "../cases/t21-metadata-sort-controls-shell";
import "../cases/t22-standard-industry-template-shell";
import "../cases/t23-data-quality-rule-task-list-contract";
import "../cases/t24-metadata-table-detail-range-shell";
import "../cases/t25-standard-basis-code-database-shell";
import "../cases/t26-metadata-table-detail-actions-shell";
import "../cases/t26-data-quality-ruleset-config-shell";
import "../cases/t27-data-quality-datamap-result-search-shell";
import "../cases/t28-metadata-hot-tags-query-shell";
import "../cases/t28-data-security-extra-shell";
import "../cases/t29-data-quality-sampling-config-shell";
import "../cases/t30-data-quality-project-management";
import "../cases/t30-standard-check-task-result-shell";
import "../cases/t31-data-quality-permissions";
import "../cases/t31-standard-statistic-status-count";
import "../cases/t32-data-quality-sparkthrift-completeness-validation";
import "../cases/t32-metadata-datamap-overview-stats";
import "../cases/t33-metadata-table-detail-sidebar-shell";
import "../cases/t34-standard-mapping-boundaries-shell";
import "../cases/t35-standard-directory-create-edit-shell";
import "../cases/t36-metadata-non-table-detail-shell";
import "../cases/t37-metadata-view-detail-shell";
import "../cases/t38-metadata-meta-model-properties-shell";
import "../cases/t39-metadata-management-lists-shell";
import "../cases/t40-standard-directory-delete-limit-shell";
import "../cases/t41-standard-cross-module-binding-shell";
import "../cases/t42-model-build-design-approval-shell";
