"""Shared scalar normalization for Kata's Lanhu bridge scripts."""

from __future__ import annotations


def scalar_text(value: object) -> str:
    """Match the TypeScript plugin loader's historical scalar-to-string behavior."""
    if isinstance(value, str):
        return value.strip()
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, (int, float)):
        return str(value)
    return ""
