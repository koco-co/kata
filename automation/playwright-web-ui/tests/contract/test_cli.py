from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path
from typing import TYPE_CHECKING

from playwright_web_ui.cli import main
from playwright_web_ui.lifecycle import ATTEMPT_NUMBER_ENV, ATTEMPT_PATH_ENV

from .pytest_support import (
    AUTH_COOKIE_ENV,
    PLATFORM_CONTEXT_ENV,
    SYNTHETIC_AUTH_COOKIE,
    manifest_payload,
    platform_context_payload,
)

if TYPE_CHECKING:
    import pytest

_USAGE_ERROR = 2


def test_cli_help_returns_without_terminating_library_caller(
    capsys: pytest.CaptureFixture[str],
) -> None:
    result = main(["--help"])

    assert result == 0
    assert "playwright-web-ui" in capsys.readouterr().out


def test_cli_rejects_nonpositive_workers_without_starting_pytest(
    capsys: pytest.CaptureFixture[str],
) -> None:
    result = main(
        [
            "run",
            "--execution-manifest",
            "/does/not/exist/execution-manifest.json",
            "--workers",
            "0",
        ]
    )

    assert result == _USAGE_ERROR
    assert "WORKERS_INVALID" in capsys.readouterr().err


def test_python_module_doctor_is_read_only_and_successful() -> None:
    result = subprocess.run(
        [sys.executable, "-m", "playwright_web_ui", "doctor"],
        check=False,
        capture_output=True,
        text=True,
        cwd=Path.cwd(),
    )

    assert result.returncode == 0, result.stderr
    assert "playwright-web-ui doctor" in result.stdout
    assert "data-assets" in result.stdout


def test_python_module_rejects_forbidden_platform_write_without_attempt_outputs(
    tmp_path: Path,
) -> None:
    execution = (
        tmp_path
        / "artifacts"
        / "runs"
        / "data-assets"
        / "20260808-1030-run-01"
        / "executions"
        / "playwright-web-ui"
        / "execution-01"
    )
    execution.mkdir(parents=True)
    manifest = execution / "execution-manifest.json"
    manifest.write_text(json.dumps(manifest_payload(platform_write=True)), encoding="utf-8")
    attempt = execution / "attempts" / "001"
    attempt.mkdir(parents=True)
    env = {
        **os.environ,
        ATTEMPT_PATH_ENV: str(attempt),
        ATTEMPT_NUMBER_ENV: "1",
        PLATFORM_CONTEXT_ENV: json.dumps(platform_context_payload()),
        AUTH_COOKIE_ENV: SYNTHETIC_AUTH_COOKIE,
    }

    result = subprocess.run(  # noqa: S603 - fixed interpreter/module with a test-owned manifest
        [sys.executable, "-m", "playwright_web_ui", "run", "--execution-manifest", str(manifest)],
        check=False,
        capture_output=True,
        text=True,
        cwd=Path.cwd(),
        env=env,
    )

    assert result.returncode == _USAGE_ERROR
    assert "PLATFORM_WRITE_FORBIDDEN" in result.stderr
    output = f"{result.stdout}\n{result.stderr}"
    for secret in (SYNTHETIC_AUTH_COOKIE, "synthetic-session-001", "synthetic-tenant"):
        assert secret not in output
    assert list(attempt.iterdir()) == []
