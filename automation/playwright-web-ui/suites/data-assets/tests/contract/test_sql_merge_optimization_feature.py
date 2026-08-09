from __future__ import annotations

import ast
import runpy
from inspect import signature
from typing import TYPE_CHECKING, cast

from data_assets_playwright_web_ui import SUITE
from data_assets_playwright_web_ui.domains.data_quality.sql_merge_optimization.model import (
    ALL_CASE_IDS,
    READ_ONLY_CASE_IDS,
    WRITE_CASE_IDS,
)
from playwright_web_ui.source_policy import (
    validate_controlled_browser_sources,
    validate_sync_only_sources,
)

if TYPE_CHECKING:
    from collections.abc import Callable
    from pathlib import Path

FEATURE_ID = "quality-rule-sql-merge-optimization"
E2E_ROOT = SUITE.tests_path / "v6.4.11" / FEATURE_ID
DOMAIN_ROOT = (
    SUITE.root_path
    / "src"
    / "data_assets_playwright_web_ui"
    / "domains"
    / "data_quality"
    / "sql_merge_optimization"
)
_SEED_TRANSPORT_BOUNDARY_COUNT = 2


def _tree(path: Path) -> ast.Module:
    return ast.parse(path.read_text(encoding="utf-8"), filename=str(path))


def _single_test(path: Path) -> ast.FunctionDef:
    functions = [node for node in _tree(path).body if isinstance(node, ast.FunctionDef)]
    assert len(functions) == 1, f"{path.name} must expose exactly one pytest item"
    return functions[0]


def _identity(path: Path) -> tuple[str, str, str]:
    decorators = [
        decorator
        for decorator in _single_test(path).decorator_list
        if isinstance(decorator, ast.Call)
        and isinstance(decorator.func, ast.Name)
        and decorator.func.id == "automation_case"
    ]
    assert len(decorators) == 1, f"{path.name} must have one automation_case"
    values = {
        keyword.arg: ast.literal_eval(keyword.value)
        for keyword in decorators[0].keywords
        if keyword.arg is not None
    }
    return values["project_id"], values["feature_id"], values["case_id"]


def _parameters(path: Path) -> tuple[str, ...]:
    namespace = cast("dict[str, object]", runpy.run_path(str(path)))
    tests = [
        value for name, value in namespace.items() if name.startswith("test_") and callable(value)
    ]
    assert len(tests) == 1
    return tuple(signature(cast("Callable[..., None]", tests[0])).parameters)


def test_present_candidate_files_have_one_unique_canonical_item_each() -> None:
    files = sorted(E2E_ROOT.glob("c[0-9][0-9][0-9][0-9]_*_test.py"))
    identities = tuple(_identity(path) for path in files)
    case_ids = tuple(identity[2] for identity in identities)

    assert "C0031" in case_ids, "the frozen write skeleton must remain available"
    assert len(case_ids) == len(set(case_ids))
    assert set(case_ids) <= set(ALL_CASE_IDS)
    assert tuple(path.name[:5].upper() for path in files) == case_ids
    assert identities == tuple(("data-assets", FEATURE_ID, case_id) for case_id in case_ids)


def test_write_cases_declare_rules_topology_result_and_required_ui_record() -> None:
    for path in E2E_ROOT.glob("c[0-9][0-9][0-9][0-9]_*_test.py"):
        case_id = _identity(path)[2]
        source = path.read_text(encoding="utf-8")
        parameters = _parameters(path)
        if case_id in WRITE_CASE_IDS:
            assert "_RULES = (" in source
            assert "_SCENARIO = WriteScenario(" in source
            assert "topology=SqlTopologyExpectation(" in source
            assert "result=RuleResultExpectation(" in source
            assert "canonical_main_seed_plan(" in source
            assert "scenario = _SCENARIO.bind_seed(seed_receipt)" in source
            assert "provisioned = actions.provision(scenario)" in source
            assert "actions.inspect_sql_topology(provisioned)" in source
            assert "actions.execute_and_open_fresh_result(provisioned)" in source
            assert "sql_merge_spark_seed" in parameters
            assert "instance_id=instance_id" in source
            assert source.count("business_records.record(") == 1
            assert {
                "page",
                "platform_context",
                "automation_identity",
                "business_records",
                "step",
            } <= set(parameters)
        else:
            assert case_id in READ_ONLY_CASE_IDS
            assert "ReadOnlyScenario(" in source
            assert "business_records" not in parameters
            assert "business_records.record(" not in source


