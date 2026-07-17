/**
 * Parser for Flutter/Dart `pubspec.lock` files.
 *
 * Unlike `pubspec.yaml` (which records version *constraints* like `^1.1.0`), the
 * lockfile records the exact resolved version of every package, which is ideal for
 * building versioned documentation URLs. Non-hosted packages (sdk/git/path) have no
 * pub version and are reported with a note.
 */

import { parse as parseYaml } from "yaml";
import {
  asRecord,
  asString,
  type ManifestParseResult,
  type ResolvedDependency,
} from "./types";

/**
 * Parse a `pubspec.lock` into normalized pub dependencies with exact versions.
 *
 * @param content - Raw `pubspec.lock` content.
 * @param source - Manifest path for provenance/warnings (default `pubspec.lock`).
 */
export function parsePubspecLock(
  content: string,
  source = "pubspec.lock",
): ManifestParseResult {
  const dependencies: ResolvedDependency[] = [];
  const warnings: string[] = [];

  let doc: Record<string, unknown> | undefined;
  try {
    doc = asRecord(parseYaml(content));
  } catch (error) {
    return {
      dependencies: [],
      warnings: [`${source}: failed to parse YAML: ${(error as Error).message}`],
    };
  }
  if (!doc) {
    return { dependencies: [], warnings: [`${source}: empty or invalid lockfile`] };
  }

  const packages = asRecord(doc.packages);
  if (!packages) {
    return { dependencies: [], warnings: [] };
  }

  for (const [name, spec] of Object.entries(packages)) {
    const obj = asRecord(spec);
    if (!obj) {
      continue;
    }

    const pkgSource = asString(obj.source);
    const version = asString(obj.version) ?? null;

    if (pkgSource !== undefined && pkgSource !== "hosted") {
      // sdk / git / path — no pub.dev version page.
      warnings.push(`${source}: "${name}" source is "${pkgSource}" (not pub-hosted)`);
      dependencies.push({ coordinate: name, version: null, ecosystem: "pub", source });
    } else {
      dependencies.push({ coordinate: name, version, ecosystem: "pub", source });
    }
  }

  return { dependencies, warnings };
}
