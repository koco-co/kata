export function extractSourceFactSet(manifest: {
  case_drafting?: { requirement_atoms?: { source_ref: string }[] };
}): Set<string> {
  const set = new Set<string>();
  for (const a of manifest.case_drafting?.requirement_atoms ?? []) {
    set.add(a.source_ref.split("#sha256:")[0]);
  }
  return set;
}

export function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}
