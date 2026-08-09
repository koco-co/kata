"""Controlled three-step rule-task creation for SQL-merge candidates."""

from __future__ import annotations

import json
from dataclasses import dataclass
from typing import TYPE_CHECKING, Never, cast
from urllib.parse import urlsplit

from playwright.sync_api import expect

from .api_client import (
    DqApiClient,
    PersistedRuleRecord,
    SourcePackageOption,
    decode_persisted_rules,
)
from .form_controls import ExactFormControls
from .rule_contract import assert_persisted_fingerprint
from .rules import ProvisionedNames, RuleStrength, TaskSpec
from .screen_base import UI_TIMEOUT_MS, SqlMergeScreenBase, SqlMergeUiError
from .write_models import ProvisionedRuleReadback, RuleSetRuleReadback

if TYPE_CHECKING:
    from collections.abc import Mapping

    from playwright.sync_api import Locator, Response

    from .write_models import WriteScenario

_CHECK_MONITOR = "/dassets/v1/valid/monitor/checkMonitor"
_RULE_SET_LIST = "/dassets/v1/valid/monitorRulePackage/ruleSetList"
_RULE_TYPES = "/dassets/v1/valid/monitorRulePackage/ruleTypes"
_IMPORT_RULES = "/dassets/v1/valid/monitorRulePackage/getMonitorRule"
_ADD_MONITOR = "/dassets/v1/valid/monitor/add"


