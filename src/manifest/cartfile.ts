/**
 * Best-effort parser for Carthage `Cartfile` manifests. Loose form:
 * `github "owner/repo" ~> 5.9` (or `== 5.9.1` for an exact pin, or no version for
 * "latest"). Prefer `Cartfile.resolved` for exact versions; this is the fallback.
 */

import { gitUrlToCoordinate } from "./gitCoordinate";
import type { ManifestParseResult, ResolvedDependency } from "./types";

/**
 * Parse a `Cartfile` into best-effort Carthage dependencies (exact pins only;
 * range operators reported as unresolved).
 *
 * @param content - Raw `Cartfile` content.
 * @param source - Manifest path for provenance/warnings (default `Cartfile`).
 */
export function parseCartfile(content: string, source = "Cartfile"): ManifestParseResult {
  const dependencies: ResolvedDependency[] = [];
  const warnings: string[] = [];

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    // origin "identifier" [operator] [version]
    const match = line.match(
      /^(github|git|binary)\s+"([^"]+)"(?:\s+(==|~>|>=)?\s*"?([0-9][^\s"]*)"?)?/,
    );
    if (!match) {
      warnings.push(`${source}: unparsable line: ${line}`);
      continue;
    }

    const origin = match[1];
    const identifier = match[2];
    const operator = match[3];
    const rawVersion = match[4];

    let coordinate: string;
    if (origin === "github" && !identifier.includes("://")) {
      coordinate = identifier;
    } else {
      coordinate = gitUrlToCoordinate(identifier) ?? identifier;
    }

    // Exact pin only when a version is present with no range operator.
    const version = rawVersion && !operator ? rawVersion : null;
    if (rawVersion && operator) {
      warnings.push(
        `${source}: "${coordinate}" constrained with "${operator} ${rawVersion}" (no exact pin)`,
      );
    }

    dependencies.push({ coordinate, version, ecosystem: "carthage", source });
  }

  return { dependencies, warnings };
}
