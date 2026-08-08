"""Packaged JSON contracts shared by automation control and execution planes."""

from __future__ import annotations

import json
from importlib.resources import files
from typing import cast

__all__ = ["load_execution_manifest_schema"]


def load_execution_manifest_schema() -> dict[str, object]:
    """Load the canonical immutable execution-manifest JSON Schema."""
    resource = files(__package__).joinpath("schemas/execution-manifest.schema.json")
    value = cast("object", json.loads(resource.read_text(encoding="utf-8")))
    if not isinstance(value, dict):
        msg = "execution-manifest schema must be a JSON object"
        raise TypeError(msg)
    return cast("dict[str, object]", value)
