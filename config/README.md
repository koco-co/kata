# Kata runtime configuration

Kata keeps runtime configuration under three owners:

```text
config/env/       Platform automation environments and local auth state
config/infra/     Private SSH hosts, data sources, host keys and credentials
config/repos/     Tracked source-repository catalog
```

Use the CLI to inspect and write configuration. This directory does not contain
an additional Agent instruction layer.

```bash
kata config doctor
kata config doctor --scope infra
kata infra credentials set <credential-name>
kata infra trust-host <host> --fingerprint <SHA256 fingerprint>
kata infra inspect <host> --check connectivity --project <project>
```

The following files are local and must never be committed:

- `infra/hosts.yaml`
- `infra/data_sources.yaml`
- `infra/credentials.yaml`
- non-example files under `env/`

The three `*.example.yaml` files contain schema examples only. They must not
contain real hosts, passwords, cookies, tokens, connection strings or session
paths.
