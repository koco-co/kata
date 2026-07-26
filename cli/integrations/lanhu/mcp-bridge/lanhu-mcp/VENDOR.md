# Vendoring notes — lanhu-mcp

This directory is a **vendored, trimmed copy** of a third-party MCP server,
bundled into the kata runtime so the `lanhu` plugin works without a separate
external clone/install.

## Source

- **Upstream repository**: https://github.com/dsphper/lanhu-mcp
- **Vendored version**: `1.0.0` (see `pyproject.toml`)
- **License**: MIT (`LICENSE` retained)

## What kata keeps

Only the files required to install and run the server inside kata:

| File | Why kept |
| --- | --- |
| `lanhu_mcp_server.py` | The MCP server itself (`py-modules`, entry point). |
| `pyproject.toml` | Dependency manifest consumed by `uv sync`. |
| `LICENSE` | MIT compliance for the vendored code. |
| `.gitignore` | Ignores Python build artifacts (`.venv/`, `__pycache__/`, …). |
| `README.md` | Slim stub; also referenced by `pyproject.toml` `readme`. |

## What was removed (and why)

Upstream maintenance scaffolding that is noise inside kata's runtime:

- **Container / distribution**: `Dockerfile`, `.dockerignore`,
  `docker-compose.yml`.
- **Upstream docs**: `CHANGELOG.md`, `DEMO.md`, `DEPLOY.md`, `SECURITY.md`,
  `RELEASE_NOTES_v1.0.0.md`, `CODE_OF_CONDUCT.md`, `CONTRIBUTING.md`,
  `ai-install-guide.md`, `GET-COOKIE-TUTORIAL.md`, `README_EN.md`.
- **Example env templates**: `config.example.env`, `.env.example` (kata declares
  `KATA_LANHU_*` in the repository `.env.example` and reads values from root `.env`).
- **Install scripts**: `easy-install.{bat,sh}`, `quickstart.{bat,sh}`,
  `setup-env.{bat,sh}` — kata owns install via `../setup.sh` (`uv sync`).
- **Duplicate manifest**: `requirements.txt` (overlapped `pyproject.toml`
  dependencies and had drifted versions).
- **Upstream community/CI**: `.github/` (issue/PR templates, funding, release
  and docs-sync workflows), `images/wechat.jpg`.
- **Upstream test suite**: `tests/` (pytest; needs the `[dev]` extras that
  kata's `uv sync` does not install, and kata never runs them).

## Updating

To refresh against upstream:

1. Pull the desired tag/commit from the upstream repository.
2. Copy only `lanhu_mcp_server.py`, `pyproject.toml`, `LICENSE`, `.gitignore`.
3. Re-slim `README.md` and bump the version recorded above.
4. Run `cli/integrations/lanhu/mcp-bridge/setup.sh` to re-resolve dependencies,
   then exercise the `lanhu` plugin fetch path before committing.
