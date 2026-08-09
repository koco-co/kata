"""Fail-closed gates for canonical cases awaiting source-backed migration facts."""

from __future__ import annotations

from dataclasses import dataclass
from typing import TYPE_CHECKING, Final

if TYPE_CHECKING:
    from playwright_web_ui.pytest_plugin import StepFixture
    from playwright_web_ui.runtime_identity import AutomationRuntimeIdentity


CANONICAL_MIGRATION_FIXTURE_REQUIRED: Final = "CANONICAL_MIGRATION_FIXTURE_REQUIRED"


class CanonicalMigrationGateError(AssertionError):
    """Raised when a migrated case lacks an attested product fixture contract."""

    def __init__(self, code: str, *, feature_id: str, case_id: str) -> None:
        """Keep the stable error code and canonical identity for diagnostics."""
        self.code = code
        self.feature_id = feature_id
        self.case_id = case_id
        super().__init__(f"{code}: {feature_id}/{case_id}")


@dataclass(frozen=True, slots=True)
class CanonicalMigrationGate:
    """Bind a candidate to its immutable identity before requiring its fixture."""

    project_id: str
    feature_id: str
    case_id: str

    def verify_identity(self, identity: AutomationRuntimeIdentity) -> None:
        """Reject a candidate whose decorator identity differs from the manifest item."""
        actual = (
            identity.case.project_id,
            identity.case.feature_id,
            identity.case.case_id,
        )
        expected = (self.project_id, self.feature_id, self.case_id)
        if actual != expected:
            message = "runtime identity does not match the canonical case"
            raise AssertionError(message)

    def require_attested_fixture(self) -> None:
        """Stop before browser mutation until stable fixture and UI facts are supplied."""
        raise CanonicalMigrationGateError(
            CANONICAL_MIGRATION_FIXTURE_REQUIRED,
            feature_id=self.feature_id,
            case_id=self.case_id,
        )


def run_blocked_candidate(  # noqa: PLR0913
    gate: CanonicalMigrationGate,
    identity: AutomationRuntimeIdentity,
    step: StepFixture,
    *,
    action: str,
    expected: str,
    target: str,
) -> None:
    """Record the planned UI checkpoint and fail before unverified browser mutation."""
    gate.verify_identity(identity)
    with step(action=action, expected=expected, target=target):
        gate.require_attested_fixture()
