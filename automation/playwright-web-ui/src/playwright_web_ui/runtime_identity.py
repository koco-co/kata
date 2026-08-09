"""Public, immutable identity for one selected automation runtime item."""

from __future__ import annotations

import re
from dataclasses import dataclass
from hashlib import blake2s
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from playwright_web_ui.manifest import CaseKey

_AUTOMATION_ID_RE = re.compile(r"^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$")
_CASE_ID_RE = re.compile(r"^C[0-9]{4}$")
_EXECUTION_ID_RE = re.compile(r"^execution-[0-9]{2,}$")
_LOGICAL_RUN_ID_RE = re.compile(
    r"^[0-9]{8}-[0-9]{4}-(?:preflight|run|selfrun|repair|baseline)-[0-9]{2,}$"
)
_WORKER_ID_RE = re.compile(r"^(?:serial|gw[0-9]+)$")
_CONTROL_RE = re.compile(r"[\x00-\x1f\x7f]")
_TOKEN_BYTES = 5
_IDENTITY_INVALID = "RUNTIME_IDENTITY_INVALID"
_NAME_INVALID = "RUNTIME_IDENTITY_NAME_INVALID"
_NAME_TOO_LONG = "RUNTIME_IDENTITY_NAME_TOO_LONG"


class RuntimeIdentityError(ValueError):
    """Raise a stable failure when a runtime identity or generated name is invalid."""

    def __init__(self, code: str, message: str) -> None:
        """Initialize a non-secret stable error."""
        self.code = code
        super().__init__(f"{code}: {message}")


@dataclass(frozen=True, slots=True)
class AutomationRuntimeIdentity:
    """Identity shared by one manifest case, attempt, and xdist worker."""

    case: CaseKey
    logical_run_id: str
    execution_id: str
    executor_id: str
    attempt: int
    worker_id: str

    def __post_init__(self) -> None:
        """Reject identities that cannot originate from the canonical control plane."""
        valid = (
            _AUTOMATION_ID_RE.fullmatch(self.case.project_id) is not None
            and _AUTOMATION_ID_RE.fullmatch(self.case.feature_id) is not None
            and _CASE_ID_RE.fullmatch(self.case.case_id) is not None
            and _LOGICAL_RUN_ID_RE.fullmatch(self.logical_run_id) is not None
            and _EXECUTION_ID_RE.fullmatch(self.execution_id) is not None
            and _AUTOMATION_ID_RE.fullmatch(self.executor_id) is not None
            and not isinstance(self.attempt, bool)
            and self.attempt >= 1
            and _WORKER_ID_RE.fullmatch(self.worker_id) is not None
        )
        if not valid:
            raise RuntimeIdentityError(
                _IDENTITY_INVALID,
                "identity does not match the canonical execution contract",
            )

    @property
    def collision_token(self) -> str:
        """Return a compact deterministic token scoped to case, attempt, and worker."""
        payload = "\0".join(
            (
                str(self.case),
                self.logical_run_id,
                self.execution_id,
                self.executor_id,
                str(self.attempt),
                self.worker_id,
            )
        )
        digest = blake2s(payload.encode(), digest_size=_TOKEN_BYTES).hexdigest()
        return f"a{digest}"

    def unique_name(self, base: str, *, max_length: int = 50) -> str:
        """Append the collision token without truncating the caller's business name."""
        if (
            not base
            or base != base.strip()
            or _CONTROL_RE.search(base) is not None
            or isinstance(max_length, bool)
            or max_length < 1
        ):
            raise RuntimeIdentityError(
                _NAME_INVALID,
                "base must be trimmed text and max_length must be a positive integer",
            )
        value = f"{base}_{self.collision_token}"
        if len(value) > max_length:
            raise RuntimeIdentityError(
                _NAME_TOO_LONG,
                "business base plus collision token exceeds max_length",
            )
        return value
