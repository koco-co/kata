"""Command-line boundary for the Playwright Web UI executor lifecycle."""

from __future__ import annotations

import argparse
from pathlib import Path
from typing import TYPE_CHECKING, NoReturn, cast

from rich.console import Console

from playwright_web_ui.lifecycle import (
    LifecycleError,
    collect_execution,
    doctor_executor,
    run_execution,
    setup_executor,
)

if TYPE_CHECKING:
    from collections.abc import Sequence

_CLI_USAGE_INVALID = "CLI_USAGE_INVALID"
_WORKERS_INVALID = "WORKERS_INVALID"
_WORKERS_MESSAGE = "workers must be a positive integer"


class HelpRequestedError(Exception):
    """Internal control flow for a successfully rendered help page."""


class LifecycleArgumentParser(argparse.ArgumentParser):
    """Argument parser that reports usage errors without exiting library callers."""

    def error(self, message: str) -> NoReturn:
        """Raise a stable usage error instead of terminating the caller."""
        raise LifecycleError(_CLI_USAGE_INVALID, message)

    def exit(self, status: int = 0, message: str | None = None) -> NoReturn:
        """Convert argparse termination into typed control flow for the module boundary."""
        if message:
            self._print_message(message)
        if status == 0:
            raise HelpRequestedError
        detail = message or f"argument parser returned status {status}"
        raise LifecycleError(_CLI_USAGE_INVALID, detail.strip())


def main(arguments: Sequence[str] | None = None) -> int:
    """Dispatch one lifecycle command and return its process-compatible exit code."""
    console = Console()
    try:
        parsed = _parser().parse_args(arguments)
        return _dispatch(parsed, console)
    except HelpRequestedError:
        return 0
    except LifecycleError as error:
        Console(stderr=True).print(f"[red]{error}[/red]")
        return error.exit_code


def _dispatch(parsed: argparse.Namespace, console: Console) -> int:
    command = cast("str", parsed.command)
    if command == "setup":
        result = setup_executor()
        console.print("[green]playwright-web-ui setup complete[/green]")
        return result
    if command == "doctor":
        return doctor_executor(console=console)
    manifest = Path(cast("str", parsed.execution_manifest))
    if command == "collect":
        return collect_execution(manifest)
    if command == "run":
        workers = cast("int | None", parsed.workers)
        return run_execution(manifest, workers=workers)
    message = f"unknown command: {command}"
    raise LifecycleError(_CLI_USAGE_INVALID, message)


def _parser() -> LifecycleArgumentParser:
    parser = LifecycleArgumentParser(prog="playwright-web-ui")
    commands = parser.add_subparsers(dest="command", required=True)
    commands.add_parser("setup", help="synchronize the Chromium browser runtime")
    commands.add_parser("doctor", help="inspect local dependencies and suite registrations")
    collect = commands.add_parser("collect", help="collect the exact manifest-selected suite")
    _add_manifest_argument(collect)
    run = commands.add_parser("run", help="run one immutable execution attempt")
    _add_manifest_argument(run)
    run.add_argument("--workers", type=_positive_integer, help="explicit pytest-xdist worker count")
    return parser


def _add_manifest_argument(parser: argparse.ArgumentParser) -> None:
    parser.add_argument("--execution-manifest", required=True, metavar="PATH")


def _positive_integer(value: str) -> int:
    try:
        parsed = int(value)
    except ValueError as error:
        raise argparse.ArgumentTypeError(_WORKERS_MESSAGE) from error
    if parsed < 1:
        raise LifecycleError(_WORKERS_INVALID, _WORKERS_MESSAGE)
    return parsed
