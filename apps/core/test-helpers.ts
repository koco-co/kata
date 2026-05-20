/**
 * Test fixtures for the catalog read layer.
 *
 * workspaceDir() = resolve(repoRoot(), KATA_WORKSPACE_ROOT ?? "workspace").
 * Setting KATA_WORKSPACE_ROOT to an ABSOLUTE temp dir makes workspaceDir()
 * return that dir verbatim, isolating tests from the real workspace.
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import JSZip from "jszip";

export interface SeedFeatureInput {
  readonly project: string;
  readonly id: string;
  readonly displayName?: string;
  readonly status?: string;
  readonly modules?: string[];
  readonly customers?: string[];
  readonly versions?: string[];
  readonly owners?: string[];
  readonly createdAt?: string;
  readonly automationStatus?: string;
  readonly lastRunStatus?: string;
  readonly archiveMd?: string;
}

export interface Workspace {
  readonly root: string;
  seedFeature(input: SeedFeatureInput): string; // returns feature dir
  seedXmind(project: string, id: string, contentJson: unknown): Promise<void>;
  writeArtifact(project: string, id: string, name: string, body: string): void;
  cleanup(): void;
}

export function makeWorkspace(): Workspace {
  const prev = process.env.KATA_WORKSPACE_ROOT;
  const root = mkdtempSync(join(tmpdir(), "kata-platform-test-"));
  process.env.KATA_WORKSPACE_ROOT = root;

  function featureDir(project: string, id: string): string {
    return join(root, project, "features", id);
  }

  return {
    root,
    seedFeature(input) {
      const dir = featureDir(input.project, input.id);
      mkdirSync(dir, { recursive: true });
      const meta = {
        id: input.id,
        display_name: input.displayName ?? input.id,
        status: input.status ?? "active",
        modules: input.modules ?? ["dq"],
        customers: input.customers ?? [],
        versions: input.versions ?? ["v1"],
        owners: input.owners ?? ["qa"],
        created_at: input.createdAt ?? "2026-01",
      };
      const metaYaml = Object.entries(meta)
        .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
        .join("\n");
      writeFileSync(join(dir, "metadata.yaml"), `${metaYaml}\n`);
      writeFileSync(
        join(dir, "manifest.json"),
        JSON.stringify(
          {
            automation: {
              status: input.automationStatus ?? "not-started",
              last_run_status: input.lastRunStatus ?? "not-run",
            },
          },
          null,
          2,
        ),
      );
      if (input.archiveMd !== undefined) {
        writeFileSync(join(dir, "archive.md"), input.archiveMd);
      }
      return dir;
    },
    async seedXmind(project, id, contentJson) {
      const zip = new JSZip();
      zip.file("content.json", JSON.stringify(contentJson));
      const buf = await zip.generateAsync({ type: "nodebuffer" });
      writeFileSync(join(featureDir(project, id), "cases.xmind"), buf);
    },
    writeArtifact(project, id, name, body) {
      writeFileSync(join(featureDir(project, id), name), body);
    },
    cleanup() {
      if (prev === undefined) delete process.env.KATA_WORKSPACE_ROOT;
      else process.env.KATA_WORKSPACE_ROOT = prev;
      rmSync(root, { recursive: true, force: true });
    },
  };
}
