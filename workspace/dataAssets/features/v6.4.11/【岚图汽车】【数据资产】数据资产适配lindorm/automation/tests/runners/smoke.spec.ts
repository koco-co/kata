// spec: features/2099-01-lt-dq-main-flow/岚图主流程用例整理.md#batch=01-assets-inventory
// intent: SR-2099-01-AI-001
// probe: results/preflight-260519-01/playwright/preflight/probe4-discoveries.json
// page: _shared/pages/2099-01-lt-dq-main-flow/assets-inventory-page.ts
// META: {"id":"smoke","priority":"P1","title":"资产盘点 P1 冒烟自动化入口"}
// SourceRefs: SR-2099-01-AI-001, SR-SELF-RUN-001
import "../cases/c0001-asset-platform-first-entry-guide.spec";
import "../cases/c0002-connected-data-source-statistics.spec";
import "../cases/c0003-data-map-distribution.spec";
import "../cases/c0004-data-catalog-distribution.spec";
import "../cases/c0005-data-value-ranking.spec";
import "../cases/c0006-storage-resource-statistics.spec";
import "../cases/c0007-metadata-change-trend.spec";
import "../cases/c0008-asset-query-trend.spec";
import "../cases/c0009-data-map-level-one-ui.spec";
import "../cases/c0010-data-map-search-interactions.spec";
import "../cases/c0011-data-table-search-results.spec";
import "../cases/c0012-offline-task-search-results.spec";
import "../cases/c0013-realtime-task-search-results.spec";
import "../cases/c0014-api-search-results.spec";
import "../cases/c0015-smart-tag-search-results.spec";
import "../cases/c0016-metric-search-results.spec";
import "../cases/c0017-recent-query.spec";
import "../cases/c0018-asset-type-icons-and-counts.spec";
import "../cases/c0019-data-table-count.spec";
import "../cases/c0020-offline-task-count.spec";
import "../cases/c0021-realtime-task-count.spec";
import "../cases/c0022-api-count.spec";
import "../cases/c0023-smart-tag-count.spec";
import "../cases/c0024-metric-count.spec";
import "../cases/c0025-asset-page-interactions.spec";
import "../cases/c0026-data-source-type-count-order.spec";
import "../cases/c0027-table-source-count.spec";
import "../cases/c0028-asset-page-secondary-interactions.spec";
import "../cases/c0030-table-tags.spec";
import "../cases/c0031-field-tags.spec";
import "../cases/c0032-view-tags.spec";
import "../cases/c0033-history-query-color-coding.spec";
import "../cases/c0034-query-keyword-size.spec";
import "../cases/c0035-query-keyword-count.spec";
import "../cases/c0036-query-keyword-navigation.spec";
import "../cases/c0037-data-map-level-two-table-ui.spec";
import "../cases/c0038-combined-filter-search.spec";
import "../cases/c0039-catalog-actions-and-filters.spec";
import "../cases/c0040-catalog-add.spec";
import "../cases/c0041-catalog-search.spec";
import "../cases/c0042-catalog-edit.spec";
