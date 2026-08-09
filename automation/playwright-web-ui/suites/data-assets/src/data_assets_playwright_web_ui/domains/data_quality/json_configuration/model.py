"""Typed values for JSON validation configuration business workflows."""

from __future__ import annotations

from dataclasses import dataclass
from enum import StrEnum
from typing import Final

_MAX_TEXT_LENGTH: Final = 255
_MAX_LEVEL: Final = 5


class JsonKeyValidationError(ValueError):
    """Raised when a direct UI form value violates the product contract."""


class DataSourceType(StrEnum):
    """Data-source display values exposed by the LTQC JSON configuration UI."""

    SPARK_THRIFT = "SparkThrift2.x"
    HIVE = "Hive2.x"
    DORIS = "Doris3.x"


class DuplicatePolicy(StrEnum):
    """Duplicate handling choices exposed by the import modal."""

    SKIP = "重复则跳过"
    OVERWRITE = "重复则覆盖更新"


@dataclass(frozen=True, slots=True)
class JsonKeyDraft:
    """One root or child key entered through the JSON configuration form."""

    key: str
    chinese_name: str = ""
    value_format: str = ""
    data_source_type: DataSourceType | None = DataSourceType.SPARK_THRIFT

    def __post_init__(self) -> None:
        """Enforce the browser form's documented boundaries."""
        if not self.key.strip():
            message = "key must contain non-whitespace text"
            raise JsonKeyValidationError(message)
        if len(self.key) > _MAX_TEXT_LENGTH:
            message = "key must contain at most 255 characters"
            raise JsonKeyValidationError(message)
        if len(self.chinese_name) > _MAX_TEXT_LENGTH:
            message = "chinese_name must contain at most 255 characters"
            raise JsonKeyValidationError(message)
        if len(self.value_format) > _MAX_TEXT_LENGTH:
            message = "value_format must contain at most 255 characters"
            raise JsonKeyValidationError(message)


@dataclass(frozen=True, slots=True)
class JsonKeyReadback:
    """Business values read back from one rendered table row."""

    key: str
    chinese_name: str
    value_format: str
    data_source_type: str
    created_by: str
    created_at: str
    updated_by: str
    updated_at: str

    def business_payload(self) -> dict[str, object]:
        """Return the non-secret row values accepted by business-record evidence."""
        return {
            "key": self.key,
            "chinese_name": self.chinese_name,
            "value_format": self.value_format,
            "data_source_type": self.data_source_type,
            "created_by": self.created_by,
            "created_at": self.created_at,
            "updated_by": self.updated_by,
            "updated_at": self.updated_at,
        }


@dataclass(frozen=True, slots=True)
class JsonImportRow:
    """One row in a level-specific import workbook.

    Invalid key values remain representable because several canonical cases intentionally
    upload invalid workbooks and assert the product's validation output.
    """

    level: int
    parents: tuple[str, ...]
    key: str
    chinese_name: str = ""
    value_format: str = ""

    def __post_init__(self) -> None:
        """Reject structurally impossible workbook rows while preserving business-invalid data."""
        if isinstance(self.level, bool) or not 1 <= self.level <= _MAX_LEVEL:
            message = "level must be an integer from 1 through 5"
            raise ValueError(message)
        if len(self.parents) != self.level - 1:
            message = "parents must contain exactly level - 1 values"
            raise ValueError(message)

    @property
    def values(self) -> tuple[str, ...]:
        """Return cell values in the platform template's column order."""
        return (*self.parents, self.key, self.chinese_name, self.value_format)


@dataclass(frozen=True, slots=True)
class FormSignature:
    """Rendered form labels, required fields, and modal title in DOM order."""

    title: str
    labels: tuple[str, ...]
    required_labels: frozenset[str]
