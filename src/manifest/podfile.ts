/**
 * Best-effort parser for CocoaPods `Podfile` manifests. The `Podfile` is Ruby DSL
 * with loose version constraints (`pod 'Alamofire', '~> 5.9'`); only a bare exact
 * version string yields a concrete pin. Prefer `Podfile.lock` for exact versions;
 * this is the fallback when only the `Podfile` is present. CocoaPods docs aren't
 * hosted, so these coordinates carry versions for resolution only.
 */

import type { ManifestParseResult, ResolvedDependency } from "./types";

/**
 * Parse a `Podfile` into best-effort CocoaPods dependencies (exact pins only;
 * constraints reported as unresolved).
 *
 * @param content - Raw `Podfile` content.
 * @param source - Manifest path for provenance/warnings (default `Podfile`).
 */
export function parsePodfile(content: string, source = "Podfile"): ManifestParseResult {
  const dependencies: ResolvedDependency[] = [];
  const warnings: string[] = [];
  const seen = new Set<string>();

  // `pod 'Name'` or `pod "Name", '~> 5.9'` (an optional second quoted arg).
  const podRe = /^\s*pod\s+['"]([^'"]+)['"](?:\s*,\s*['"]([^'"]+)['"])?/gm;

  for (let match = podRe.exec(content); match !== null; match = podRe.exec(content)) {
    const podName = match[1].split("/")[0]; // top-level pod (strip subspec)
    if (seen.has(podName)) {
      continue;
    }
    seen.add(podName);

    const raw = match[2]?.trim();
    // A bare version (leading digit) is a pin; operators (~>, >=, <) are ranges.
    const version = raw && /^[0-9]/.test(raw) ? raw : null;
    if (raw && version === null) {
      warnings.push(
        `${source}: "${podName}" declared with a constraint "${raw}" (no exact pin)`,
      );
    }

    dependencies.push({ coordinate: podName, version, ecosystem: "cocoapods", source });
  }

  return { dependencies, warnings };
}
