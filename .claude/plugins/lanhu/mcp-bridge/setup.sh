#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
MCP_DIR="$SCRIPT_DIR/lanhu-mcp"

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

# Install Python dependencies
echo "[lanhu] Installing Python dependencies..."
cd "$MCP_DIR"
uv sync

echo "[lanhu] Ready."
