from __future__ import annotations

import json
from typing import TYPE_CHECKING, cast

import pytest
from jsonschema import Draft202012Validator

from automation_contracts import load_execution_manifest_schema
from playwright_web_ui.manifest import ManifestError, load_execution_manifest

if TYPE_CHECKING:
    from pathlib import Path

    from jsonschema.exceptions import ValidationError

EXPECTED_SCHEMA_VERSION = 2
type JsonValue = str | int | float | bool | list[JsonValue] | dict[str, JsonValue] | None


def write_manifest(path: Path, payload: object) -> Path:
    path.write_text(json.dumps(payload), encoding="utf-8")
    return path


def valid_manifest() -> dict[str, object]:
    return {
        "schema_version": EXPECTED_SCHEMA_VERSION,
        "logical_run_id": "20260808-1030-run-01",
        "execution_id": "execution-01",
        "project_id": "data-assets",
        "executor_id": "playwright-web-ui",
        "cases": [
            {
                "feature_id": "asset-catalog",
                "case_id": "C0001",
                "title": "Create an asset",
                "effects": {"platform_write": True},
                "business_record": {"policy": "required"},
            }
        ],
    }


def manifest_cases(payload: dict[str, object]) -> list[dict[str, object]]:
    return cast("list[dict[str, object]]", payload["cases"])


def test_load_execution_manifest_returns_typed_case_identity(tmp_path: Path) -> None:
    manifest = load_execution_manifest(write_manifest(tmp_path / "manifest.json", valid_manifest()))

    assert manifest.schema_version == EXPECTED_SCHEMA_VERSION
    assert manifest.logical_run_id == "20260808-1030-run-01"
    assert manifest.execution_id == "execution-01"
    assert manifest.project_id == "data-assets"
    assert manifest.executor_id == "playwright-web-ui"
    assert manifest.cases[0].key.project_id == "data-assets"
    assert manifest.cases[0].key.feature_id == "asset-catalog"
    assert manifest.cases[0].key.case_id == "C0001"
    assert manifest.cases[0].title == "Create an asset"
    assert manifest.cases[0].effects.platform_write is True
    assert manifest.cases[0].business_record.policy == "required"
    assert manifest.cases[0].business_record.reason is None


def test_load_execution_manifest_rejects_unknown_fields(tmp_path: Path) -> None:
    payload = valid_manifest()
    payload["unexpected"] = True

    with pytest.raises(ManifestError, match="unexpected"):
        load_execution_manifest(write_manifest(tmp_path / "manifest.json", payload))


def test_load_execution_manifest_rejects_v1(tmp_path: Path) -> None:
    payload = valid_manifest()
    payload["schema_version"] = 1

    with pytest.raises(ManifestError, match="schema_version"):
        load_execution_manifest(write_manifest(tmp_path / "manifest.json", payload))


@pytest.mark.parametrize(
    "effects",
    [
        None,
        {},
        {"platform_write": "yes"},
        {"platform_write": False, "unexpected": True},
    ],
)
def test_load_execution_manifest_rejects_invalid_effects(
    tmp_path: Path,
    effects: object,
) -> None:
    payload = valid_manifest()
    first_case = manifest_cases(payload)[0]
    if effects is None:
        del first_case["effects"]
    else:
        first_case["effects"] = effects

    with pytest.raises(ManifestError, match="effects"):
        load_execution_manifest(write_manifest(tmp_path / "manifest.json", payload))


def test_load_execution_manifest_rejects_duplicate_case_identity(tmp_path: Path) -> None:
    payload = valid_manifest()
    cases = manifest_cases(payload)
    cases.append(dict(cases[0]))

    with pytest.raises(ManifestError, match="duplicate case identity"):
        load_execution_manifest(write_manifest(tmp_path / "manifest.json", payload))


@pytest.mark.parametrize(
    ("field", "value"),
    [
        ("logical_run_id", "run-01"),
        ("execution_id", "execution-1"),
        ("project_id", "1data-assets"),
        ("executor_id", "Playwright-web-ui"),
    ],
)
def test_load_execution_manifest_rejects_invalid_top_level_ids(
    tmp_path: Path,
    field: str,
    value: str,
) -> None:
    payload = valid_manifest()
    payload[field] = value

    with pytest.raises(ManifestError, match=field):
        load_execution_manifest(write_manifest(tmp_path / "manifest.json", payload))


def test_load_execution_manifest_rejects_feature_id_not_starting_with_letter(
    tmp_path: Path,
) -> None:
    payload = valid_manifest()
    manifest_cases(payload)[0]["feature_id"] = "1asset-catalog"

    with pytest.raises(ManifestError, match="feature_id"):
        load_execution_manifest(write_manifest(tmp_path / "manifest.json", payload))


