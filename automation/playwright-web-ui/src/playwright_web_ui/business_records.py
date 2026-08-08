"""Immutable, per-case business records written after explicit UI readback."""

from __future__ import annotations

from typing import TYPE_CHECKING, cast

from playwright_web_ui.artifacts import (
    ArtifactPathError,
    JsonValue,
    contains_secret_material,
    encode_json,
    normalize_json,
    write_new_atomic,
)

if TYPE_CHECKING:
    from collections.abc import Mapping
    from pathlib import Path

    from playwright_web_ui.manifest import BusinessRecord, CaseKey

_MIN_SECRET_LENGTH = 4
_IDENTITY_LIMIT = 1_000
_ALREADY_EXISTS = "BUSINESS_RECORD_ALREADY_EXISTS"
_INVALID = "BUSINESS_RECORD_INVALID"
_NOT_APPLICABLE = "BUSINESS_RECORD_NOT_APPLICABLE"
_PATH_UNSAFE = "BUSINESS_RECORD_PATH_UNSAFE"
_REDACTION_POLICY_CODE = "BUSINESS_RECORD_SECRET_FORBIDDEN"


class BusinessRecordError(RuntimeError):
    """Raised when a test violates its manifest business-record contract."""

    def __init__(self, code: str, message: str) -> None:
        """Initialize a stable code and human-readable diagnostic."""
        self.code = code
        super().__init__(f"{code}: {message}")


class BusinessRecordRecorder:
    """Write exactly one required business record for one canonical case."""

    def __init__(
        self,
        *,
        case_key: CaseKey,
        policy: BusinessRecord,
        records_root: Path,
        secret_values: tuple[str, ...] = (),
    ) -> None:
        """Initialize the immutable target and canonical manifest policy."""
        self.case_key = case_key
        self.policy = policy.policy
        self.reason = policy.reason
        self.path = records_root / case_key.feature_id / f"{case_key.case_id}.json"
        self._records_root = records_root
        self._secret_values = tuple(
            value for value in secret_values if len(value) >= _MIN_SECRET_LENGTH
        )
        self._recorded = False

    def record(
        self,
        *,
        record_type: str,
        record_id: str,
        readback: Mapping[str, object],
    ) -> Path:
        """Persist a typed identity and the values read back through the UI."""
        if self.policy != "required":
            message = f"{self.case_key} is not_applicable: {self.reason}"
            raise BusinessRecordError(
                _NOT_APPLICABLE,
                message,
            )
        if self._recorded or self.path.exists():
            message = f"record already exists for {self.case_key}"
            raise BusinessRecordError(
                _ALREADY_EXISTS,
                message,
            )
        normalized_type = _validate_identity(record_type, "record_type")
        normalized_id = _validate_identity(record_id, "record_id")
        if not readback:
            message = "ui_readback must be a non-empty JSON object"
            raise BusinessRecordError(
                _INVALID,
                message,
            )
        try:
            normalized_readback = normalize_json(dict(readback))
        except (TypeError, ValueError) as error:
            message = f"ui_readback must contain valid JSON values: {error}"
            raise BusinessRecordError(
                _INVALID,
                message,
            ) from error
        if not isinstance(normalized_readback, dict):
            message = "ui_readback must be a JSON object"
            raise BusinessRecordError(
                _INVALID,
                message,
            )
        normalized_json = cast("dict[str, JsonValue]", normalized_readback)
        if (
            contains_secret_material(normalized_json, secret_values=self._secret_values)
            or contains_secret_material(normalized_type, secret_values=self._secret_values)
            or contains_secret_material(normalized_id, secret_values=self._secret_values)
        ):
            message = "business records must not contain secret-like keys or values"
            raise BusinessRecordError(
                _REDACTION_POLICY_CODE,
                message,
            )
        payload: dict[str, JsonValue] = {
            "schema_version": 1,
            "project_id": self.case_key.project_id,
            "feature_id": self.case_key.feature_id,
            "case_id": self.case_key.case_id,
            "record_type": normalized_type,
            "record_id": normalized_id,
            "ui_readback": normalized_json,
        }
        try:
            write_new_atomic(self.path, encode_json(payload), root=self._records_root)
        except FileExistsError as error:
            message = f"record already exists for {self.case_key}"
            raise BusinessRecordError(
                _ALREADY_EXISTS,
                message,
            ) from error
        except ArtifactPathError as error:
            message = f"cannot safely write record for {self.case_key}: {error}"
            raise BusinessRecordError(
                _PATH_UNSAFE,
                message,
            ) from error
        self._recorded = True
        return self.path


def _validate_identity(value: str, field: str) -> str:
    if not value or value != value.strip() or len(value) > _IDENTITY_LIMIT:
        message = f"{field} must be trimmed, non-empty, and at most 1000 characters"
        raise BusinessRecordError(
            _INVALID,
            message,
        )
    return value
