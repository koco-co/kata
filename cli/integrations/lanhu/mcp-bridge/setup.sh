#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../../../" && pwd)"
MCP_DIR="$REPO_ROOT/cli/vendor/lanhu-mcp"
VENV_DIR="$MCP_DIR/.venv"
INSTALL_TIMEOUT_SECONDS=300

# Check uv is installed
if ! command -v uv &> /dev/null; then
  echo "[lanhu] ERROR: uv is not installed."
  echo "[lanhu] Install it with: curl -LsSf https://astral.sh/uv/install.sh | sh"
  exit 1
fi

# Check bundled lanhu-mcp files are present
if [ ! -d "$MCP_DIR" ]; then
  echo "[lanhu] ERROR: lanhu-mcp directory is missing."
  echo "[lanhu] Expected: $MCP_DIR"
  echo "[lanhu] This dependency is required for Lanhu/Axure PRD fetching."
  exit 1
fi

# Self-heal: a venv whose python is missing or not executable is broken (e.g.
# interrupted install or moved interpreter) and uv sync cannot always repair
# it. Remove it so the install below rebuilds from scratch.
if [ -d "$VENV_DIR" ] && [ ! -x "$VENV_DIR/bin/python" ]; then
  echo "[lanhu] Existing .venv is broken ($VENV_DIR/bin/python is not executable)."
  echo "[lanhu] Removing $VENV_DIR and rebuilding..."
  rm -rf "$VENV_DIR"
fi

# Run an install command with a timeout; on failure print the stderr tail so
# the caller sees the actual pip/uv error instead of a bare exit code.
run_install() {
  local log_file pid status elapsed
  log_file="$(mktemp -t lanhu-setup)"
  "$@" >"$log_file" 2>&1 &
  pid=$!
  elapsed=0
  while kill -0 "$pid" 2>/dev/null; do
    if [ "$elapsed" -ge "$INSTALL_TIMEOUT_SECONDS" ]; then
      kill "$pid" 2>/dev/null
      wait "$pid" 2>/dev/null
      echo "[lanhu] ERROR: install timed out after ${INSTALL_TIMEOUT_SECONDS}s: $*" >&2
      tail -n 20 "$log_file" >&2
      rm -f "$log_file"
      return 124
    fi
    sleep 1
    elapsed=$((elapsed + 1))
  done
  status=0
  wait "$pid" || status=$?
  if [ "$status" -ne 0 ]; then
    echo "[lanhu] ERROR: install failed (exit $status): $*" >&2
    tail -n 20 "$log_file" >&2
  fi
  rm -f "$log_file"
  return "$status"
}

# Install Python dependencies (locked: uv.lock is tracked, see VENDOR.md)
echo "[lanhu] Installing Python dependencies..."
cd "$MCP_DIR"
run_install uv sync --locked

echo "[lanhu] Ready."
