/**
 * Maps a resolved dependency to the documentation URL for its ecosystem's registry
 * (the hosts handled by the Phase 2 scraper strategies), so a project's declared
 * coordinates can be turned directly into scrape targets.
 *
 * - `maven` → javadoc.io (`/doc/{group}/{artifact}[/{version}]`)
 * - `pub` → pub.dev (`/packages/{name}[/versions/{version}]`)
 * - `gradle-plugin` → plugins.gradle.org (`/plugin/{id}[/{version}]`)
 *
 * A concrete pinned version (e.g. `4.12.0`, `1.9.22`, `1.0.0-alpha`) is included in
 * the path. Constraint or dynamic versions (`^1.1.0`, `>=1.0.0`, `1.0.+`, `any`, an
 * unresolved catalog ref → `null`) fall back to the package's latest page.
 */

import type { ResolvedDependency } from "./types";

/**
 * Return the version if it is a concrete, path-safe pin (not a range/constraint),
 * otherwise `null`. Used both for building versioned doc URLs and for choosing a
 * project-declared version to search against.
 */
export function pinnedVersion(version: string | null): string | null {
  if (version === null) {
    return null;
  }
  // Must start with a digit and contain only version-safe chars (no ^ ~ > < * + space).
  return /^[0-9][\w.-]*$/.test(version) ? version : null;
}

/**
 * Build the registry documentation URL for a dependency, or `null` if the
 * coordinate cannot be mapped (e.g. a malformed Maven coordinate).
 */
export function documentationUrl(dep: ResolvedDependency): string | null {
  const version = pinnedVersion(dep.version);

  switch (dep.ecosystem) {
    case "maven": {
      const [group, artifact] = dep.coordinate.split(":");
      if (!group || !artifact) {
        return null;
      }
      const base = `https://javadoc.io/doc/${group}/${artifact}`;
      return version ? `${base}/${version}` : base;
    }
    case "pub": {
      const base = `https://pub.dev/packages/${dep.coordinate}`;
      return version ? `${base}/versions/${version}` : base;
    }
    case "gradle-plugin": {
      const base = `https://plugins.gradle.org/plugin/${dep.coordinate}`;
      return version ? `${base}/${version}` : base;
    }
  }
}
