from __future__ import annotations

import json
from typing import TYPE_CHECKING, cast

import pytest

from playwright_web_ui.platform_context import AUTH_COOKIE_ENV, PLATFORM_CONTEXT_ENV
from playwright_web_ui.pytest_runtime_paths import ATTEMPT_PATH_ENV

from .pytest_support import (
    fake_page_source,
    prepare_attempt,
    run_runtime,
    write_case,
    write_manifest,
)

if TYPE_CHECKING:
    from pathlib import Path

_CANONICAL_LABEL_NAMES = ("project_id", "feature_id", "case_id")
_EXPECTED_IDENTITIES = {
    ("data-assets", "asset-catalog", "C0001"),
    ("data-assets", "quality-rules", "C0002"),
}
_SELECTED_CASE_COUNT = len(_EXPECTED_IDENTITIES)


def _two_case_manifest() -> dict[str, object]:
    return {
        "schema_version": 2,
        "logical_run_id": "20260809-1200-run-02",
        "execution_id": "execution-02",
        "project_id": "data-assets",
        "executor_id": "playwright-web-ui",
        "cases": [
            {
                "feature_id": "asset-catalog",
                "case_id": "C0001",
                "title": "A title that does not encode the canonical identity",
                "effects": {"platform_write": False},
                "business_record": {
                    "policy": "not_applicable",
                    "reason": "The synthetic label contract is read-only.",
                },
            },
            {
                "feature_id": "quality-rules",
                "case_id": "C0002",
                "title": "Another unrelated title",
                "effects": {"platform_write": False},
                "business_record": {
                    "policy": "not_applicable",
                    "reason": "The synthetic label contract is read-only.",
                },
            },
        ],
    }


def _write_two_successful_cases(pytester: pytest.Pytester) -> None:
    pytester.makepyfile(
        fake_page_source()
        + """
from playwright_web_ui import automation_case

@automation_case(
    project_id="data-assets",
    feature_id="asset-catalog",
    case_id="C0001",
)
def test_first(step):
    with step(action="Read first", expected="First visible", target="First view"):
        assert True

@automation_case(
    project_id="data-assets",
    feature_id="quality-rules",
    case_id="C0002",
)
def test_second(step):
    with step(action="Read second", expected="Second visible", target="Second view"):
        assert True
"""
    )


def _result_payloads(results_path: Path) -> list[dict[str, object]]:
    paths = sorted(results_path.glob("*-result.json"))
    return [
        cast("dict[str, object]", json.loads(path.read_text(encoding="utf-8"))) for path in paths
    ]


def _canonical_identity(payload: dict[str, object]) -> tuple[str, str, str]:
    labels = cast("list[dict[str, str]]", payload["labels"])
    values: list[str] = []
    for name in _CANONICAL_LABEL_NAMES:
        matching = [label["value"] for label in labels if label["name"] == name]
        assert len(matching) == 1
        values.append(matching[0])
    return values[0], values[1], values[2]


@pytest.mark.parametrize(
    "extra_args",
    [(), ("-n", "2")],
    ids=["serial", "xdist"],
)
def test_runtime_writes_exact_canonical_labels_for_every_selected_item(
    pytester: pytest.Pytester,
    monkeypatch: pytest.MonkeyPatch,
    extra_args: tuple[str, ...],
) -> None:
    manifest = write_manifest(pytester, _two_case_manifest())
    attempt = prepare_attempt(pytester, monkeypatch)
    _write_two_successful_cases(pytester)

    result = run_runtime(pytester, manifest, attempt, *extra_args)

    result.assert_outcomes(passed=_SELECTED_CASE_COUNT)
    payloads = _result_payloads(attempt / "allure-results")
    assert len(payloads) == _SELECTED_CASE_COUNT
    assert {_canonical_identity(payload) for payload in payloads} == _EXPECTED_IDENTITIES


def test_setup_failure_still_writes_canonical_labels(
    pytester: pytest.Pytester,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    manifest_payload = _two_case_manifest()
    cases = cast("list[dict[str, object]]", manifest_payload["cases"])
    manifest_payload["cases"] = [cases[0]]
    manifest = write_manifest(pytester, manifest_payload)
    attempt = prepare_attempt(pytester, monkeypatch)
    pytester.makepyfile(
        """
import pytest

from playwright_web_ui import automation_case

@pytest.fixture
def page():
    raise RuntimeError("synthetic setup failure")

@automation_case(
    project_id="data-assets",
    feature_id="asset-catalog",
    case_id="C0001",
)
def test_case(page):
    pass
"""
    )

    result = run_runtime(pytester, manifest, attempt)

    assert result.ret == pytest.ExitCode.TESTS_FAILED
    payloads = _result_payloads(attempt / "allure-results")
    assert len(payloads) == 1
    assert _canonical_identity(payloads[0]) == ("data-assets", "asset-catalog", "C0001")


def test_collect_only_does_not_create_allure_results(pytester: pytest.Pytester) -> None:
    manifest_payload = _two_case_manifest()
    cases = cast("list[dict[str, object]]", manifest_payload["cases"])
    manifest_payload["cases"] = [cases[0]]
    manifest = write_manifest(pytester, manifest_payload)
    write_case(pytester)

    result = pytester.runpytest_subprocess(
        "--execution-manifest",
        str(manifest),
        "--collect-only",
    )

    assert result.ret == pytest.ExitCode.OK
    assert not list(pytester.path.rglob("*-result.json"))


def test_plain_pytest_allure_results_do_not_gain_canonical_labels(
    pytester: pytest.Pytester,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.delenv(ATTEMPT_PATH_ENV, raising=False)
    monkeypatch.delenv(PLATFORM_CONTEXT_ENV, raising=False)
    monkeypatch.delenv(AUTH_COOKIE_ENV, raising=False)
    results_path = pytester.path / "plain-allure"
    pytester.makepyfile(
        """
from playwright_web_ui import automation_case

@automation_case(
    project_id="plain-project",
    feature_id="unverified-feature",
    case_id="C9999",
)
def test_plain():
    pass
"""
    )

    result = pytester.runpytest_subprocess(
        "--alluredir",
        str(results_path),
        "--allure-no-capture",
    )

    result.assert_outcomes(passed=1)
    payloads = _result_payloads(results_path)
    assert len(payloads) == 1
    labels = cast("list[dict[str, str]]", payloads[0]["labels"])
    assert not {label["name"] for label in labels} & set(_CANONICAL_LABEL_NAMES)
