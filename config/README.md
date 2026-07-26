# Kata runtime configuration

Kata keeps runtime configuration under three owners:

```text
config/env/       Platform automation environments and local auth state
config/infra/     Private SSH hosts, data sources, host keys and credentials
config/plugin/    Private Lanhu, ZenTao and notification integration settings
config/repos/     Tracked source-repository catalog
```

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
- non-example files under `env/`
- non-example files under `plugin/`

The tracked `*.example.yaml` files contain schema examples only. They must not
contain real hosts, passwords, cookies, tokens, connection strings or session
paths.

Plugin examples follow the same rule. Use `kata config plugins-migrate` once
with an explicit old dotenv path, then remove that dotenv file. Runtime
environment variables remain supported only as explicit CI or one-off
overrides; the repository does not load a root `.env` automatically.
