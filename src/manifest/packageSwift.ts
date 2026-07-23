/**
 * Best-effort parser for Swift Package Manager `Package.swift` manifests.
 *
 * `Package.swift` is executable Swift, not data, and declares dependencies with
 * version *ranges* (`from:`, `.upToNextMajor`, `"1.0.0"..<"2.0.0"`). Only an
 * `exact:` requirement yields a concrete version; every other form is reported with
 * a `null` version (unresolved) rather than guessing — the same policy applied to
 * Gradle dynamic versions. Prefer the `Package.resolved` lock file for exact
 * versions; this parser is the fallback when only the manifest is present.
 */

import { gitUrlToCoordinate } from "./gitCoordinate";
import type { ManifestParseResult, ResolvedDependency } from "./types";

/**
 * Parse a `Package.swift` into best-effort SPM dependencies (exact pins only; ranges
 * reported as unresolved).
 *
 * @param content - Raw `Package.swift` content.
 * @param source - Manifest path for provenance/warnings (default `Package.swift`).
 */
export function parsePackageSwift(
  content: string,
  source = "Package.swift",
): ManifestParseResult {
  const dependencies: ResolvedDependency[] = [];
  const warnings: string[] = [];

  // Match `.package(… url: "URL" …)` up to the first closing paren. Nested calls
  // (e.g. `.upToNextMajor(from: "1.0.0")`) truncate the captured args, which is fine
  // because those forms have no exact pin to extract anyway.
  const pkgRe = /\.package\(([^)]*url:\s*"[^"]+"[^)]*)\)/g;
  const urlRe = /url:\s*"([^"]+)"/;
  const exactRe = /exact:\s*"([^"]+)"/;

  for (let match = pkgRe.exec(content); match !== null; match = pkgRe.exec(content)) {
    const args = match[1];
    const urlMatch = args.match(urlRe);
    if (!urlMatch) {
      continue;
    }
    const url = urlMatch[1];
    const coordinate = gitUrlToCoordinate(url) ?? url;

    const exactMatch = args.match(exactRe);
    const version = exactMatch ? exactMatch[1] : null;
    if (version === null) {
      warnings.push(
        `${source}: "${coordinate}" declared with a range/branch requirement (no exact pin)`,
      );
    }

    dependencies.push({ coordinate, version, ecosystem: "spm", source });
  }

  return { dependencies, warnings };
}