def test_feature_has_no_case_dispatch_skip_retry_or_legacy_language_fallback() -> None:
    forbidden = (
        "CASES[",
        "run_scenario(",
        "pytest.skip",
        "pytest.xfail",
        "time.sleep",
        "TODO",
        "FIXME",
        "NotImplementedError",
        "mysql2",
        "Doris",
        "async def",
    )
    for path in (*DOMAIN_ROOT.glob("*.py"), *E2E_ROOT.glob("*.py")):
        source = path.read_text(encoding="utf-8")
        for token in forbidden:
            assert token not in source, f"{path.name} contains forbidden token {token}"
        if path.parent == E2E_ROOT:
            assert "case_id in " not in source
            assert "read_only_scenario(" not in source
            assert 'task_name="RuleA"' not in source
            assert "rule_package_name=" not in source


def test_broad_exception_handlers_are_limited_to_seed_transport_boundaries() -> None:
    allowed_path = DOMAIN_ROOT / "sql_seed.py"
    for path in (*DOMAIN_ROOT.glob("*.py"), *E2E_ROOT.glob("*.py")):
        handlers = tuple(
            node
            for node in ast.walk(_tree(path))
            if isinstance(node, ast.ExceptHandler)
            and isinstance(node.type, ast.Name)
            and node.type.id == "Exception"
        )
        if path != allowed_path:
            assert not handlers, f"{path.name} has a broad exception handler"
            continue
        seed_client = next(
            node
            for node in _tree(path).body
            if isinstance(node, ast.ClassDef) and node.name == "SparkBatchSeedClient"
        )
        post_method = next(
            node
            for node in seed_client.body
            if isinstance(node, ast.FunctionDef) and node.name == "_post"
        )
        allowed_handlers = tuple(
            node for node in ast.walk(post_method) if isinstance(node, ast.ExceptHandler)
        )
        assert len(handlers) == _SEED_TRANSPORT_BOUNDARY_COUNT
        assert {node.lineno for node in handlers} == {node.lineno for node in allowed_handlers}


def test_result_freshness_uses_exact_post_response_and_structured_row_ids() -> None:
    screen_source = "\n".join(
        (DOMAIN_ROOT / name).read_text(encoding="utf-8")
        for name in ("screen_base.py", "result_screen.py")
    )
    model_source = "\n".join(
        (DOMAIN_ROOT / name).read_text(encoding="utf-8")
        for name in ("result_models.py", "write_models.py")
    )

    assert '"/dassets/v1/valid/monitorRecord/pageQuery"' in screen_source
    assert 'response.request.method == "POST"' in screen_source
    assert "with self.page.expect_response(" in screen_source
    assert "if not response.ok:" in screen_source
    assert 'data-row-key="{record.record_id}"' in screen_source
    assert "_required_row_key(row) != record.record_id" in screen_source
    assert "latest_result_identity" not in screen_source
    assert "class ResultBaseline:" in model_source
    assert '"instance_id": self.instance_id' in model_source


def test_download_guard_bounds_payload_before_reading_workbook_bytes() -> None:
    source = (DOMAIN_ROOT / "assertions.py").read_text(encoding="utf-8")

    stat_index = source.index("expected_size = path.stat().st_size")
    size_guard_index = source.index("if expected_size <= 0 or expected_size > _MAX_WORKBOOK_BYTES:")
    open_index = source.index('with path.open("rb") as stream:')
    bounded_read_index = source.index("stream.read(_MAX_WORKBOOK_BYTES + 1)")

    assert stat_index < size_guard_index < open_index < bounded_read_index
    assert "path.read_bytes()" not in source


def test_feature_obeys_sync_and_controlled_browser_source_policies() -> None:
    validate_sync_only_sources((DOMAIN_ROOT, E2E_ROOT))
    validate_controlled_browser_sources((DOMAIN_ROOT, E2E_ROOT))
