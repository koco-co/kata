from __future__ import annotations

import json
from typing import TYPE_CHECKING

import pytest

from playwright_web_ui.business_records import BusinessRecordError, BusinessRecordRecorder
from playwright_web_ui.manifest import BusinessRecord, CaseKey

if TYPE_CHECKING:
    from pathlib import Path


def test_required_record_is_written_once_as_atomic_case_json(tmp_path: Path) -> None:
    recorder = BusinessRecordRecorder(
        case_key=CaseKey("data-assets", "json-configuration", "C0001"),
        policy=BusinessRecord(policy="required", reason=None),
        records_root=tmp_path,
    )

    path = recorder.record(
        record_type="data-quality-rule",
        record_id="rule-e2e-001",
        readback={"name": "rule-e2e-001", "status": "enabled"},
    )

    assert path == tmp_path / "json-configuration" / "C0001.json"
    assert json.loads(path.read_text(encoding="utf-8")) == {
        "schema_version": 1,
        "project_id": "data-assets",
        "feature_id": "json-configuration",
        "case_id": "C0001",
        "record_type": "data-quality-rule",
        "record_id": "rule-e2e-001",
        "ui_readback": {"name": "rule-e2e-001", "status": "enabled"},
    }

    with pytest.raises(BusinessRecordError, match="BUSINESS_RECORD_ALREADY_EXISTS"):
        recorder.record(
            record_type="data-quality-rule",
            record_id="rule-e2e-002",
            readback={"name": "rule-e2e-002"},
        )

    assert json.loads(path.read_text(encoding="utf-8"))["record_id"] == "rule-e2e-001"


def test_not_applicable_policy_exposes_reason_and_never_writes_fake_record(
    tmp_path: Path,
) -> None:
    recorder = BusinessRecordRecorder(
        case_key=CaseKey("data-assets", "read-only-check", "C0002"),
        policy=BusinessRecord(policy="not_applicable", reason="Read-only validation."),
        records_root=tmp_path,
    )

    assert recorder.reason == "Read-only validation."
    with pytest.raises(BusinessRecordError, match="BUSINESS_RECORD_NOT_APPLICABLE"):
        recorder.record(
            record_type="forbidden",
            record_id="forbidden",
            readback={"value": "forbidden"},
        )
    assert not list(tmp_path.rglob("*.json"))


@pytest.mark.parametrize(
    ("record_type", "record_id", "readback", "match"),
    [
        (" ", "record-1", {"name": "record-1"}, "record_type"),
        ("rule", " record-1", {"name": "record-1"}, "record_id"),
        ("rule", "record-1", {}, "ui_readback"),
        ("rule", "record-1", {"value": float("nan")}, "JSON"),
    ],
)
def test_record_requires_explicit_json_ui_readback(
    tmp_path: Path,
    record_type: str,
    record_id: str,
    readback: dict[str, object],
    match: str,
) -> None:
    recorder = BusinessRecordRecorder(
        case_key=CaseKey("data-assets", "json-configuration", "C0001"),
        policy=BusinessRecord(policy="required", reason=None),
        records_root=tmp_path,
    )

    with pytest.raises(BusinessRecordError, match=match):
        recorder.record(record_type=record_type, record_id=record_id, readback=readback)


@pytest.mark.parametrize(
    "readback",
    [
        {"cookie": "browser-cookie"},
        {"nested": {"api_token": "value"}},
        {"nested": {"accessToken": "value"}},
        {"nested": {"apiKey": "value"}},
        {"nested": {"clientApiKey": "value"}},
        {"message": "Authorization: Bearer browser-cookie"},
        {"message": "accessToken=synthetic-value"},
        {"message": '{"apiKey":"synthetic-value"}'},
    ],
)
def test_record_rejects_secret_like_keys_and_known_secret_values(
    tmp_path: Path,
    readback: dict[str, object],
) -> None:
    recorder = BusinessRecordRecorder(
        case_key=CaseKey("data-assets", "json-configuration", "C0001"),
        policy=BusinessRecord(policy="required", reason=None),
        records_root=tmp_path,
        secret_values=("browser-cookie",),
    )

    with pytest.raises(BusinessRecordError, match="BUSINESS_RECORD_SECRET_FORBIDDEN"):
        recorder.record(
            record_type="data-quality-rule",
            record_id="rule-001",
            readback=readback,
        )

    assert not list(tmp_path.rglob("*.json"))


def test_record_rejects_symlink_escape_without_writing_outside_root(tmp_path: Path) -> None:
    records_root = tmp_path / "records"
    records_root.mkdir()
    outside = tmp_path / "outside"
    outside.mkdir()
    (records_root / "json-configuration").symlink_to(outside, target_is_directory=True)
    recorder = BusinessRecordRecorder(
        case_key=CaseKey("data-assets", "json-configuration", "C0001"),
        policy=BusinessRecord(policy="required", reason=None),
        records_root=records_root,
    )

    with pytest.raises(BusinessRecordError, match="BUSINESS_RECORD_PATH_UNSAFE"):
        recorder.record(
            record_type="data-quality-rule",
            record_id="rule-001",
            readback={"name": "rule-001"},
        )

    assert not list(outside.iterdir())
