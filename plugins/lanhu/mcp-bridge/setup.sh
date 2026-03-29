#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Check uv is installed
if ! command -v uv &> /dev/null; then
  echo "[lanhu] ERROR: uv is not installed."
  echo "[lanhu] Install it with: curl -LsSf https://astral.sh/uv/install.sh | sh"
  exit 1
fi

# Check if submodule is configured
if [ ! -f "$PROJECT_ROOT/.gitmodules" ] || ! grep -q "lanhu-mcp" "$PROJECT_ROOT/.gitmodules" 2>/dev/null; then
  echo "[lanhu] ERROR: lanhu-mcp submodule is not configured in .gitmodules."
  echo "[lanhu] This is an external dependency required for Lanhu/Axure PRD fetching."
  echo "[lanhu] To set it up:"
  echo "[lanhu]   git submodule add https://github.com/your-org/lanhu-mcp.git plugins/lanhu/mcp-bridge/lanhu-mcp"
  echo "[lanhu] Or if the submodule config exists but was not cloned:"
  echo "[lanhu]   git submodule update --init --recursive"
  exit 1
fi

# Update submodule
echo "[lanhu] Updating submodule..."
cd "$PROJECT_ROOT"
git submodule update --init --remote plugins/lanhu/mcp-bridge/lanhu-mcp 2>&1 || {
  echo "[lanhu] ERROR: Failed to initialize/update lanhu-mcp submodule."
  echo "[lanhu] This external dependency is required for Lanhu/Axure PRD fetching."
  echo "[lanhu] Please run: git submodule update --init --recursive"
  echo "[lanhu] Or check network connectivity."
  exit 1
}

# Install Python dependencies
echo "[lanhu] Installing Python dependencies..."
cd "$SCRIPT_DIR/lanhu-mcp"
uv sync

echo "[lanhu] Ready."
