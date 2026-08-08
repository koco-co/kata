"""Typed loading and semantic validation for immutable execution manifests."""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import TYPE_CHECKING, Literal, cast

from jsonschema import Draft202012Validator

from automation_contracts import load_execution_manifest_schema

if TYPE_CHECKING:
    from jsonschema.exceptions import ValidationError

BusinessRecordPolicy = Literal["required", "not_applicable"]
type JsonValue = str | int | float | bool | list[JsonValue] | dict[str, JsonValue] | None


class ManifestError(ValueError):
    """Raised when an execution manifest is unreadable or violates its contract."""


@dataclass(frozen=True, slots=True)
class CaseKey:
    """Stable identity shared by the control plane and collected pytest item."""

    project_id: str
    feature_id: str
    case_id: str

    def __str__(self) -> str:
        """Render a compact identity for diagnostics."""
        return f"{self.project_id}/{self.feature_id}/{self.case_id}"


@dataclass(frozen=True, slots=True)
class BusinessRecord:
    """Business-record evidence policy for one canonical case."""

    policy: BusinessRecordPolicy
    reason: str | None


@dataclass(frozen=True, slots=True)
class AutomationCase:
    """One selected canonical case in an immutable execution manifest."""

    key: CaseKey
    title: str
    business_record: BusinessRecord


@dataclass(frozen=True, slots=True)
class ExecutionManifest:
    """Typed immutable selection handed from the control plane to the executor."""

    schema_version: Literal[1]
    logical_run_id: str
    execution_id: str
    project_id: str
    executor_id: str
    cases: tuple[AutomationCase, ...]


def load_execution_manifest(path: str | Path) -> ExecutionManifest:
    """Load and validate an immutable execution manifest from ``path``."""
    manifest_path = Path(path)
    try:
        value = cast("JsonValue", json.loads(manifest_path.read_text(encoding="utf-8")))
    except (OSError, json.JSONDecodeError) as error:
        msg = f"cannot load execution manifest {manifest_path}: {error}"
        raise ManifestError(msg) from error

    schema = load_execution_manifest_schema()
    validator = Draft202012Validator(schema)
    validation_errors = cast(
        "list[ValidationError]",
        list(validator.iter_errors(value)),  # pyright: ignore[reportUnknownMemberType]
    )
    errors = sorted(validation_errors, key=lambda error: list(error.absolute_path))
    if errors:
        error = errors[0]
        location = ".".join(str(part) for part in error.absolute_path) or "$"
        msg = f"{location}: {error.message}"
        raise ManifestError(msg)

    raw = cast("dict[str, JsonValue]", value)
    project_id = cast("str", raw["project_id"])
    cases = tuple(_decode_case(project_id, item) for item in _case_objects(raw["cases"]))
    _ensure_unique_case_keys(cases)
    return ExecutionManifest(
        schema_version=1,
        logical_run_id=cast("str", raw["logical_run_id"]),
        execution_id=cast("str", raw["execution_id"]),
        project_id=project_id,
        executor_id=cast("str", raw["executor_id"]),
        cases=cases,
    )


def _case_objects(value: JsonValue) -> tuple[dict[str, JsonValue], ...]:
    items = cast("list[JsonValue]", value)
    return tuple(cast("dict[str, JsonValue]", item) for item in items)


def _decode_case(project_id: str, raw: dict[str, JsonValue]) -> AutomationCase:
    business_record = cast("dict[str, JsonValue]", raw["business_record"])
    policy = cast("BusinessRecordPolicy", business_record["policy"])
    reason = cast("str | None", business_record.get("reason"))
    title = cast("str", raw["title"])
    _ensure_trimmed_non_empty(title, "title")
    if reason is not None:
        _ensure_trimmed_non_empty(reason, "business_record.reason")
    return AutomationCase(
        key=CaseKey(
            project_id=project_id,
            feature_id=cast("str", raw["feature_id"]),
            case_id=cast("str", raw["case_id"]),
        ),
        title=title,
        business_record=BusinessRecord(policy=policy, reason=reason),
    )


def _ensure_unique_case_keys(cases: tuple[AutomationCase, ...]) -> None:
    seen: set[CaseKey] = set()
    for selected_case in cases:
        if selected_case.key in seen:
            msg = f"duplicate case identity: {selected_case.key}"
            raise ManifestError(msg)
        seen.add(selected_case.key)


def _ensure_trimmed_non_empty(value: str, field: str) -> None:
    if not value.strip() or value != value.strip():
        msg = f"{field} must be non-empty and have no surrounding whitespace"
        raise ManifestError(msg)
