"""Canonical case and table identities for requirement 15862."""

from __future__ import annotations

import re
from typing import Final

CASE_ID_RE: Final = re.compile(r"^C[0-9]{4}$")
TABLE_NAME_RE: Final = re.compile(r"^test_table_15862_c[0-9]{4}$")
RUNTIME_TABLE_NAME_RE: Final = re.compile(r"^test_table_15862_c[0-9]{4}_a[0-9a-f]{10}(?:_cmp)?$")
SAFE_ID_RE: Final = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._:-]{0,255}$")
TIMESTAMP_RE: Final = re.compile(r"^[0-9]{4}-[0-9]{2}-[0-9]{2} [0-9]{2}:[0-9]{2}:[0-9]{2}$")

ALL_CASE_IDS: Final = tuple(f"C{number:04d}" for number in range(1, 73))
READ_ONLY_CASE_IDS: Final = (
    "C0016",
    "C0017",
    "C0018",
    "C0024",
    "C0025",
    "C0026",
    "C0052",
    "C0053",
    "C0054",
    "C0060",
    "C0061",
    "C0062",
)
WRITE_CASE_IDS: Final = tuple(
    case_id for case_id in ALL_CASE_IDS if case_id not in READ_ONLY_CASE_IDS
)


def table_matches_case(table_name: str, case_id: str) -> bool:
    """Return whether a canonical requirement table belongs to the exact case."""
    return (
        TABLE_NAME_RE.fullmatch(table_name) is not None
        and table_name.rsplit("_", maxsplit=1)[-1].upper() == case_id
    )


def runtime_table_matches_case(table_name: str, case_id: str) -> bool:
    """Return whether an attempt-owned physical table retains the canonical case prefix."""
    prefix = f"test_table_15862_{case_id.lower()}_"
    return RUNTIME_TABLE_NAME_RE.fullmatch(table_name) is not None and table_name.startswith(prefix)
