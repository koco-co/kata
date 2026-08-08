from __future__ import annotations

import json
from typing import TYPE_CHECKING

import pytest

if TYPE_CHECKING:
    from pathlib import Path


def manifest_payload() -> dict[str, object]:
    return {
        "schema_version": 1,
        "logical_run_id": "20260808-1030-run-01",
        "execution_id": "execution-01",
        "project_id": "data-assets",
        "executor_id": "playwright-web-ui",
        "cases": [
            {
                "feature_id": "asset-catalog",
                "case_id": "C0001",
                "title": "Create an asset",
                "business_record": {"policy": "required"},
            }
        ],
    }


def write_manifest(pytester: pytest.Pytester, payload: object) -> Path:
    path = pytester.path / "execution-manifest.json"
    path.write_text(json.dumps(payload), encoding="utf-8")
    return path


def write_case(pytester: pytest.Pytester, *, case: str = "C0001") -> None:
    pytester.makepyfile(
        f"""
        from playwright_web_ui import automation_case

        @automation_case(
            project_id="data-assets",
            feature_id="asset-catalog",
            case_id="{case}",
        )
        def test_case():
            pass
        """
    )


def test_plugin_accepts_exact_manifest_to_collection_mapping(pytester: pytest.Pytester) -> None:
    manifest = write_manifest(pytester, manifest_payload())
    write_case(pytester)

    result = pytester.runpytest(
        "--execution-manifest",
        str(manifest),
        "--collect-only",
    )

    assert result.ret == pytest.ExitCode.OK
    result.stdout.fnmatch_lines(["*1 test collected*"])


def test_collect_only_validates_page_case_without_starting_browser(
    pytester: pytest.Pytester,
) -> None:
    manifest = write_manifest(pytester, manifest_payload())
    pytester.makepyfile(
        """
        import pytest

        from playwright_web_ui import automation_case

        @pytest.fixture
        def page():
            raise AssertionError("collect-only must not execute fixtures")

        @automation_case(
            project_id="data-assets",
            feature_id="asset-catalog",
            case_id="C0001",
        )
        def test_case(page):
            pass
        """
    )

    result = pytester.runpytest(
        "--execution-manifest",
        str(manifest),
        "--collect-only",
    )

    assert result.ret == pytest.ExitCode.OK
    result.stdout.fnmatch_lines(["*1 test collected*"])


def test_plugin_accepts_exact_manifest_to_collection_mapping_during_run(
    pytester: pytest.Pytester,
) -> None:
    manifest = write_manifest(pytester, manifest_payload())
    write_case(pytester)

    result = pytester.runpytest_subprocess("--execution-manifest", str(manifest))

    result.assert_outcomes(passed=1)


def test_plugin_rejects_missing_manifest_case(pytester: pytest.Pytester) -> None:
    manifest = write_manifest(pytester, manifest_payload())
    write_case(pytester, case="C0002")

    result = pytester.runpytest(
        "--execution-manifest",
        str(manifest),
        "--collect-only",
    )

    assert result.ret == pytest.ExitCode.USAGE_ERROR
    result.stderr.fnmatch_lines(["*collection does not match execution manifest*"])


def test_plugin_rejects_manifest_for_another_executor(pytester: pytest.Pytester) -> None:
    payload = manifest_payload()
    payload["executor_id"] = "api"
    manifest = write_manifest(pytester, payload)
    write_case(pytester)

    result = pytester.runpytest(
        "--execution-manifest",
        str(manifest),
        "--collect-only",
    )

    assert result.ret == pytest.ExitCode.USAGE_ERROR
    result.stderr.fnmatch_lines(["*executor_id must be*playwright-web-ui*got*api*"])


def test_plugin_rejects_duplicate_collected_case(pytester: pytest.Pytester) -> None:
    manifest = write_manifest(pytester, manifest_payload())
    write_case(pytester)
    pytester.makepyfile(
        test_duplicate="""
        from playwright_web_ui import automation_case

        @automation_case(
            project_id="data-assets",
            feature_id="asset-catalog",
            case_id="C0001",
        )
        def test_duplicate():
            pass
        """
    )

    result = pytester.runpytest(
        "--execution-manifest",
        str(manifest),
        "--collect-only",
    )

    assert result.ret == pytest.ExitCode.USAGE_ERROR
    result.stderr.fnmatch_lines(["*duplicate collected automation case*"])
