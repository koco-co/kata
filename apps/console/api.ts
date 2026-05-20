/**
 * Console HTTP API router. Returns a Response for /api/* paths, or null so the
 * server can fall through to static file serving. Read-only.
 */

import type { FeatureFilters } from "../core/catalog/index.ts";
import {
  getFeature,
  listArtifacts,
  listFeatures,
  listProjectSummaries,
  listSkills,
  parseXmind,
  readTextArtifact,
} from "../core/catalog/index.ts";
import { InvalidInputError } from "../core/errors.ts";
import { errToResponse } from "./errors-http.ts";

const FEATURE_FILTER_KEYS: Array<keyof FeatureFilters> = [
  "module",
  "customer",
  "version",
  "owner",
  "createdAfter",
  "status",
  "automationStatus",
  "lastRun",
];

function readFilters(url: URL): FeatureFilters {
  const filters: Partial<Record<keyof FeatureFilters, string>> = {};
  for (const key of FEATURE_FILTER_KEYS) {
    const value = url.searchParams.get(key);
    if (value !== null && value !== "") {
      filters[key] = value;
    }
  }
  return filters;
}

function jsonNotFound(): Response {
  return Response.json({ error: "Not found" }, { status: 404 });
}

function decodePathSegment(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch (error) {
    if (error instanceof URIError) {
      throw new InvalidInputError("Invalid URL path");
    }
    throw error;
  }
}

export async function handleApi(url: URL): Promise<Response | null> {
  const parts = url.pathname.split("/").filter(Boolean);
  if (parts[0] !== "api") return null;

  try {
    if (parts.length === 2 && parts[1] === "projects") {
      return Response.json(listProjectSummaries());
    }

    if (parts.length === 2 && parts[1] === "skills") {
      return Response.json(listSkills());
    }

    if (parts[1] === "projects" && parts.length >= 4 && parts[3] === "features") {
      const project = decodePathSegment(parts[2]);

      if (parts.length === 4) {
        return Response.json(await listFeatures(project, readFilters(url)));
      }

      const featureId = decodePathSegment(parts[4]);

      if (parts.length === 5) {
        return Response.json(await getFeature(project, featureId));
      }

      if (parts.length === 6 && parts[5] === "artifacts") {
        return Response.json(listArtifacts(project, featureId));
      }

      if (parts.length === 6 && parts[5] === "xmind") {
        return Response.json(await parseXmind(project, featureId));
      }

      if (parts.length === 7 && parts[5] === "artifact") {
        const name = decodePathSegment(parts[6]);
        return new Response(readTextArtifact(project, featureId, name), {
          headers: { "content-type": "text/plain; charset=utf-8" },
        });
      }
    }

    return jsonNotFound();
  } catch (error) {
    return errToResponse(error);
  }
}
