from __future__ import annotations

import subprocess
import sys
from pathlib import Path
from typing import TYPE_CHECKING

from playwright_web_ui.cli import main

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
