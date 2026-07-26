# Lanhu MCP Server (vendored)

A Model Context Protocol (MCP) server for extracting and analyzing Lanhu / Axure
design documents.

> **This is a trimmed, vendored copy** bundled into the kata runtime so the
> `lanhu` plugin can fetch Lanhu/Axure PRDs without an external install step.
> Only the runtime-essential files are kept. For the full project — docs,
> changelog, container assets, and the upstream test suite — see the canonical
> source. Provenance and update instructions are in [`VENDOR.md`](./VENDOR.md).

- **Upstream**: https://github.com/dsphper/lanhu-mcp
- **License**: MIT (see [`LICENSE`](./LICENSE))
- **Module**: `lanhu_mcp_server.py` (entry point `lanhu-mcp = "lanhu_mcp_server:main"`)

## How kata uses it

The kata `lanhu` plugin installs Python dependencies via
`cli/integrations/lanhu/mcp-bridge/setup.sh` (which runs `uv sync` against
`pyproject.toml`), then drives the server through the plugin's fetch bridge.
Do not run the upstream `easy-install` / `quickstart` scripts here — they were
removed because kata owns the install flow.
