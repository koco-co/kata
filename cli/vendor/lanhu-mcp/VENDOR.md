# Vendoring notes — lanhu-mcp

This directory is a **vendored, trimmed copy** of a third-party MCP server,
bundled into the kata runtime so the `lanhu` plugin works without a separate
external clone/install.

## Source

- **Upstream repository**: https://github.com/dsphper/lanhu-mcp
- **Upstream reference commit**: `e85acd3e490dedd854f6b74e68345e75352e3fe1`
- **Vendored version**: `1.0.0` (see `pyproject.toml`)
- **License**: MIT (`LICENSE` retained)

## What kata keeps

Only the files required to install and run the server inside kata:

| File | Why kept |
| --- | --- |
| `lanhu_mcp_server.py` | The MCP server itself (`py-modules`, entry point). |
| `pyproject.toml` | Dependency manifest consumed by `uv sync`. |
| `uv.lock` | Resolved dependency lockfile; kata tracks it (see below). |
| `LICENSE` | MIT compliance for the vendored code. |
| `.gitignore` | Ignores Python build artifacts (`.venv/`, `__pycache__/`, …). Kata adds a `!uv.lock` exception so the lockfile stays tracked. |
| `README.md` | Slim stub; also referenced by `pyproject.toml` `readme`. |

Kata's bridge consumes the extractor's low-level page text and screenshot
results directly. It does not persist `lanhu_get_ai_analyze_page_result`
prompts or the upstream staged-agent instructions as PRD content.

## Lock file policy

Upstream ignores `uv.lock` (library convention); kata **tracks** it so every
machine resolves the exact same dependency set.
`../../integrations/lanhu/mcp-bridge/setup.sh` therefore installs with
`uv sync --locked`, which fails instead of silently re-resolving when `uv.lock`
is stale. After bumping dependencies in `pyproject.toml` (or refreshing against
upstream), regenerate the lockfile with `uv lock` inside this directory and
commit the updated `uv.lock` together with the change.

## What was removed (and why)

Upstream maintenance scaffolding that is noise inside kata's runtime:

- **Container / distribution**: `Dockerfile`, `.dockerignore`,
  `docker-compose.yml`.
- **Upstream docs**: `CHANGELOG.md`, `DEMO.md`, `DEPLOY.md`, `SECURITY.md`,
  `RELEASE_NOTES_v1.0.0.md`, `CODE_OF_CONDUCT.md`, `CONTRIBUTING.md`,
  `ai-install-guide.md`, `GET-COOKIE-TUTORIAL.md`, `README_EN.md`.
- **Example env templates**: upstream examples are not copied; kata owns plugin
  configuration in `config/private/integrations/lanhu.yaml` and passes only its path to the bridge.
- **Install scripts**: `easy-install.{bat,sh}`, `quickstart.{bat,sh}`,
  `setup-env.{bat,sh}` — kata owns install via
  `../../integrations/lanhu/mcp-bridge/setup.sh` (`uv sync`).
- **Duplicate manifest**: `requirements.txt` (overlapped `pyproject.toml`
  dependencies and had drifted versions).
- **Upstream community/CI**: `.github/` (issue/PR templates, funding, release
  and docs-sync workflows), `images/wechat.jpg`.
- **Upstream test suite**: `tests/` (pytest; needs the `[dev]` extras that
  kata's `uv sync` does not install, and kata never runs them).

## Updating

To refresh against upstream:

1. Pull the desired tag/commit from the upstream repository.
2. Copy only `lanhu_mcp_server.py`, `pyproject.toml`, `LICENSE`, `.gitignore`
   (re-applying kata's `!uv.lock` exception).
3. Re-slim `README.md`, bump the version recorded above, and regenerate
   `uv.lock` (`uv lock`).
4. Run `cli/integrations/lanhu/mcp-bridge/setup.sh` to re-resolve dependencies,
   then exercise the `lanhu` plugin fetch path before committing.
