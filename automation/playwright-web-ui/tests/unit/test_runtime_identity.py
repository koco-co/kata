from __future__ import annotations

from dataclasses import replace

import pytest

from playwright_web_ui.manifest import CaseKey
from playwright_web_ui.runtime_identity import AutomationRuntimeIdentity, RuntimeIdentityError

_COLLISION_TOKEN_LENGTH = 11


def identity() -> AutomationRuntimeIdentity:
    return AutomationRuntimeIdentity(
        case=CaseKey(project_id="data-assets", feature_id="quality-rules", case_id="C0001"),
        logical_run_id="20260809-1200-run-01",
        execution_id="execution-01",
        executor_id="playwright-web-ui",
        attempt=1,
        worker_id="serial",
    )


def test_collision_token_is_stable_and_attempt_worker_scoped() -> None:
    current = identity()

    assert current.collision_token == identity().collision_token
    assert current.collision_token.startswith("a")
    assert len(current.collision_token) == _COLLISION_TOKEN_LENGTH
    assert replace(current, attempt=2).collision_token != current.collision_token
    assert replace(current, worker_id="gw0").collision_token != current.collision_token


def test_unique_name_preserves_the_complete_business_base() -> None:
    current = identity()

    value = current.unique_name("quality_rule", max_length=50)

    assert value == f"quality_rule_{current.collision_token}"


@pytest.mark.parametrize("base", ["", " leading", "trailing ", "bad\nname"])
def test_unique_name_rejects_unsafe_or_ambiguous_bases(base: str) -> None:
    with pytest.raises(RuntimeIdentityError, match="RUNTIME_IDENTITY_NAME_INVALID"):
        identity().unique_name(base)


def test_unique_name_refuses_to_truncate_business_meaning() -> None:
    with pytest.raises(RuntimeIdentityError, match="RUNTIME_IDENTITY_NAME_TOO_LONG"):
        identity().unique_name("meaningful-name", max_length=20)
