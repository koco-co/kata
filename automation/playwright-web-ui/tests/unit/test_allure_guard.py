from __future__ import annotations

import json
from typing import TYPE_CHECKING, cast

from attrs import define

from playwright_web_ui.allure_guard import AllureSecretGuard, GuardedAllureFileLogger

if TYPE_CHECKING:
    from pathlib import Path


@define
class _Parameter:
    name: str
    value: str


@define
class _Result:
    uuid: str
    name: str
    parameters: list[_Parameter]


def test_secure_logger_sanitizes_detached_parameter_without_mutating_model(
    tmp_path: Path,
) -> None:
    guard = AllureSecretGuard(secret_values=())
    logger = GuardedAllureFileLogger(str(tmp_path), guard=guard)
    parameter = _Parameter(name="clientApiKey", value="unlisted-sensitive-value")
    result = _Result(uuid="result-001", name="safe test", parameters=[parameter])

    logger.report_result(result)

    result_files = list(tmp_path.glob("*-result.json"))
    assert len(result_files) == 1
    payload = cast(
        "dict[str, object]",
        json.loads(result_files[0].read_text(encoding="utf-8")),
    )
    parameters = cast("list[dict[str, object]]", payload["parameters"])
    assert parameters[0]["value"] == "[REDACTED]"
    assert parameter.value == "unlisted-sensitive-value"
    assert guard.breached


def test_secure_logger_fails_closed_when_model_cannot_be_detached(tmp_path: Path) -> None:
    guard = AllureSecretGuard(secret_values=("protected-value",))
    logger = GuardedAllureFileLogger(str(tmp_path), guard=guard)

    logger.report_result(object())

    result_files = list(tmp_path.glob("*-result.json"))
    assert len(result_files) == 1
    content = result_files[0].read_text(encoding="utf-8")
    assert "ALLURE_REPORT_REJECTED" in content
    assert "protected-value" not in content
    assert guard.breached


def test_secure_logger_replaces_source_file_attachment_with_placeholder(tmp_path: Path) -> None:
    guard = AllureSecretGuard(secret_values=("protected-value",))
    logger = GuardedAllureFileLogger(str(tmp_path), guard=guard)
    source = tmp_path / "source.txt"
    source.write_text("protected-value", encoding="utf-8")

    logger.report_attached_file(str(source), "attachment.txt")

    assert (tmp_path / "attachment.txt").read_text(encoding="utf-8") == "[REDACTED]"
    assert guard.breached
