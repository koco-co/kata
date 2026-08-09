from __future__ import annotations

from typing import cast

import pytest

from .pytest_support import (
    fake_page_source,
    manifest_payload,
    prepare_attempt,
    run_runtime,
    write_manifest,
)


@pytest.mark.parametrize("extra_args", [(), ("-n", "2")], ids=["serial", "xdist"])
def test_runtime_exposes_one_immutable_public_identity(
    pytester: pytest.Pytester,
    monkeypatch: pytest.MonkeyPatch,
    extra_args: tuple[str, ...],
) -> None:
    payload = manifest_payload()
    selected_case = cast("dict[str, object]", cast("list[object]", payload["cases"])[0])
    selected_case["business_record"] = {
        "policy": "not_applicable",
        "reason": "The synthetic identity contract is read-only.",
    }
    manifest = write_manifest(pytester, payload)
    attempt = prepare_attempt(pytester, monkeypatch)
    pytester.makepyfile(
        fake_page_source()
        + """
from playwright_web_ui import AutomationRuntimeIdentity, automation_case

@automation_case(
    project_id="data-assets",
    feature_id="asset-catalog",
    case_id="C0001",
)
def test_identity(automation_identity, step):
    assert isinstance(automation_identity, AutomationRuntimeIdentity)
    assert automation_identity.case.project_id == "data-assets"
    assert automation_identity.case.feature_id == "asset-catalog"
    assert automation_identity.case.case_id == "C0001"
    assert automation_identity.logical_run_id == "20260808-1030-run-01"
    assert automation_identity.execution_id == "execution-01"
    assert automation_identity.executor_id == "playwright-web-ui"
    assert automation_identity.attempt == 1
    assert (
        automation_identity.worker_id == "serial"
        or automation_identity.worker_id.startswith("gw")
    )
    assert automation_identity.unique_name("asset") == (
        f"asset_{automation_identity.collision_token}"
    )
    with step(action="Read identity", expected="Identity is stable", target="Runtime identity"):
        assert True
"""
    )

    result = run_runtime(pytester, manifest, attempt, *extra_args)

    result.assert_outcomes(passed=1)
    assert len(list((attempt / "allure-results").glob("*-result.json"))) == 1
