# Sync Blocker Evidence

Status: blocked_by_product

Target runner:

```bash
PLAYWRIGHT_HTML_OPEN=never KATA_DATAASSETS_ENV=ltqc-local.yaml KATA_ACTIVE_PROJECT=dataAssets KATA_SUITE_NAME='数据资产集成用例' KATA_ALLURE_RESULTS_DIR='workspace/dataAssets/features/v7.0.0/【v700】【数据资产】数据资产集成用例/runs/20260702-193300-dsstd013/allure-results' npx playwright test 'workspace/dataAssets/features/v7.0.0/【v700】【数据资产】数据资产集成用例/automation/tests/runners/full.spec.ts' --output='workspace/dataAssets/features/v7.0.0/【v700】【数据资产】数据资产集成用例/runs/20260702-193300-dsstd013/playwright'
```

Exit code: 1

Playwright result counts from Allure result JSON:

- passed: 3
- failed: 1
- skipped: 0
- total: 4

Failed test:

- `落标检查页覆盖总览、设置/结果列表和新增检查任务入口`
- Failed assertion: `SR-UI-PROBE-20260702-DATA-STANDARD-LTQC: 「数据标准」模块集成测试用例#步骤75-86 should finish with status 2`
- Expected: `2`
- Received: `PENDING:1`
- Timeout: `600000ms`

Artifacts:

- Allure results: `workspace/dataAssets/features/v7.0.0/【v700】【数据资产】数据资产集成用例/runs/20260702-193300-dsstd013/allure-results`
- Playwright last run: `workspace/dataAssets/features/v7.0.0/【v700】【数据资产】数据资产集成用例/runs/20260702-193300-dsstd013/playwright/.last-run.json`
- Playwright error context: `workspace/dataAssets/features/v7.0.0/【v700】【数据资产】数据资产集成用例/runs/20260702-193300-dsstd013/playwright/workspace-dataAssets-featu-987d4--落标检查页覆盖总览、设置-结果列表和新增检查任务入口-chromium/error-context.md`

Platform records created by the failed run:

- Standard check task: `metadata_standard_table_check.id=283`, table `pw_test.test_info_1`, column `money`, partition `dt=2026-05-27`.
- Visible flow record: `metadata_standard_table_check_record.id=2182`, `task_type=10`, jobId `4ubi3nsfk320`, status `1`, execute_end_time `NULL`.
- SQL task record: `metadata_standard_table_check_record.id=2183`, `task_type=0`, jobId `4ubi3nvevra0`, flowJobId `4ubi3nsfk320`, status `1`, execute_end_time `NULL`.
- Column record: `metadata_standard_table_column_check_record.id=7480`, column `money`, status `1`, execute_end_time `NULL`, check_item_result `{1:0,2:0,3:0,4:0,5:0,6:0}`.

Batch evidence:

- SQL job `4ubi3nvevra0` returned status `5` from `/api/rdos/batch/batchJob/getJobStatus`.
- SQL job run list returned `engineJobId=application_1782969539639_1454`, `expendId=920470`, `status=5`, `execTime=363`.
- Flow job `4ubi3nsfk320` returned status `8` from `/api/rdos/batch/batchJob/getJobStatus`.

HDFS result evidence:

- The SQL job wrote result files under `hdfs://ns1/dtInsight/hive/warehouse/pw_test.db/dtstack_dq_bidtable_check_result_data/job_id=4ubi3nvevra0`.
- `hdfs dfs -ls -h` found 6 parquet files, each about 1.9K, modified at `2026-07-02 19:26`.

Backend sync evidence:

- Metadata service logs repeatedly show:
  - lock key `sync_standard_table_check_status:4ubi3nvevra0:5`
  - query: `select * from pw_test.dtstack_dq_bidtable_check_result_data where tenant_id=10481 and package_id=2742 and job_key='4ubi3nvevra0'`
- The backend query omits the `job_id='4ubi3nvevra0'` partition filter even though the result table has `numPartitions=888` and Location `hdfs://ns1/dtInsight/hive/warehouse/pw_test.db/dtstack_dq_bidtable_check_result_data`.
- Manual exact sync call `/dmetadata/v1/standardTableCheck/syncStatus` with body `{"id":2183}` timed out after 180000ms.
- After the exact sync timeout, platform API and MySQL still showed `2182`, `2183`, and `7480` as status `1` with `execute_end_time=NULL`.

Unfinished source-case scope:

- Completed before the blocker: preconditions, standard definition, standard mapping, and first standard-check task creation/execution submission.
- Blocked at source case steps 75-86 final assertion because platform did not sync SQL success into the visible standard-check result record.
- Not executed after the blocker: source case steps 87-136 for dynamic partition, `test_info_2.amount`, car model temporary checks, and non-compliance scenarios.

Next runnable fix path:

1. Fix platform sync so `StandardTableCheckRecordService.queryCheckRecordResult` queries the result table with the `job_id` partition condition, or otherwise make the Hive result-table query complete reliably.
2. Confirm `/dmetadata/v1/standardTableCheck/syncStatus` for exact SQL task record `2183` can return and update `2182/2183/7480`.
3. Rerun the full runner with a new run id and require `full.spec.ts` exit code 0, Allure result artifacts, and visible platform result records for every source-case standard-check scenario.
