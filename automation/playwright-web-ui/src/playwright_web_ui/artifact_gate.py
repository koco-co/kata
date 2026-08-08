"""Validate durable evidence and business records for one execution attempt."""

from __future__ import annotations

import json
import re
from typing import TYPE_CHECKING, Never, cast

from playwright_web_ui.artifacts import contains_secret_material, is_valid_png
from playwright_web_ui.evidence import sanitize_text

if TYPE_CHECKING:
    from pathlib import Path

    from playwright_web_ui.artifacts import JsonValue
    from playwright_web_ui.manifest import AutomationCase, CaseKey, ExecutionManifest

_RECORD_IDENTITY_LIMIT = 1_000
_STEP_TEXT_LIMIT = 1_000
_PNG_FILE_LIMIT = 50 * 1024 * 1024
_CHECKPOINT_NAME_RE = re.compile(r"step-(?P<sequence>[0-9]{3,})\.json\Z")
_CHECKPOINT_FIELDS = {
    "action",
    "case_id",
    "expected",
    "feature_id",
    "project_id",
    "schema_version",
    "screenshot",
    "sequence",
    "status",
    "target",
}
_BUSINESS_RECORD_FIELDS = {
    "case_id",
    "feature_id",
    "project_id",
    "record_id",
    "record_type",
    "schema_version",
    "ui_readback",
}


def collect_artifact_gate_errors(
    manifest: ExecutionManifest,
    *,
    evidence_root: Path,
    business_records_root: Path,
    secret_values: tuple[str, ...],
) -> tuple[str, ...]:
    """Return stable artifact-gate failures for every manifest-selected case."""
    errors: list[str] = []
    for selected_case in manifest.cases:
        key = selected_case.key
        evidence_error = _validate_success_evidence(
            key,
            evidence_root,
            secret_values=secret_values,
        )
        if evidence_error is not None:
            errors.append(evidence_error)
        record_error = _validate_business_record(
            selected_case,
            business_records_root,
            secret_values=secret_values,
        )
        if record_error is not None:
            errors.append(record_error)
    return tuple(errors)


def _validate_success_evidence(
    key: CaseKey,
    evidence_root: Path,
    *,
    secret_values: tuple[str, ...],
) -> str | None:
    case_path = evidence_root / key.feature_id / key.case_id
    candidates = sorted(case_path.glob("step-*.json")) if case_path.is_dir() else []
    for path in candidates:
        payload = _read_json_object(path)
        if payload is None:
            continue
        match = _CHECKPOINT_NAME_RE.fullmatch(path.name)
        sequence = payload.get("sequence")
        screenshot_name = payload.get("screenshot")
        if match is None or type(sequence) is not int or sequence < 1:
            continue
        expected_stem = f"step-{sequence:03d}"
        screenshot = case_path / f"{expected_stem}.png"
        if (
            set(payload) == _CHECKPOINT_FIELDS
            and path.name == f"{expected_stem}.json"
            and int(match.group("sequence")) == sequence
            and payload.get("schema_version") == 1
            and payload.get("project_id") == key.project_id
            and payload.get("feature_id") == key.feature_id
            and payload.get("case_id") == key.case_id
            and payload.get("status") == "passed"
            and screenshot_name == screenshot.name
            and all(
                _is_safe_checkpoint_text(payload.get(field), secret_values=secret_values)
                for field in ("action", "expected", "target")
            )
            and _is_valid_png_file(screenshot)
        ):
            return None
    if candidates:
        return f"EVIDENCE_INVALID: no valid successful checkpoint for {key}"
    return f"EVIDENCE_REQUIRED: missing successful checkpoint for {key}"


def _is_safe_checkpoint_text(value: object, *, secret_values: tuple[str, ...]) -> bool:
    if (
        not isinstance(value, str)
        or not value
        or value != value.strip()
        or len(value) > _STEP_TEXT_LIMIT
    ):
        return False
    return sanitize_text(value, secret_values=secret_values, limit=_STEP_TEXT_LIMIT) == value


def _validate_business_record(
    selected_case: AutomationCase,
    records_root: Path,
    *,
    secret_values: tuple[str, ...],
) -> str | None:
    key = selected_case.key
    path = records_root / key.feature_id / f"{key.case_id}.json"
    if selected_case.business_record.policy == "not_applicable":
        if path.exists() or path.is_symlink():
            return f"BUSINESS_RECORD_UNEXPECTED: not_applicable case produced a record for {key}"
        return None
    if not path.exists():
        return f"BUSINESS_RECORD_REQUIRED: missing UI-readback record for {key}"
    payload = _read_json_object(path)
    if payload is None:
        return f"BUSINESS_RECORD_INVALID: unreadable record for {key}"
    return _validate_business_record_payload(payload, key, secret_values=secret_values)


def _validate_business_record_payload(
    payload: dict[str, object],
    key: CaseKey,
    *,
    secret_values: tuple[str, ...],
) -> str | None:
    readback = payload.get("ui_readback")
    normalized_payload = cast("dict[str, JsonValue]", payload)
    if contains_secret_material(normalized_payload, secret_values=secret_values):
        return f"BUSINESS_RECORD_SECRET_FORBIDDEN: secret-like content found for {key}"
    if (
        set(payload) != _BUSINESS_RECORD_FIELDS
        or payload.get("schema_version") != 1
        or payload.get("project_id") != key.project_id
        or payload.get("feature_id") != key.feature_id
        or payload.get("case_id") != key.case_id
        or not _is_record_identity(payload.get("record_type"))
        or not _is_record_identity(payload.get("record_id"))
        or not isinstance(readback, dict)
        or not readback
    ):
        return f"BUSINESS_RECORD_INVALID: record identity or UI readback is invalid for {key}"
    return None


def _is_record_identity(value: object) -> bool:
    return (
        isinstance(value, str)
        and bool(value)
        and value == value.strip()
        and len(value) <= _RECORD_IDENTITY_LIMIT
    )


def _read_json_object(path: Path) -> dict[str, object] | None:
    if not _is_real_file(path):
        return None
    try:
        value = cast(
            "object",
            json.loads(
                path.read_text(encoding="utf-8"),
                parse_constant=_reject_json_constant,
            ),
        )
    except OSError, ValueError:
        return None
    return cast("dict[str, object]", value) if isinstance(value, dict) else None


def _reject_json_constant(value: str) -> Never:
    message = f"non-standard JSON constant is forbidden: {value}"
    raise ValueError(message)


def _is_real_file(path: Path) -> bool:
    try:
        return path.resolve(strict=True) == path and not path.is_symlink() and path.is_file()
    except OSError:
        return False


def _is_valid_png_file(path: Path) -> bool:
    try:
        size = path.stat().st_size
        return (
            _is_real_file(path) and 0 < size <= _PNG_FILE_LIMIT and is_valid_png(path.read_bytes())
        )
    except OSError:
        return False
