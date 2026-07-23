/**
 * Parser for Swift Package Manager `Package.resolved` files — the SPM lock file
 * that records the exact resolved version of every dependency (ideal for versioned
 * doc URLs). `Package.swift` itself is executable Swift DSL carrying only version
 * *ranges*, so the lock file is the reliable source of pinned versions.
 *
 * Handles all three on-disk schema versions:
 * - **v1** (Xcode 11–13): `{ object: { pins: [{ package, repositoryURL, state:{version} }] }, version: 1 }`
 * - **v2** (SwiftPM 5.6+): `{ pins: [{ identity, location, kind, state:{version} }], version: 2 }`
 * - **v3** (Xcode 15.3+): v2 plus a root `originHash`, `version: 3`
 *
 * A dependency pinned to a branch/revision (no released version) is reported with a
 * note and a `null` version. The same `Package.resolved` schema is used both at a
 * project root and embedded in an Xcode project at
 * `*.xcodeproj/project.xcworkspace/xcshareddata/swiftpm/Package.resolved`.
 */

import { gitUrlToCoordinate } from "./gitCoordinate";
import {
  asRecord,
  asString,
  type ManifestParseResult,
  type ResolvedDependency,
} from "./types";

/**
 * Parse a `Package.resolved` into normalized SPM dependencies with exact versions.
 *
 * @param content - Raw `Package.resolved` (JSON) content.
 * @param source - Manifest path for provenance/warnings (default `Package.resolved`).
 */
export function parsePackageResolved(
  content: string,
  source = "Package.resolved",
): ManifestParseResult {
  const dependencies: ResolvedDependency[] = [];
  const warnings: string[] = [];

  let doc: unknown;
  try {
    doc = JSON.parse(content);
  } catch (error) {
    return {
      dependencies: [],
      warnings: [`${source}: failed to parse JSON: ${(error as Error).message}`],
    };
  }

  const root = asRecord(doc);
  if (!root) {
    return {
      dependencies: [],
      warnings: [`${source}: empty or invalid Package.resolved`],
    };
  }

  // v1 nests pins under `object`; v2/v3 put them at the root.
  const v1 = asRecord(root.object);
  let rawPins: unknown[] | null = null;
  if (v1 && Array.isArray(v1.pins)) {
    rawPins = v1.pins;
  } else if (Array.isArray(root.pins)) {
    rawPins = root.pins;
  }
  if (!rawPins) {
    return { dependencies: [], warnings: [`${source}: no pins found`] };
  }

  for (const pin of rawPins) {
    const p = asRecord(pin);
    if (!p) {
      continue;
    }

    // v2/v3 use `location` + `identity`; v1 uses `repositoryURL` + `package`.
    const gitUrl = asString(p.location) ?? asString(p.repositoryURL);
    const identity = asString(p.identity) ?? asString(p.package);
    const state = asRecord(p.state);
    const version = state ? (asString(state.version) ?? null) : null;

    let coordinate: string | null = null;
    if (gitUrl) {
      coordinate = gitUrlToCoordinate(gitUrl) ?? gitUrl;
    } else if (identity) {
      coordinate = identity;
    }
    if (!coordinate) {
      warnings.push(`${source}: skipped a pin with no resolvable identity`);
      continue;
    }

    if (version === null) {
      warnings.push(
        `${source}: "${coordinate}" is pinned to a branch/revision (no released version)`,
      );
    }

    dependencies.push({ coordinate, version, ecosystem: "spm", source });
  }

  return { dependencies, warnings };
}
