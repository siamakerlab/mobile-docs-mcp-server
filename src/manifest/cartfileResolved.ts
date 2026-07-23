/**
 * Parser for Carthage `Cartfile.resolved` files — the simplest lock format of the
 * three iOS package managers: one entry per line, `origin "identifier" "version"`.
 * The resolved file always pins an exact version (or a commit/tag), unlike the
 * loose `Cartfile`.
 *
 * Origins:
 * - `github "owner/repo" "1.2.3"` → coordinate `owner/repo`
 * - `git "https://host/owner/repo.git" "1.2.3"` → coordinate `owner/repo`
 * - `binary "https://…/spec.json" "1.2.3"` → coordinate from the URL, best-effort
 */

import { gitUrlToCoordinate } from "./gitCoordinate";
import type { ManifestParseResult, ResolvedDependency } from "./types";

/**
 * Parse a `Cartfile.resolved` into normalized Carthage dependencies with exact versions.
 *
 * @param content - Raw `Cartfile.resolved` content.
 * @param source - Manifest path for provenance/warnings (default `Cartfile.resolved`).
 */
export function parseCartfileResolved(
  content: string,
  source = "Cartfile.resolved",
): ManifestParseResult {
  const dependencies: ResolvedDependency[] = [];
  const warnings: string[] = [];

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const match = line.match(/^(github|git|binary)\s+"([^"]+)"\s+"([^"]+)"/);
    if (!match) {
      warnings.push(`${source}: unparsable line: ${line}`);
      continue;
    }

    const origin = match[1];
    const identifier = match[2];
    const version = match[3];

    let coordinate: string;
    if (origin === "github" && !identifier.includes("://")) {
      // Already an owner/repo slug (possibly with an enterprise host prefix path).
      coordinate = identifier;
    } else {
      coordinate = gitUrlToCoordinate(identifier) ?? identifier;
    }

    dependencies.push({ coordinate, version, ecosystem: "carthage", source });
  }

  return { dependencies, warnings };
}