@dataclass(frozen=True, slots=True)
class SqlMergeTaskProvisioningScreen(SqlMergeScreenBase):
    """Create an isolated manual Spark task and verify every imported rule."""

    @property
    def controls(self) -> ExactFormControls:
        """Return strict form primitives for the active step."""
        return ExactFormControls(self.page)

    @property
    def api(self) -> DqApiClient:
        """Return the authenticated identity and option client."""
        return DqApiClient(self.page, self.navigation.platform_context)

    def create(
        self,
        *,
        scenario: WriteScenario,
        specification: TaskSpec,
        names: ProvisionedNames,
        rules: tuple[RuleSetRuleReadback, ...],
    ) -> tuple[str, tuple[ProvisionedRuleReadback, ...]]:
        """Create the task and rebind package records to task-owned MonitorRule IDs."""
        self.navigation.open("/dq/rule/add", landmark="新建单表校验规则")
        base_form = self.page.locator('form[name="ruleBasicInfo"]:visible')
        expect(base_form, "规则任务新增页必须展示监控对象表单").to_have_count(
            1,
            timeout=UI_TIMEOUT_MS,
        )
        self._configure_object_step(
            base_form,
            scenario=scenario,
            specification=specification,
            names=names,
        )
        source_packages = self._advance_to_import(
            scenario=scenario,
            names=names,
        )
        rule_types = self._import_rules(
            names=names,
            source_packages=source_packages,
            expected=rules,
        )
        return self._configure_and_save(
            scenario=scenario,
            specification=specification,
            names=names,
            source_packages=source_packages,
            rule_types=rule_types,
            rules=rules,
        )

    def _configure_object_step(
        self,
        root: Locator,
        *,
        scenario: WriteScenario,
        specification: TaskSpec,
        names: ProvisionedNames,
    ) -> None:
        self.controls.fill(root, label="规则名称", value=names.task_name, index=-1)
        self.controls.select(
            root,
            label="选择数据源",
            value=f"{self.datasource.name}（SparkThrift2.x）",  # noqa: RUF001
            index=-1,
        )
        self.controls.select(
            root,
            label="选择数据库",
            value=self.datasource.schema,
            index=-1,
        )
        self.controls.select(
            root,
            label="选择数据表",
            value=scenario.table_name,
            index=-1,
        )
        if specification.partition_filter is not None:
            self._choose_radio(root, "手动输入分区")
            partition = root.locator('input[placeholder^="手动输入分区的格式为"]:visible')
            expect(partition, "手动分区必须展示唯一输入框").to_have_count(
                1,
                timeout=UI_TIMEOUT_MS,
            )
            partition.fill(specification.partition_filter)
            expect(partition).to_have_value(
                specification.partition_filter,
                timeout=UI_TIMEOUT_MS,
            )
        self._configure_sampling(root, specification.sampling_percent)

    def _configure_sampling(self, root: Locator, percent: int | None) -> None:
        switch = root.locator(".ant-switch:visible")
        expect(switch, "监控对象必须展示唯一抽样检查总开关").to_have_count(
            1,
            timeout=UI_TIMEOUT_MS,
        )
        if percent is None:
            expect(switch).to_have_attribute("aria-checked", "false")
            return
        switch.click()
        expect(switch).to_have_attribute("aria-checked", "true")
        sampling = root.get_by_text("抽样设置", exact=True)
        expect(sampling, "抽样开启后必须展示抽样设置复选框").to_have_count(
            1,
            timeout=UI_TIMEOUT_MS,
        )
        sampling.click()
        group = root.locator(".ant-input-group.ant-input-group-compact:visible")
        expect(group, "抽样设置必须展示类型和阈值组合控件").to_have_count(
            1,
            timeout=UI_TIMEOUT_MS,
        )
        self.controls.select_control(
            group.locator(".ant-select:visible"),
            value="百分比抽样",
            label="抽样设置",
        )
        threshold = group.locator('input[role="spinbutton"]:visible')
        expect(threshold, "百分比抽样必须展示唯一阈值输入框").to_have_count(
            1,
            timeout=UI_TIMEOUT_MS,
        )
        threshold.fill(str(percent))
        expect(threshold).to_have_value(str(percent), timeout=UI_TIMEOUT_MS)

    def _advance_to_import(
        self,
        *,
        scenario: WriteScenario,
        names: ProvisionedNames,
    ) -> tuple[SourcePackageOption, ...]:
        next_button = self.page.get_by_role("button", name="下一步", exact=True)
        with (
            self.page.expect_response(
                lambda response: self._is_post(response, _RULE_SET_LIST),
                timeout=UI_TIMEOUT_MS,
            ) as packages_info,
            self.page.expect_response(
                lambda response: self._is_post(response, _CHECK_MONITOR),
                timeout=UI_TIMEOUT_MS,
            ) as check_info,
        ):
            expect(next_button, "监控对象步骤必须提供下一步").to_be_enabled(timeout=UI_TIMEOUT_MS)
            next_button.click()
        check = check_info.value
        self._require_response(check, _CHECK_MONITOR)
        self.api.require_unused_monitor_response(check)
        self._assert_check_request(check, scenario=scenario, names=names)
        source_response = packages_info.value
        self._require_response(source_response, _RULE_SET_LIST)
        self._assert_source_package_request(source_response, scenario=scenario)
        packages = self.api.source_packages_from_response(source_response)
        if tuple(package.package_name for package in packages) != names.package_names:
            self._fail("任务引入工具必须按顺序只返回本 case 新建的实体规则包")
        if len({package.table_id for package in packages}) != 1:
            self._fail("所有实体规则包必须绑定同一张 canonical 数据表")
        expect(
            self.page.locator(".ruleFormWrapper:visible"),
            "checkMonitor 成功后必须进入监控规则步骤",
        ).to_be_visible(timeout=UI_TIMEOUT_MS)
        return packages

    def _import_rules(
        self,
        *,
        names: ProvisionedNames,
        source_packages: tuple[SourcePackageOption, ...],
        expected: tuple[RuleSetRuleReadback, ...],
    ) -> tuple[int, ...]:
        root = self.page.locator(".ruleFormWrapper:visible")
        with self.page.expect_response(
            lambda response: self._is_post(response, _RULE_TYPES),
            timeout=UI_TIMEOUT_MS,
        ) as types_info:
            self._select_all(root, label="规则包", expected_options=names.package_names)
        types_response = types_info.value
        self._require_response(types_response, _RULE_TYPES)
        self._assert_rule_types_request(types_response, source_packages=source_packages)
        rule_types = self.api.rule_types_from_response(types_response)
        self._select_all(root, label="规则类型", expected_options=())

        imported_forms = root.locator(".ruleForm")
        expect(imported_forms).to_have_count(0, timeout=UI_TIMEOUT_MS)
        with self.page.expect_response(
            lambda response: self._is_post(response, _IMPORT_RULES),
            timeout=UI_TIMEOUT_MS,
        ) as import_info:
            button = root.get_by_role("button", name="引入", exact=True)
            expect(button, "规则引入工具必须提供可用引入按钮").to_be_enabled(timeout=UI_TIMEOUT_MS)
            button.click()
        response = import_info.value
        self._require_response(response, _IMPORT_RULES)
        self._assert_import_request(
            response,
            source_packages=source_packages,
            rule_types=rule_types,
        )
        actual = self.api.imported_rules_from_response(response)
        self._verify_imported_rules(actual, expected=expected)
        expect(imported_forms, "规则引入必须完整覆盖 typed 子规则表单").to_have_count(
            len(expected),
            timeout=UI_TIMEOUT_MS,
        )
        descriptions = {rule.description for rule in expected}
        for description in descriptions:
            expected_count = sum(rule.description == description for rule in expected)
            expect(
                root.get_by_text(description, exact=True),
                "引入规则必须按父卡描述回显全部 executable rules",
            ).to_have_count(expected_count, timeout=UI_TIMEOUT_MS)
        next_button = self.page.get_by_role("button", name="下一步", exact=True)
        expect(next_button, "监控规则步骤必须提供下一步").to_be_enabled(timeout=UI_TIMEOUT_MS)
        next_button.click()
        expect(self.page.locator('form[name="schedule"]:visible')).to_have_count(
            1,
            timeout=UI_TIMEOUT_MS,
        )
        return rule_types

    def _configure_and_save(  # noqa: PLR0913
        self,
        *,
        scenario: WriteScenario,
        specification: TaskSpec,
        names: ProvisionedNames,
        source_packages: tuple[SourcePackageOption, ...],
        rule_types: tuple[int, ...],
        rules: tuple[RuleSetRuleReadback, ...],
    ) -> tuple[str, tuple[ProvisionedRuleReadback, ...]]:
        root = self.page.locator('form[name="schedule"]:visible')
        self._choose_radio(root, specification.schedule_mode)
        package_item = self.controls.item(root, "规则拼接包")
        package_input = package_item.locator('input[role="spinbutton"]:visible')
        expect(package_input, "规则拼接包必须展示唯一数值输入框").to_have_count(
            1,
            timeout=UI_TIMEOUT_MS,
        )
        package_input.fill(str(specification.merge_batch_size))
        expect(package_input).to_have_value(
            str(specification.merge_batch_size),
            timeout=UI_TIMEOUT_MS,
        )
        resources = tuple(
            resource
            for resource in self.api.resource_groups()
            if resource.resource_name == specification.resource_group
        )
        if len(resources) != 1:
            self._fail("Spark 任务必须唯一解析 canonical 默认资源组")
        self.controls.select(
            root,
            label="资源组",
            value=specification.resource_group,
            index=-1,
        )
        self._choose_radio(root, "T+1生成")
        self._choose_radio(root, "不限制")
        no_report = root.locator("label.ant-checkbox-wrapper").filter(
            has=self.page.get_by_text("无需生成报告", exact=True)
        )
        expect(no_report, "报告配置必须展示无需生成报告开关").to_have_count(
            1,
            timeout=UI_TIMEOUT_MS,
        )
        expect(no_report.locator('input[type="checkbox"]')).not_to_be_checked()
        self.controls.fill(root, label="报告名称", value=names.report_name, index=-1)
        self.controls.select(root, label="报告类型", value="质量报告", index=-1)
        self._select_all(root, label="报告统计规则范围", expected_options=())
        self._choose_radio(root, specification.report_mode)
        self.controls.choose(
            root,
            label="是否需要车辆信息",
            value="是" if specification.include_vehicle else "否",
        )

        create = self.page.get_by_role("button", name="新建", exact=True)
        with self.page.expect_response(
            lambda response: self._is_post(response, _ADD_MONITOR),
            timeout=UI_TIMEOUT_MS,
        ) as save_info:
            expect(create, "新增任务调度步骤必须提供新建按钮").to_be_enabled(timeout=UI_TIMEOUT_MS)
            create.click()
        response = save_info.value
        self._require_response(response, _ADD_MONITOR)
        self._assert_add_request(
            response,
            scenario=scenario,
            specification=specification,
            names=names,
            source_packages=source_packages,
            rule_types=rule_types,
            rules=rules,
            resource_id=resources[0].resource_id,
        )
        created_id = self.api.created_monitor_id_from_response(response)
        tasks = tuple(
            task
            for task in self.api.query_tasks(table_name=scenario.table_name)
            if task.monitor_id == created_id
            and task.task_name == names.task_name
            and task.table_name == scenario.table_name
            and task.datasource_id == self.datasource.assets.id
            and task.datasource_name == self.datasource.name
            and task.datasource_type_name == "SparkThrift2.x"
        )
        if len(tasks) != 1:
            self._fail("任务保存后必须按返回 monitorId 与唯一任务/表/Spark 数据源精确回读")
        return created_id, self._bind_monitor_rules(
            self.api.monitor_rules(monitor_id=created_id),
            expected=rules,
        )

    def _select_all(
        self,
        root: Locator,
        *,
        label: str,
        expected_options: tuple[str, ...],
    ) -> None:
        item = self.controls.item(root, label)
        selector = item.locator(".ant-select:visible")
        expect(selector, f"{label}必须展示唯一多选控件").to_have_count(
            1,
            timeout=UI_TIMEOUT_MS,
        )
        selector.locator(".ant-select-selector").click()
        dropdown = self.page.locator(".ant-select-dropdown:visible").last
        expect(dropdown, f"{label}必须打开选项面板").to_be_visible(timeout=UI_TIMEOUT_MS)
        for option in expected_options:
            expect(
                dropdown.get_by_text(option, exact=True), f"{label}必须提供{option}"
            ).to_have_count(
                1,
                timeout=UI_TIMEOUT_MS,
            )
        all_option = dropdown.get_by_text("全部", exact=True)
        expect(all_option, f"{label}必须唯一提供全部选项").to_have_count(
            1,
            timeout=UI_TIMEOUT_MS,
        )
        all_option.click()
        self.page.keyboard.press("Escape")
        expect(selector, f"{label}必须回显全部").to_contain_text("全部", timeout=UI_TIMEOUT_MS)

    @staticmethod
    def _verify_imported_rules(
        actual: tuple[PersistedRuleRecord, ...],
        *,
        expected: tuple[RuleSetRuleReadback, ...],
    ) -> None:
        if len(actual) != len(expected):
            SqlMergeTaskProvisioningScreen._fail("引入响应必须完整返回所有 typed 子规则")
        actual_by_identity = {(item.description, item.function_name): item for item in actual}
        expected_identities = {
            (readback.description, readback.expected.function_name) for readback in expected
        }
        if len(actual_by_identity) != len(actual) or set(actual_by_identity) != expected_identities:
            SqlMergeTaskProvisioningScreen._fail(
                "引入响应必须按父卡描述与函数返回全部 executable rules"
            )
        for readback in expected:
            item = actual_by_identity[(readback.description, readback.expected.function_name)]
            rule = readback.expected
            strength = 1 if rule.strength is RuleStrength.WEAK else 2
            if (
                item.persisted_id != readback.rule_set_record_id
                or item.function_name != rule.function_name
                or item.description != readback.description
                or item.fields != rule.fields
                or item.filter_expression != rule.filter_expression
                or item.strength != strength
            ):
                SqlMergeTaskProvisioningScreen._fail(
                    "引入响应必须逐规则匹配持久化ID/函数/描述/字段/过滤条件/强弱属性"
                )
            assert_persisted_fingerprint(
                submitted=readback.semantic_fingerprint,
                persisted=item.semantic_fingerprint,
            )

    @staticmethod
    def _bind_monitor_rules(
        actual: tuple[PersistedRuleRecord, ...],
        *,
        expected: tuple[RuleSetRuleReadback, ...],
    ) -> tuple[ProvisionedRuleReadback, ...]:
        if len(actual) != len(expected):
            SqlMergeTaskProvisioningScreen._fail(
                "monitorRule/getRules 必须返回全部 task-owned executable rules"
            )
        actual_by_identity = {(item.description, item.function_name): item for item in actual}
        expected_identities = {(item.description, item.expected.function_name) for item in expected}
        if len(actual_by_identity) != len(actual) or set(actual_by_identity) != expected_identities:
            SqlMergeTaskProvisioningScreen._fail("task-owned rules 必须按父卡描述与函数精确绑定")
        bound: list[ProvisionedRuleReadback] = []
        for source in expected:
            item = actual_by_identity[(source.description, source.expected.function_name)]
            strength = 1 if source.expected.strength is RuleStrength.WEAK else 2
            if (
                item.function_name != source.expected.function_name
                or item.fields != source.expected.fields
                or item.filter_expression != source.expected.filter_expression
                or item.strength != strength
            ):
                SqlMergeTaskProvisioningScreen._fail(
                    "task-owned rule 必须保留字段/过滤/强弱/函数完整语义"
                )
            assert_persisted_fingerprint(
                submitted=source.semantic_fingerprint,
                persisted=item.semantic_fingerprint,
            )
            bound.append(
                ProvisionedRuleReadback(
                    expected=source.expected,
                    description=source.description,
                    rule_set_record_id=source.rule_set_record_id,
                    monitor_rule_id=item.persisted_id,
                    semantic_fingerprint=item.semantic_fingerprint,
                )
            )
        return tuple(bound)

    def _assert_check_request(
        self,
        response: Response,
        *,
        scenario: WriteScenario,
        names: ProvisionedNames,
    ) -> None:
        body = self._body(response)
        expected_partition = scenario.task.partition_filter if scenario.task is not None else None
        if (
            body.get("tableName") != scenario.table_name
            or body.get("schemaName") != self.datasource.schema
            or body.get("dataSourceId") != self.datasource.assets.id
            or body.get("ruleName") != names.task_name
            or body.get("partition") != expected_partition
        ):
            self._fail("checkMonitor 必须绑定唯一任务名及精确数据源/库/表/分区")

    def _assert_source_package_request(
        self,
        response: Response,
        *,
        scenario: WriteScenario,
    ) -> None:
        body = self._body(response)
        if body != {
            "dataSourceId": self.datasource.assets.id,
            "tableName": scenario.table_name,
            "schemaName": self.datasource.schema,
        }:
            self._fail("ruleSetList 必须仅查询当前数据源/库/表")

    @classmethod
    def _assert_rule_types_request(
        cls,
        response: Response,
        *,
        source_packages: tuple[SourcePackageOption, ...],
    ) -> None:
        if cls._body(response).get("packageIdList") != [
            int(package.package_id) for package in source_packages
        ]:
            cls._fail("ruleTypes 必须查询当前 case 全部实体规则包 ID")

    @classmethod
    def _assert_import_request(
        cls,
        response: Response,
        *,
        source_packages: tuple[SourcePackageOption, ...],
        rule_types: tuple[int, ...],
    ) -> None:
        body = cls._body(response)
        if body != {
            "packageIdList": [int(package.package_id) for package in source_packages],
            "ruleTypeList": list(rule_types),
        }:
            cls._fail("getMonitorRule 必须按已回读包 ID 与全部规则类型执行覆盖引入")

    def _assert_add_request(  # noqa: PLR0913
        self,
        response: Response,
        *,
        scenario: WriteScenario,
        specification: TaskSpec,
        names: ProvisionedNames,
        source_packages: tuple[SourcePackageOption, ...],
        rule_types: tuple[int, ...],
        rules: tuple[RuleSetRuleReadback, ...],
        resource_id: str,
    ) -> None:
        body = self._body(response)
        package_ids = [int(package.package_id) for package in source_packages]
        imported = body.get("rules")
        if (
            body.get("ruleName") != names.task_name
            or body.get("dataSourceId") != self.datasource.assets.id
            or body.get("schemaName") != self.datasource.schema
            or body.get("tableName") != scenario.table_name
            or body.get("partition") != specification.partition_filter
            or body.get("packageCount") != specification.merge_batch_size
            or body.get("packageIds") != package_ids
            or body.get("ruleTypes") != list(rule_types)
            or body.get("regularType") != 0
            or not isinstance(imported, list)
            or len(cast("list[object]", imported)) != len(rules)
        ):
            self._fail("monitor/add 必须绑定 typed 任务、数据坐标、规则与包配置")
        imported_rules = cast("list[object]", imported)
        self._verify_imported_rules(
            decode_persisted_rules({"success": True, "data": imported_rules}),
            expected=rules,
        )
        expansion = self._json_object(body.get("expansion"), "task expansion")
        if expansion.get("packageIds") != package_ids or expansion.get("ruleTypes") != list(
            rule_types
        ):
            self._fail("任务 expansion 必须保存当前引入包及规则类型")
        self._assert_sampling(expansion, specification.sampling_percent)
        schedule = self._json_object(body.get("scheduleConf"), "scheduleConf")
        if (
            str(schedule.get("periodType")) != "5"
            or str(schedule.get("yarnResourceId")) != resource_id
            or str(body.get("periodType")) != "5"
        ):
            self._fail("monitor/add 必须保存手动触发(5)与精确 Spark 资源组 ID")
        report_param = self._mapping(body.get("monitorReportParam"), "monitorReportParam")
        report = self._mapping(report_param.get("monitorReport"), "monitorReport")
        expected_mode = 1 if specification.report_mode == "展示最新结果" else 2
        if (
            report.get("reportName") != names.report_name
            or report.get("reportShowResultType") != expected_mode
            or report.get("needCar") != int(specification.include_vehicle)
        ):
            self._fail("monitor/add 必须保存唯一报告名、展示模式与车辆信息设置")

    @classmethod
    def _assert_sampling(cls, expansion: Mapping[str, object], percent: int | None) -> None:
        if percent is None:
            if expansion.get("openSample") not in {None, 0}:
                cls._fail("未声明抽样的任务不得开启 sample expansion")
            return
        sample = cls._mapping(expansion.get("sampleDto"), "sampleDto")
        if (
            expansion.get("openSample") != 1
            or sample.get("openSampleCheck") != 1
            or sample.get("sampleType") != 1
            or sample.get("threshold") != percent
        ):
            cls._fail("50% 抽样任务必须保存 openSample/sampleType/threshold 精确配置")

    @staticmethod
    def _choose_radio(root: Locator, value: str) -> None:
        label = root.locator("label.ant-radio-wrapper").filter(
            has=root.get_by_text(value, exact=True)
        )
        expect(label, f"表单必须唯一展示单选项“{value}”").to_have_count(
            1,
            timeout=UI_TIMEOUT_MS,
        )
        label.click()
        expect(label.locator('input[type="radio"]')).to_be_checked()

    @staticmethod
    def _is_post(response: Response, path: str) -> bool:
        return response.request.method == "POST" and urlsplit(response.url).path == path

    @classmethod
    def _require_response(cls, response: Response, path: str) -> None:
        if not cls._is_post(response, path) or not response.ok:
            cls._fail("规则任务关键 POST 必须命中精确路径并返回成功")

    @staticmethod
    def _body(response: Response) -> Mapping[str, object]:
        value = cast("object", response.request.post_data_json)
        return SqlMergeTaskProvisioningScreen._mapping(value, "request body")

    @staticmethod
    def _json_object(value: object, label: str) -> Mapping[str, object]:
        if not isinstance(value, str):
            SqlMergeTaskProvisioningScreen._fail(f"{label} 必须是 JSON 字符串")
        try:
            decoded = cast("object", json.loads(value))
        except (TypeError, ValueError) as error:
            message = f"{label} 必须是有效 JSON object"
            raise SqlMergeUiError(message) from error
        return SqlMergeTaskProvisioningScreen._mapping(decoded, label)

    @staticmethod
    def _mapping(value: object, label: str) -> Mapping[str, object]:
        if not isinstance(value, dict):
            SqlMergeTaskProvisioningScreen._fail(f"{label} 必须是 object")
        untyped = cast("dict[object, object]", value)
        if any(not isinstance(key, str) for key in untyped):
            SqlMergeTaskProvisioningScreen._fail(f"{label} 必须使用文本字段名")
        return cast("Mapping[str, object]", untyped)

    @staticmethod
    def _fail(message: str) -> Never:
        raise SqlMergeUiError(message)
