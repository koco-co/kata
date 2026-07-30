# Kata runtime configuration

Kata keeps configuration under five owners:

```text
config/env/       Platform automation environments and local auth state
config/infra/     Private SSH hosts, data sources, host keys and credentials
config/plugin/    Private Lanhu, ZenTao and notification integration settings
config/repos/     Local private source-repository catalog (sources.yaml is untracked)
config/xmind/     Tracked public project-to-XMind-root mappings
```

Keep private config directories at `0700` and every private non-example YAML at
`0600`; `kata config doctor` checks both. Tracked public configuration under
`config/xmind/`, the `*.example.yaml` templates, and this README belong in Git.

Use the CLI to inspect and write configuration. This directory does not contain
an additional Agent instruction layer.

```bash
kata config doctor
kata config doctor --scope infra
kata config plugins-migrate --source /path/to/old.env --root /path/to/kata --apply
kata infra credentials set <credential-name>
kata infra trust-host <host> --fingerprint <SHA256 fingerprint>
kata infra inspect <host> --check connectivity --project <project>
```

The following files are local and must never be committed:

- `infra/hosts.yaml`
- `infra/data_sources.yaml`
- `infra/credentials.yaml`
- `repos/sources.yaml`
- non-example files under `env/`
- non-example files under `plugin/`

Every `repos/sources.yaml` entry declares `project`, configured release
`branch`, and non-empty `modules` / `customers` selector arrays. Use the
literal `"*"` only for a repository intentionally shared across every module
or customer. `kata repos prepare --project ... --module ... --customer ...`
updates only matching repositories and blocks when none match.

The tracked `*.example.yaml` files contain schema examples only. They must not
contain real hosts, passwords, cookies, tokens, connection strings or session
paths.

`xmind/projects.yaml` is the single source of truth for XMind root titles.
Every supported project declares a display `root_name` and its fixed ZenTao
module ID. Missing project mappings are hard errors; renderers do not infer a
fallback from a feature path.

Plugin examples follow the same rule. Use `kata config plugins-migrate` once
with an explicit old dotenv path, then remove that dotenv file. Runtime
environment variables remain supported only as explicit CI or one-off
overrides; the repository does not load a root `.env` automatically.

ZenTao fetch credentials and the `kata zentao create` product/module/assignee
mapping share `config/plugin/zentao.yaml`; its tracked example documents both
sections. There is no second create-config file under `cli/`.

Set `KATA_WORKSPACE_ROOT` to an absolute path to move the project workspace
out of the framework repository: the CLI then resolves projects under
`<KATA_WORKSPACE_ROOT>/<project>` instead of the in-repo `workspace/`, so
real project data stays in a private location and the framework repository
keeps only redacted minimal fixtures.
