/**
 * Matches a search library identifier against a project's declared dependencies to
 * find the concrete version the project pins it to — used to default searches to the
 * version a project actually uses.
 */

import { pinnedVersion } from "./documentationUrl";
import type { ResolvedDependency } from "./types";

/**
 * Find the concrete (pinned) version a project declares for a library, or `null`.
 *
 * Matching is intentionally forgiving because the search `library` identifier is
 * whatever name the docs were indexed under, which may not equal the full coordinate:
 *  1. exact coordinate match (`com.squareup.okhttp3:okhttp`, `provider`, a plugin id);
 *  2. Maven artifact-name match (search `okhttp` ~ `com.squareup.okhttp3:okhttp`).
 *
 * Only pinned versions are returned; constraint/dynamic versions are ignored so the
 * caller falls back to its normal version resolution.
 */
export function projectVersionForLibrary(
  dependencies: ResolvedDependency[],
  library: string,
): string | null {
  const lib = library.trim();
  if (!lib) {
    return null;
  }

  // 1. Exact coordinate match.
  for (const dep of dependencies) {
    if (dep.coordinate === lib) {
      const version = pinnedVersion(dep.version);
      if (version) {
        return version;
      }
    }
  }

  // 2. Maven artifact-name match.
  for (const dep of dependencies) {
    if (dep.ecosystem === "maven" && dep.coordinate.split(":")[1] === lib) {
      const version = pinnedVersion(dep.version);
      if (version) {
        return version;
      }
    }
  }

  return null;
}
