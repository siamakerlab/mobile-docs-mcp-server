/**
 * Best-effort parser for `build.gradle` / `build.gradle.kts` files.
 *
 * Unlike the version catalog (`libs.versions.toml`), Gradle build scripts are code,
 * not data, so this parser is intentionally shallow: it extracts inline
 * `"group:artifact:version"` dependency coordinates and `id("…") version "…"` plugin
 * declarations via regex. Coordinates that use variables, catalog accessors
 * (`libs.okhttp`), or string interpolation are skipped — those resolve through the
 * version catalog parser or not at all.
 */

import type { ManifestParseResult, ResolvedDependency } from "./types";

/** `"group:artifact:version"` or `'group:artifact:version'` in a dependency string. */
const COORDINATE_RE = /["']([A-Za-z][\w.-]*):([\w.-]+):([\w.+-]+)["']/g;

/** `id("plugin.id") version "1.2.3"` (Kotlin DSL) or the Groovy equivalent. The leading
 * `\b` prevents matching `id` inside a larger identifier (e.g. `applicationId`). */
const PLUGIN_RE = /\bid\s*\(?\s*["']([\w.-]+)["']\s*\)?\s*version\s+["']([\w.+-]+)["']/g;

/**
 * Parse a Gradle build script into normalized dependencies (best-effort).
 *
 * @param content - Raw `build.gradle` / `build.gradle.kts` content.
 * @param source - Manifest path for provenance (default `build.gradle.kts`).
 */
export function parseBuildGradle(
  content: string,
  source = "build.gradle.kts",
): ManifestParseResult {
  const dependencies: ResolvedDependency[] = [];

  for (const match of content.matchAll(COORDINATE_RE)) {
    const [, group, artifact, version] = match;
    dependencies.push({
      coordinate: `${group}:${artifact}`,
      version,
      ecosystem: "maven",
      source,
    });
  }

  for (const match of content.matchAll(PLUGIN_RE)) {
    const [, id, version] = match;
    dependencies.push({
      coordinate: id,
      version,
      ecosystem: "gradle-plugin",
      source,
    });
  }

  // De-duplicate identical triples within the same file (a coordinate may appear
  // under several configurations, e.g. implementation + testImplementation).
  const seen = new Set<string>();
  const deduped = dependencies.filter((d) => {
    const key = `${d.ecosystem} ${d.coordinate} ${d.version ?? ""}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });

  return { dependencies: deduped, warnings: [] };
}