def test_load_execution_manifest_accepts_not_applicable_business_record(tmp_path: Path) -> None:
    payload = valid_manifest()
    cases = manifest_cases(payload)
    first_case = cases[0]
    first_case["business_record"] = {
        "policy": "not_applicable",
        "reason": "The scenario is read-only.",
    }

    manifest = load_execution_manifest(write_manifest(tmp_path / "manifest.json", payload))

    assert manifest.cases[0].business_record.policy == "not_applicable"
    assert manifest.cases[0].business_record.reason == "The scenario is read-only."


@pytest.mark.parametrize(
    ("field", "value"),
    [
        ("title", "   "),
        ("title", "\t"),
        ("title", "\n"),
        ("title", " Leading"),
        ("title", "Trailing "),
        ("title", "Trailing\n"),
        ("title", "\u00a0Title"),
        ("business_record.reason", "   "),
        ("business_record.reason", "\t"),
        ("business_record.reason", "\n"),
        ("business_record.reason", " Leading"),
        ("business_record.reason", "Trailing "),
        ("business_record.reason", "Trailing\n"),
        ("business_record.reason", "Reason\u00a0"),
    ],
)
def test_execution_manifest_schema_rejects_blank_or_untrimmed_required_text(
    field: str,
    value: str,
) -> None:
    payload = valid_manifest()
    first_case = manifest_cases(payload)[0]
    if field == "title":
        first_case["title"] = value
        expected_path = ["cases", 0, "title"]
    else:
        first_case["business_record"] = {"policy": "not_applicable", "reason": value}
        expected_path = ["cases", 0, "business_record"]

    validator = Draft202012Validator(load_execution_manifest_schema())
    errors = cast(
        "list[ValidationError]",
        list(
            validator.iter_errors(  # pyright: ignore[reportUnknownMemberType]
                cast("JsonValue", payload)
            ),
        ),
    )

    assert any(list(error.absolute_path) == expected_path for error in errors), field


@pytest.mark.parametrize(
    ("field", "value", "expected_path"),
    [
        ("logical_run_id", "20260808-1030-run-01\n", ["logical_run_id"]),
        ("execution_id", "execution-01\n", ["execution_id"]),
        ("project_id", "data-assets\n", ["project_id"]),
        ("executor_id", "playwright-web-ui\n", ["executor_id"]),
        ("feature_id", "asset-catalog\n", ["cases", 0, "feature_id"]),
        ("case_id", "C0001\n", ["cases", 0, "case_id"]),
    ],
)
def test_execution_manifest_schema_rejects_untrimmed_identifiers(
    field: str,
    value: str,
    expected_path: list[str | int],
) -> None:
    payload = valid_manifest()
    if field in {"feature_id", "case_id"}:
        manifest_cases(payload)[0][field] = value
    else:
        payload[field] = value

    validator = Draft202012Validator(load_execution_manifest_schema())
    errors = cast(
        "list[ValidationError]",
        list(
            validator.iter_errors(  # pyright: ignore[reportUnknownMemberType]
                cast("JsonValue", payload)
            ),
        ),
    )

    assert any(list(error.absolute_path) == expected_path for error in errors), field


@pytest.mark.parametrize(
    "business_record",
    [
        {"policy": "not_applicable"},
        {"policy": "required", "reason": "not allowed"},
    ],
)
def test_load_execution_manifest_rejects_invalid_business_record_union(
    tmp_path: Path,
    business_record: dict[str, str],
) -> None:
    payload = valid_manifest()
    cases = manifest_cases(payload)
    first_case = cases[0]
    first_case["business_record"] = business_record

    with pytest.raises(ManifestError, match="business_record"):
        load_execution_manifest(write_manifest(tmp_path / "manifest.json", payload))


@pytest.mark.parametrize("title", ["   ", " Leading", "Trailing "])
def test_load_execution_manifest_rejects_blank_or_untrimmed_title(
    tmp_path: Path,
    title: str,
) -> None:
    payload = valid_manifest()
    cases = manifest_cases(payload)
    first_case = cases[0]
    first_case["title"] = title

    with pytest.raises(ManifestError, match=r"cases\.0\.title"):
        load_execution_manifest(write_manifest(tmp_path / "manifest.json", payload))


@pytest.mark.parametrize("reason", ["   ", " Leading", "Trailing "])
def test_load_execution_manifest_rejects_blank_or_untrimmed_reason(
    tmp_path: Path,
    reason: str,
) -> None:
    payload = valid_manifest()
    cases = manifest_cases(payload)
    first_case = cases[0]
    first_case["business_record"] = {"policy": "not_applicable", "reason": reason}

    with pytest.raises(ManifestError, match=r"cases\.0\.business_record"):
        load_execution_manifest(write_manifest(tmp_path / "manifest.json", payload))
