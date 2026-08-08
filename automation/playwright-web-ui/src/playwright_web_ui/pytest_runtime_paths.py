"""Pre-test path gates for mutable third-party pytest output plugins."""

from __future__ import annotations

import os
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Never, cast

import pytest

ATTEMPT_PATH_ENV = "AUTOMATION_ATTEMPT_PATH"
_WORKER_ID_RE = re.compile(r"^gw[0-9]+$")


@dataclass(frozen=True, slots=True)
class AttemptRuntime:
    """Preallocated attempt output roots inherited by controller and workers."""

    path: Path
    evidence: Path
    business_records: Path
    playwright_artifacts: Path


def validate_initial_runtime_outputs(early_config: pytest.Config) -> None:
    """Reject destructive third-party output paths before initial conftest import."""
    namespace = early_config.known_args_namespace
    clean_alluredir = cast("bool", getattr(namespace, "clean_alluredir", False))
    reject_clean_alluredir(clean_alluredir=clean_alluredir)
    report_dir = cast("str | None", getattr(namespace, "allure_report_dir", None))
    attempt = load_attempt_runtime()
    if report_dir is not None and attempt is None:
        raise_attempt_runtime_missing_for_allure()
    if attempt is None:
        return
    validate_allure_results_path(report_dir, attempt)
    validate_playwright_output_path(
        cast("str | None", getattr(namespace, "output", None)),
        attempt,
    )


def reject_clean_alluredir(*, clean_alluredir: bool) -> None:
    """Reject Allure cleanup against immutable preallocated attempts."""
    if clean_alluredir:
        message = (
            "ALLURE_CLEAN_FORBIDDEN: --clean-alluredir cannot be used with "
            "preallocated attempt outputs"
        )
        raise pytest.UsageError(message)


def raise_attempt_runtime_missing_for_allure() -> Never:
    """Raise the stable error for Allure output without an attempt root."""
    message = f"ATTEMPT_RUNTIME_MISSING: {ATTEMPT_PATH_ENV} is required when --alluredir is set"
    raise pytest.UsageError(message)


def load_attempt_runtime() -> AttemptRuntime | None:
    """Load an existing real attempt and its protected output roots."""
    configured = os.environ.get(ATTEMPT_PATH_ENV)
    if configured is None:
        return None
    path = Path(configured)
    if not configured or configured != configured.strip() or not path.is_absolute():
        message = f"ATTEMPT_RUNTIME_INVALID: {ATTEMPT_PATH_ENV} must be a trimmed absolute path"
        raise pytest.UsageError(message)
    try:
        resolved = path.resolve(strict=True)
    except OSError as error:
        message = f"ATTEMPT_RUNTIME_INVALID: attempt path does not exist: {path}"
        raise pytest.UsageError(message) from error
    if path != resolved or path.is_symlink() or not path.is_dir():
        message = f"ATTEMPT_RUNTIME_INVALID: attempt path must be a real directory: {path}"
        raise pytest.UsageError(message)
    outputs: dict[str, Path] = {}
    for name in ("evidence", "business-records", "playwright-artifacts"):
        output = path / name
        try:
            output_resolved = output.resolve(strict=True)
        except OSError as error:
            message = f"ATTEMPT_RUNTIME_INVALID: required output directory does not exist: {output}"
            raise pytest.UsageError(message) from error
        if output != output_resolved or output.is_symlink() or not output.is_dir():
            message = f"ATTEMPT_RUNTIME_INVALID: output must be a real directory: {output}"
            raise pytest.UsageError(message)
        outputs[name] = output
    return AttemptRuntime(
        path=path,
        evidence=outputs["evidence"],
        business_records=outputs["business-records"],
        playwright_artifacts=outputs["playwright-artifacts"],
    )


def validate_allure_results_path(report_dir: str | None, attempt: AttemptRuntime) -> str:
    """Require Allure to write only inside the preallocated attempt."""
    if report_dir is None:
        msg = "ALLURE_RESULTS_REQUIRED: runtime requires --alluredir"
        raise pytest.UsageError(msg)
    path = Path(report_dir)
    expected = attempt.path / "allure-results"
    if not path.is_absolute() or not _is_real_directory(path):
        msg = "ALLURE_RESULTS_INVALID: result path must be a real absolute directory"
        raise pytest.UsageError(msg)
    if path != expected:
        msg = "ALLURE_RESULTS_INVALID: result path must match the preallocated attempt"
        raise pytest.UsageError(msg)
    return report_dir


def validate_playwright_output_path(
    output_dir: str | None,
    attempt: AttemptRuntime,
) -> str:
    """Confine pytest-playwright's destructive output cleanup to one attempt."""
    if output_dir is None:
        msg = "PLAYWRIGHT_OUTPUT_INVALID: runtime requires a controlled --output directory"
        raise pytest.UsageError(msg)
    path = Path(output_dir)
    expected = attempt.playwright_artifacts
    if not path.is_absolute() or not _is_real_directory(path) or path != expected:
        msg = "PLAYWRIGHT_OUTPUT_INVALID: output must match the preallocated attempt"
        raise pytest.UsageError(msg)
    return output_dir


def validate_active_playwright_output_path(
    output_dir: str | None,
    attempt: AttemptRuntime,
    worker_input: dict[str, object] | None,
) -> str:
    """Revalidate the effective output immediately before any fixture can delete it."""
    if output_dir is None:
        msg = "PLAYWRIGHT_OUTPUT_INVALID: runtime output is missing"
        raise pytest.UsageError(msg)
    expected = (
        attempt.playwright_artifacts
        if worker_input is None
        else xdist_worker_output_path(worker_input, attempt)
    )
    path = Path(output_dir)
    if not path.is_absolute() or path != expected:
        msg = "PLAYWRIGHT_OUTPUT_INVALID: runtime output was changed after validation"
        raise pytest.UsageError(msg)
    if os.path.lexists(path) and not _is_real_directory(path):
        msg = "PLAYWRIGHT_OUTPUT_INVALID: runtime output path became unsafe"
        raise pytest.UsageError(msg)
    return output_dir


def xdist_worker_output_path(
    worker_input: dict[str, object],
    attempt: AttemptRuntime,
) -> Path:
    """Return one worker-isolated mutable Playwright output directory."""
    worker_id = worker_input.get("workerid")
    if not isinstance(worker_id, str) or not _WORKER_ID_RE.fullmatch(worker_id):
        msg = "PLAYWRIGHT_OUTPUT_INVALID: xdist worker identity is invalid"
        raise pytest.UsageError(msg)
    output = attempt.playwright_artifacts / worker_id
    if os.path.lexists(output) and not _is_real_directory(output):
        msg = "PLAYWRIGHT_OUTPUT_INVALID: worker output path is unsafe"
        raise pytest.UsageError(msg)
    return output


def _is_real_directory(path: Path) -> bool:
    try:
        return path.resolve(strict=True) == path and not path.is_symlink() and path.is_dir()
    except OSError:
        return False
