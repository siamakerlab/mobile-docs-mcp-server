/**
 * Best-effort parser for Xcode `project.pbxproj` files (inside `*.xcodeproj`).
 *
 * `.pbxproj` is an old-style NeXTSTEP/OpenStep plist, not JSON. Rather than a full
 * plist parse, this extracts each `XCRemoteSwiftPackageReference`'s `repositoryURL`
 * and `requirement` with targeted regexes. Only an `exactVersion` requirement yields
 * a concrete version; ranges/branches are reported unresolved — same policy as the
 * other loose manifests.
 *
 * The exact resolved versions for an Xcode project live in the embedded
 * `Package.resolved` (parsed separately, and preferred). This parser mainly enumerates
 * which SwiftPM packages are wired into the project when that lock isn't present.
 */

import { gitUrlToCoordinate } from "./gitCoordinate";
import type { ManifestParseResult, ResolvedDependency } from "./types";

/**
 * Parse a `project.pbxproj` into best-effort SPM dependencies from its
 * `XCRemoteSwiftPackageReference` entries.
 *
 * @param content - Raw `project.pbxproj` content.
 * @param source - Manifest path for provenance/warnings (default `project.pbxproj`).
 */
export function parsePbxproj(
  content: string,
  source = "project.pbxproj",
): ManifestParseResult {
  const dependencies: ResolvedDependency[] = [];
  const warnings: string[] = [];
  const seen = new Set<string>();

  // A `repositoryURL = "…";` followed by its `requirement = { … }` block. The
  // requirement body has no nested braces, so `[^}]*` captures it safely.
  const refRe = /repositoryURL\s*=\s*"([^"]+)"\s*;[\s\S]*?requirement\s*=\s*\{([^}]*)\}/g;

  for (let match = refRe.exec(content); match !== null; match = refRe.exec(content)) {
    const url = match[1];
    const requirement = match[2];
    const coordinate = gitUrlToCoordinate(url) ?? url;
    if (seen.has(coordinate)) {
      continue;
    }
    seen.add(coordinate);

    const kind = requirement.match(/kind\s*=\s*([A-Za-z]+)/)?.[1];
    let version: string | null = null;
    if (kind === "exactVersion") {
      version = requirement.match(/version\s*=\s*"?([0-9][^\s";]*)"?/)?.[1] ?? null;
    }
    if (version === null) {
      warnings.push(
        `${source}: "${coordinate}" declared with a ${kind ?? "non-exact"} requirement (no exact pin)`,
      );
    }

    dependencies.push({ coordinate, version, ecosystem: "spm", source });
  }

  return { dependencies, warnings };
}
