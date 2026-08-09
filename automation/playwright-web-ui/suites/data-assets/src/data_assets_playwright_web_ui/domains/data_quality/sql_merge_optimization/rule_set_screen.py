"""Controlled rule-set creation and exact persisted readback."""

from __future__ import annotations

from dataclasses import dataclass
from typing import TYPE_CHECKING, cast
from urllib.parse import urlsplit

from playwright.sync_api import expect

from .api_client import DqApiClient, RuleSetRecord
from .form_controls import ExactFormControls
from .rule_contract import (
    RulePayloadFingerprint,
    assert_persisted_fingerprint,
    assert_rule_card_payload_matches_spec,
)
from .rule_editor import TypedRuleEditor
from .rules import ProvisionedNames, RuleSetSpec, RuleStrength
from .screen_base import UI_TIMEOUT_MS, SqlMergeScreenBase, SqlMergeUiError
from .write_models import RuleSetRuleReadback, WriteScenario

if TYPE_CHECKING:
    from collections.abc import Mapping

    from playwright.sync_api import Locator, Response

_CHECK_RULE_SET_PATH = "/dassets/v1/valid/monitorRuleSet/checkRuleSet"
_ADD_RULE_SET_PATH = "/dassets/v1/valid/monitorRuleSet/add"


@dataclass(frozen=True, slots=True)
class SqlMergeRuleSetScreen(SqlMergeScreenBase):
    """Create an isolated table-bound rule set through the current product UI."""

    @property
    def controls(self) -> ExactFormControls:
        """Return exact form primitives bound to the active page."""
        return ExactFormControls(self.page)

    @property
    def api(self) -> DqApiClient:
        """Return the authenticated identity/readback client."""
        return DqApiClient(self.page, self.navigation.platform_context)

    def create(
        self,
        *,
        scenario: WriteScenario,
        specification: RuleSetSpec,
        names: ProvisionedNames,
    ) -> tuple[str, tuple[RuleSetRuleReadback, ...]]:
        """Create all physical packages/rules and verify the persisted detail response."""
        specification.require_current_ui_compatible()
        specification.require_source_backed_editor()
        self._require_unused_table(scenario.table_name)
        self.navigation.open("/dq/ruleSet/add", landmark="新建规则集")
        page_root = self.page.locator("main:visible, .ant-layout-content:visible").last
        base_form = page_root.locator('form[name="ruleBasicInfo"]:visible')
        expect(base_form, "规则集新增页必须展示基础信息表单").to_have_count(
            1,
            timeout=UI_TIMEOUT_MS,
        )
        self.controls.select(
            base_form,
            label="选择数据源",
            value=f"{self.datasource.name}（SparkThrift2.x）",  # noqa: RUF001
            index=-1,
        )
        self.controls.select(
            base_form,
            label="选择数据库",
            value=self.datasource.schema,
            index=-1,
        )
        self.controls.select(
            base_form,
            label="选择数据表",
            value=scenario.table_name,
            index=-1,
        )
        self.controls.fill(
            base_form,
            label="规则集描述",
            value=names.rule_set_description,
            index=-1,
        )
        self._declare_package_names(base_form, names.package_names)
        next_button = page_root.get_by_role("button", name="下一步", exact=True)
        with self.page.expect_response(
            lambda response: self._is_post(response, _CHECK_RULE_SET_PATH),
            timeout=UI_TIMEOUT_MS,
        ) as check_info:
            expect(next_button, "规则集基础信息必须提供下一步").to_be_enabled(timeout=UI_TIMEOUT_MS)
            next_button.click()
        self._require_response(check_info.value, path=_CHECK_RULE_SET_PATH)
        self.api.require_unused_rule_set_response(check_info.value)
        self._assert_check_request(
            check_info.value,
            scenario=scenario,
            names=names,
        )

        editor = TypedRuleEditor(self.page)
        card_offset = 0
        for package_index, package_spec in enumerate(specification.source_packages):
            package = self._new_package(expected_index=package_index)
            package_name = names.package_names[package_index]
            self.controls.select_control(
                package.locator(".ruleSetMonitor__packageSelect:visible"),
                value=package_name,
                label="规则包名称",
            )
            for local_index, card in enumerate(package_spec.source_cards):
                description = names.card_descriptions[card_offset + local_index]
                editor.add(package, card=card, description=description)
            card_offset += len(package_spec.source_cards)

        save = page_root.get_by_role("button", name="保存", exact=True).last
        with self.page.expect_response(
            lambda response: self._is_post(response, _ADD_RULE_SET_PATH),
            timeout=UI_TIMEOUT_MS,
        ) as save_info:
            expect(save, "规则集必须提供最终保存按钮").to_be_enabled(timeout=UI_TIMEOUT_MS)
            save.click()
        save_response = save_info.value
        self._require_response(save_response, path=_ADD_RULE_SET_PATH)
        submitted_fingerprints = self._assert_add_request(
            save_response,
            scenario=scenario,
            names=names,
            specification=specification,
        )
        created_id = self.api.created_rule_set_id_from_response(save_response)
        persisted = self._exact_created_record(scenario=scenario, names=names)
        if persisted.rule_set_id != created_id:
            message = "规则集 add 返回 ID 必须与 pageQuery/detail 持久化 ID 一致"
            raise SqlMergeUiError(message)
        readback = self._verify_detail(
            persisted,
            specification=specification,
            names=names,
            submitted_fingerprints=submitted_fingerprints,
        )
        return persisted.rule_set_id, readback

    def _declare_package_names(self, base_form: Locator, names: tuple[str, ...]) -> None:
        """Declare every unique package name in step one before package assignment."""
        rows = base_form.locator(".ant-table-tbody .ant-table-row")
        expect(rows, "规则集基础信息必须默认提供一个规则包名称行").to_have_count(
            1,
            timeout=UI_TIMEOUT_MS,
        )
        for index, name in enumerate(names):
            if index > 0:
                add = base_form.get_by_role("button", name="新增", exact=True)
                expect(add, "规则包名称表必须提供新增入口").to_be_enabled(timeout=UI_TIMEOUT_MS)
                add.click()
                expect(rows, "新增必须只增加一个规则包名称行").to_have_count(
                    index + 1,
                    timeout=UI_TIMEOUT_MS,
                )
            control = rows.nth(index).locator("input:visible")
            expect(control, "每个规则包名称行必须只有一个输入框").to_have_count(
                1,
                timeout=UI_TIMEOUT_MS,
            )
            control.fill(name)
            expect(control).to_have_value(name, timeout=UI_TIMEOUT_MS)

    def _new_package(self, *, expected_index: int) -> Locator:
        packages = self.page.locator(".ruleSetMonitor__package:visible")
        before = packages.count()
        if before != expected_index:
            message = "规则包数量必须与 typed package 创建顺序一致"
            raise SqlMergeUiError(message)
        add = self.page.locator(".ruleSetMonitor__newPackageBtn:visible")
        expect(add, "规则集编辑器必须提供新增规则包入口").to_have_count(
            1,
            timeout=UI_TIMEOUT_MS,
        )
        add.click()
        expect(packages, "新增规则包必须仅增加一个实体包").to_have_count(
            before + 1,
            timeout=UI_TIMEOUT_MS,
        )
        return packages.nth(before)

    def _require_unused_table(self, table_name: str) -> None:
        source = self.datasource
        exact = tuple(
            record
            for record in self.api.query_rule_sets(table_name=table_name)
            if record.datasource_id == source.assets.id
            and record.schema_name == source.schema
            and record.table_name == table_name
        )
        if exact:
            message = "当前数据源/库/表已存在规则集, 自动化不得隐式复用或删除"
            raise SqlMergeUiError(message)

    def _exact_created_record(
        self,
        *,
        scenario: WriteScenario,
        names: ProvisionedNames,
    ) -> RuleSetRecord:
        source = self.datasource
        candidates = tuple(
            record
            for record in self.api.query_rule_sets(table_name=scenario.table_name)
            if record.datasource_id == source.assets.id
            and record.schema_name == source.schema
            and record.table_name == scenario.table_name
            and record.description == names.rule_set_description
        )
        if len(candidates) != 1:
            message = "规则集保存后必须按数据源/库/表/唯一描述定位一条记录"
            raise SqlMergeUiError(message)
        return self.api.rule_set_detail(rule_set_id=candidates[0].rule_set_id)

    @staticmethod
    def _verify_detail(
        record: RuleSetRecord,
        *,
        specification: RuleSetSpec,
        names: ProvisionedNames,
        submitted_fingerprints: Mapping[int, RulePayloadFingerprint],
    ) -> tuple[RuleSetRuleReadback, ...]:
        packages_by_name = {package.package_name: package for package in record.packages}
        if len(packages_by_name) != len(record.packages) or set(packages_by_name) != set(
            names.package_names
        ):
            message = "规则集详情必须按唯一包名回显全部实体包"
            raise SqlMergeUiError(message)
        readbacks: list[RuleSetRuleReadback] = []
        for package_index, package_name in enumerate(names.package_names):
            package = packages_by_name[package_name]
            expected_rules = specification.source_packages[package_index].rules
            if len(package.rules) != len(expected_rules):
                message = "每个实体规则包必须回显完整 typed 子规则"
                raise SqlMergeUiError(message)
            actual_by_identity = {
                (actual.description, actual.function_name): actual for actual in package.rules
            }
            expected_identities = {
                (names.rule_descriptions[rule.index - 1], rule.function_name)
                for rule in expected_rules
            }
            if (
                len(actual_by_identity) != len(package.rules)
                or set(actual_by_identity) != expected_identities
            ):
                message = "规则集详情必须按父卡描述与子函数回显完整 executable rules"
                raise SqlMergeUiError(message)
            for expected in expected_rules:
                description = names.rule_descriptions[expected.index - 1]
                actual = actual_by_identity[(description, expected.function_name)]
                strength = 1 if expected.strength is RuleStrength.WEAK else 2
                if (
                    actual.function_name != expected.function_name
                    or actual.description != description
                    or actual.fields != expected.fields
                    or actual.filter_expression != expected.filter_expression
                    or actual.strength != strength
                ):
                    message = "规则集详情子规则配置必须与 typed specification 逐字段一致"
                    raise SqlMergeUiError(message)
                assert_persisted_fingerprint(
                    submitted=submitted_fingerprints[expected.index],
                    persisted=actual.semantic_fingerprint,
                )
                readbacks.append(
                    RuleSetRuleReadback(
                        expected=expected,
                        description=description,
                        rule_set_record_id=actual.persisted_id,
                        semantic_fingerprint=actual.semantic_fingerprint,
                    )
                )
        return tuple(readbacks)

    def _assert_add_request(
        self,
        response: Response,
        *,
        scenario: WriteScenario,
        names: ProvisionedNames,
        specification: RuleSetSpec,
    ) -> dict[int, RulePayloadFingerprint]:
        body = self._post_body(response)
        packages = body.get("packages")
        if not isinstance(packages, list):
            message = "规则集 add 请求必须提交 packages 数组"
            raise SqlMergeUiError(message)
        package_values = cast("list[object]", packages)
        packages_by_name = self._package_payloads(package_values)
        if (
            body.get("dataSourceId") != self.datasource.assets.id
            or body.get("dataSourceType") != self.datasource.assets.type_id
            or body.get("schemaName") != self.datasource.schema
            or body.get("tableName") != scenario.table_name
            or body.get("sourceName") != self.datasource.name
            or body.get("sourceTypeName") != "SparkThrift2.x"
            or body.get("description") != names.rule_set_description
            or len(package_values) != len(specification.source_packages)
            or set(packages_by_name) != set(names.package_names)
        ):
            message = "规则集 add 请求必须绑定精确 Spark 数据源/库/表/描述/实体包"
            raise SqlMergeUiError(message)
        return self._submitted_rule_fingerprints(
            packages_by_name=packages_by_name,
            specification=specification,
            names=names,
        )

    def _submitted_rule_fingerprints(
        self,
        *,
        packages_by_name: Mapping[str, Mapping[str, object]],
        specification: RuleSetSpec,
        names: ProvisionedNames,
    ) -> dict[int, RulePayloadFingerprint]:
        """Match parent-card request payloads and return executable child fingerprints."""
        fingerprints: dict[int, RulePayloadFingerprint] = {}
        card_offset = 0
        for package_index, package_name in enumerate(names.package_names):
            package = packages_by_name[package_name]
            raw_rules = cast("list[object]", package["rules"])
            rules_by_description: dict[str, Mapping[str, object]] = {}
            for raw_rule in raw_rules:
                rule_payload = self._mapping(raw_rule, "规则集 add rule")
                description = rule_payload.get("description")
                if not isinstance(description, str) or description in rules_by_description:
                    message = "规则集 add 子规则必须携带唯一规则描述"
                    raise SqlMergeUiError(message)
                rules_by_description[description] = rule_payload
            expected_cards = specification.source_packages[package_index].source_cards
            descriptions = names.card_descriptions[card_offset : card_offset + len(expected_cards)]
            if set(rules_by_description) != set(descriptions):
                message = "规则集 add 必须按唯一描述提交全部且仅提交 source rule cards"
                raise SqlMergeUiError(message)
            for local_index, card in enumerate(expected_cards):
                description = descriptions[local_index]
                fingerprints.update(
                    assert_rule_card_payload_matches_spec(
                        rules_by_description[description],
                        card=card,
                        description=description,
                    )
                )
            card_offset += len(expected_cards)
        return fingerprints

    def _package_payloads(
        self,
        values: list[object],
    ) -> dict[str, Mapping[str, object]]:
        """Decode uniquely named, non-empty package request objects."""
        packages_by_name: dict[str, Mapping[str, object]] = {}
        for value in values:
            item = self._mapping(value, "规则集 add package")
            package_name = item.get("packageName")
            rules = item.get("rules")
            if not isinstance(package_name, str) or not isinstance(rules, list) or not rules:
                message = "规则集 add 的每个 package 必须携带名称及非空规则数组"
                raise SqlMergeUiError(message)
            if package_name in packages_by_name:
                message = "规则集 add 的实体包名称必须唯一"
                raise SqlMergeUiError(message)
            packages_by_name[package_name] = item
        return packages_by_name

    def _assert_check_request(
        self,
        response: Response,
        *,
        scenario: WriteScenario,
        names: ProvisionedNames,
    ) -> None:
        body = self._post_body(response)
        if body != {
            "tableName": scenario.table_name,
            "schemaName": self.datasource.schema,
            "dataSourceId": self.datasource.assets.id,
            "dataSourceType": self.datasource.assets.type_id,
            "description": names.rule_set_description,
        }:
            message = "checkRuleSet 必须精确绑定数据源类型/库/表/唯一描述"
            raise SqlMergeUiError(message)

    @staticmethod
    def _is_post(response: Response, path: str) -> bool:
        return response.request.method == "POST" and urlsplit(response.url).path == path

    @classmethod
    def _require_response(cls, response: Response, *, path: str) -> None:
        if not cls._is_post(response, path) or not response.ok:
            message = "规则集关键请求必须命中精确 POST 路径并返回成功"
            raise SqlMergeUiError(message)

    @staticmethod
    def _post_body(response: Response) -> Mapping[str, object]:
        value = cast("object", response.request.post_data_json)
        if not isinstance(value, dict):
            message = "规则集关键 POST 必须提交 JSON object"
            raise SqlMergeUiError(message)
        untyped = cast("dict[object, object]", value)
        if any(not isinstance(key, str) for key in untyped):
            message = "规则集关键 POST 必须使用文本字段名"
            raise SqlMergeUiError(message)
        return cast("Mapping[str, object]", untyped)

    @staticmethod
    def _mapping(value: object, label: str) -> Mapping[str, object]:
        if not isinstance(value, dict):
            message = f"{label} 必须是 JSON object"
            raise SqlMergeUiError(message)
        untyped = cast("dict[object, object]", value)
        if any(not isinstance(key, str) for key in untyped):
            message = f"{label} 必须使用文本字段名"
            raise SqlMergeUiError(message)
        return cast("Mapping[str, object]", untyped)
