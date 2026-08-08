"""Black-box contracts for manifest-governed Allure output paths."""

from __future__ import annotations

import pytest

from .pytest_support import manifest_payload, prepare_attempt, write_case, write_manifest


def test_runtime_requires_canonical_allure_results_directory(
    pytester: pytest.Pytester,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    manifest = write_manifest(pytester, manifest_payload())
    prepare_attempt(pytester, monkeypatch)
    write_case(pytester)

    result = pytester.runpytest_subprocess("--execution-manifest", str(manifest))

    assert result.ret == pytest.ExitCode.USAGE_ERROR
    result.stderr.fnmatch_lines(["*ALLURE_RESULTS_REQUIRED*"])


def test_runtime_rejects_allure_results_directory_outside_attempt(
    pytester: pytest.Pytester,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    manifest = write_manifest(pytester, manifest_payload())
    prepare_attempt(pytester, monkeypatch)
    outside = pytester.path / "outside-allure"
    outside.mkdir()
    write_case(pytester)

    result = pytester.runpytest_subprocess(
        "--execution-manifest",
        str(manifest),
        "--alluredir",
        str(outside),
    )

    assert result.ret == pytest.ExitCode.USAGE_ERROR
    result.stderr.fnmatch_lines(["*ALLURE_RESULTS_INVALID*preallocated attempt*"])


def test_runtime_rejects_external_clean_alluredir_before_allure_removes_contents(
    pytester: pytest.Pytester,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    manifest = write_manifest(pytester, manifest_payload())
    prepare_attempt(pytester, monkeypatch)
    outside = pytester.path / "outside-allure"
    outside.mkdir()
    sentinel = outside / "sentinel.txt"
    sentinel.write_text("must survive", encoding="utf-8")
    write_case(pytester)

    result = pytester.runpytest_subprocess(
        "--execution-manifest",
        str(manifest),
        "--alluredir",
        str(outside),
        "--clean-alluredir",
    )

    assert result.ret == pytest.ExitCode.USAGE_ERROR
    result.stderr.fnmatch_lines(["*ALLURE_CLEAN_FORBIDDEN*--clean-alluredir*"])
    assert list(outside.iterdir()) == [sentinel]
    assert sentinel.read_text(encoding="utf-8") == "must survive"


def test_runtime_rejects_external_alluredir_before_allure_creates_it(
    pytester: pytest.Pytester,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    manifest = write_manifest(pytester, manifest_payload())
    prepare_attempt(pytester, monkeypatch)
    outside = pytester.path / "outside-allure"
    write_case(pytester)

    result = pytester.runpytest_subprocess(
        "--execution-manifest",
        str(manifest),
        "--alluredir",
        str(outside),
    )

    assert result.ret == pytest.ExitCode.USAGE_ERROR
    result.stderr.fnmatch_lines(["*ALLURE_RESULTS_INVALID*"])
    assert not outside.exists()


def test_runtime_rejects_alluredir_before_allure_creates_it_when_attempt_is_missing(
    pytester: pytest.Pytester,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    manifest = write_manifest(pytester, manifest_payload())
    monkeypatch.delenv("AUTOMATION_ATTEMPT_PATH", raising=False)
    outside = pytester.path / "outside-allure"
    write_case(pytester)

    result = pytester.runpytest_subprocess(
        "--execution-manifest",
        str(manifest),
        "--alluredir",
        str(outside),
    )

    assert result.ret == pytest.ExitCode.USAGE_ERROR
    result.stderr.fnmatch_lines(["*ATTEMPT_RUNTIME_MISSING*AUTOMATION_ATTEMPT_PATH*"])
    assert not outside.exists()


def test_runtime_rejects_clean_for_canonical_alluredir_without_removing_contents(
    pytester: pytest.Pytester,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    manifest = write_manifest(pytester, manifest_payload())
    attempt = prepare_attempt(pytester, monkeypatch)
    report_dir = attempt / "allure-results"
    sentinel = report_dir / "sentinel.txt"
    sentinel.write_text("preallocated", encoding="utf-8")
    write_case(pytester)

    result = pytester.runpytest_subprocess(
        "--execution-manifest",
        str(manifest),
        "--alluredir",
        str(report_dir),
        "--clean-alluredir",
    )

    assert result.ret == pytest.ExitCode.USAGE_ERROR
    result.stderr.fnmatch_lines(["*ALLURE_CLEAN_FORBIDDEN*--clean-alluredir*"])
    assert list(report_dir.iterdir()) == [sentinel]
    assert sentinel.read_text(encoding="utf-8") == "preallocated"


def test_initial_gate_reads_manifest_and_allure_options_from_pytest_addopts(
    pytester: pytest.Pytester,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    manifest = write_manifest(pytester, manifest_payload())
    prepare_attempt(pytester, monkeypatch)
    outside = pytester.path / "outside-allure"
    outside.mkdir()
    sentinel = outside / "sentinel.txt"
    sentinel.write_text("must survive", encoding="utf-8")
    write_case(pytester)
    monkeypatch.setenv(
        "PYTEST_ADDOPTS",
        f"--execution-manifest={manifest} --alluredir={outside} --clean-alluredir",
    )

    result = pytester.runpytest_subprocess()

    assert result.ret == pytest.ExitCode.USAGE_ERROR
    result.stderr.fnmatch_lines(["*ALLURE_CLEAN_FORBIDDEN*--clean-alluredir*"])
    assert list(outside.iterdir()) == [sentinel]
    assert sentinel.read_text(encoding="utf-8") == "must survive"


def test_invalid_manifest_cannot_clean_external_allure_directory(
    pytester: pytest.Pytester,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    manifest = pytester.path / "invalid-manifest.json"
    manifest.write_text("not json", encoding="utf-8")
    prepare_attempt(pytester, monkeypatch)
    outside = pytester.path / "outside-allure"
    outside.mkdir()
    sentinel = outside / "sentinel.txt"
    sentinel.write_text("must survive", encoding="utf-8")
    write_case(pytester)

    result = pytester.runpytest_subprocess(
        "--execution-manifest",
        str(manifest),
        "--alluredir",
        str(outside),
        "--clean-alluredir",
    )

    assert result.ret == pytest.ExitCode.USAGE_ERROR
    result.stderr.fnmatch_lines(["*ALLURE_CLEAN_FORBIDDEN*--clean-alluredir*"])
    assert list(outside.iterdir()) == [sentinel]
    assert sentinel.read_text(encoding="utf-8") == "must survive"


def test_invalid_manifest_cannot_create_external_allure_directory(
    pytester: pytest.Pytester,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    manifest = pytester.path / "invalid-manifest.json"
    manifest.write_text("not json", encoding="utf-8")
    prepare_attempt(pytester, monkeypatch)
    outside = pytester.path / "outside-allure"
    write_case(pytester)

    result = pytester.runpytest_subprocess(
        "--execution-manifest",
        str(manifest),
        "--alluredir",
        str(outside),
    )

    assert result.ret == pytest.ExitCode.USAGE_ERROR
    result.stderr.fnmatch_lines(["*ALLURE_RESULTS_INVALID*"])
    assert not outside.exists()


def test_plain_pytest_alluredir_remains_unconstrained_without_manifest(
    pytester: pytest.Pytester,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.delenv("AUTOMATION_ATTEMPT_PATH", raising=False)
    report_dir = pytester.path / "plain-allure"
    pytester.makepyfile(
        """
        def test_plain():
            pass
        """
    )

    result = pytester.runpytest_subprocess(
        "--alluredir",
        str(report_dir),
        "--clean-alluredir",
    )

    result.assert_outcomes(passed=1)
    assert report_dir.is_dir()
