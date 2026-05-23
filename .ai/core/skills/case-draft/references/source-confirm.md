# Source-code confirmation

Trigger: after module-identify has produced a stable {project, module} context, before historical-context.

Goal: pin the front-end and back-end source repos (group / projectname / branch) that this feature's cases must consult, as a deterministic, user-confirmed input.

Procedure:
1. Derive a recommendation:
   - First, look up the knowledge base mapping "开发版本 → repos+branch" (see knowledge entry `source-repo-map`). The Lanhu/Axure PRD usually carries a "开发版本" keyword (e.g. "开发版本：6.3岚图定制化分支").
   - If unmapped, infer semantically from the PRD/page content.
2. Present ONE confirmation round (front-end + back-end together) via the runtime's ask-user primitive:
   > 请确认该功能涉及的前端和后端 GitHub 仓库：
   > 前端: <group>/<repo>@<branch>
   > 后端: <group>/<repo>@<branch>
3. If `.kata/repos` already contains the confirmed repos, present them as the default; if missing, request them (give clone guidance) or record a blocking todo.
4. Write the confirmed triples into **`source-snapshot.json#confirmed_source_repos[]`** (`SourceSnapshot@1`), each `{group, project, branch, role}`. Also record **`source-snapshot.json#slug_source`** — the stable identity of the slug origin passed to `kata features resolve` (e.g. `lanhu:cd882ee8` / `prd:15696.txt`) so a later different-source request at the same path is detected (Gap 1 collision rule). Do NOT write either to `metadata.yaml` — `FeatureMetadata@1` is `additionalProperties:false` with no `source_repos`/`notes` field. The Lanhu URL goes to `metadata.yaml#inputs` (`kind: lanhu`). These confirmed repos become required inputs for verification (repo.line source_refs must resolve into one of them — see L2).

Do NOT proceed to historical-context until the triples are confirmed or explicitly deferred as blocking.
