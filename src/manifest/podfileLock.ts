/**
 * Parser for CocoaPods `Podfile.lock` files. The lock file is valid YAML and its
 * `PODS:` section lists every installed pod with its exact resolved version — the
 * reliable source of pinned versions (the `Podfile` itself is Ruby DSL with loose
 * constraints).
 *
 * Each `PODS` entry is either a bare string (`"Alamofire (5.9.1)"`) or a mapping
 * whose key is the pod and whose value lists its sub-dependencies
 * (`{ "SDWebImage (5.18.0)": ["SDWebImage/Core (= 5.18.0)"] }`). Subspecs
 * (`Pod/Subspec`) collapse to their top-level pod, deduplicated.
 *
 * Note: CocoaPods docs are not hosted (CocoaDocs was sunset), so these coordinates
 * carry versions for resolution but have no registry doc URL of their own.
 */

import { parse as parseYaml } from "yaml";
import { asRecord, type ManifestParseResult, type ResolvedDependency } from "./types";

/**
 * Parse a `Podfile.lock` into normalized CocoaPods dependencies with exact versions.
 *
 * @param content - Raw `Podfile.lock` content.
 * @param source - Manifest path for provenance/warnings (default `Podfile.lock`).
 */
export function parsePodfileLock(
  content: string,
  source = "Podfile.lock",
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

  const pods = doc.PODS;
  if (!Array.isArray(pods)) {
    return { dependencies: [], warnings: [] };
  }

  const seen = new Set<string>();
  const addPod = (entry: string): void => {
    // "Alamofire (5.9.1)" | "SDWebImage/Core (5.18.0)"
    const match = entry.match(/^(.+?)\s+\(([^)]+)\)\s*$/);
    if (!match) {
      return;
    }
    const podName = match[1].trim().split("/")[0]; // top-level pod (strip subspec)
    const version = match[2].trim();
    if (seen.has(podName)) {
      return;
    }
    seen.add(podName);
    dependencies.push({ coordinate: podName, version, ecosystem: "cocoapods", source });
  };

  for (const item of pods) {
    if (typeof item === "string") {
      addPod(item);
    } else {
      const obj = asRecord(item);
      if (obj) {
        // { "Pod (ver)": [subdeps…] } — the key is the installed pod.
        for (const key of Object.keys(obj)) {
          addPod(key);
        }
      }
    }
  }

  return { dependencies, warnings };
}
