import {
  documentationUrl,
  type ResolvedDependency,
  resolveProjectManifests,
} from "../manifest";
import { ValidationError } from "./errors";

export interface ResolveProjectDepsToolOptions {
  /** Path to the project root to scan for dependency manifests. */
  path: string;
}

/** A resolved dependency plus its registry documentation URL. */
export interface ResolvedProjectDependency extends ResolvedDependency {
  /**
   * Documentation URL for the dependency's registry (javadoc.io / pub.dev /
   * plugins.gradle.org), suitable for passing to `scrape`, or `null` if the
   * coordinate cannot be mapped.
   */
  docUrl: string | null;
}

export interface ResolveProjectDepsToolResult {
  /** The de-duplicated dependencies declared across the project's manifests. */
  dependencies: ResolvedProjectDependency[];
  /** Non-fatal notes (unresolved refs, SDK/git/path deps, unreadable files). */
  warnings: string[];
}

/**
 * Tool that resolves the dependencies a project declares by discovering and
 * parsing its build manifests (Gradle version catalogs, Flutter `pubspec.yaml`).
 *
 * Interface-agnostic and store-free: it only reads the filesystem, so CLI, MCP,
 * and Web can all surface the same project-aware version resolution. The resulting
 * coordinate→version list feeds version-specific documentation scraping/search.
 */
export class ResolveProjectDepsTool {
  /**
   * @throws {ValidationError} If the path is missing or not a non-empty string.
   */
  async execute(
    options: ResolveProjectDepsToolOptions,
  ): Promise<ResolveProjectDepsToolResult> {
    const { path: projectPath } = options;

    if (!projectPath || typeof projectPath !== "string" || projectPath.trim() === "") {
      throw new ValidationError(
        "Project path is required and must be a non-empty string.",
        this.constructor.name,
      );
    }

    const { dependencies, warnings } = await resolveProjectManifests(projectPath);
    return {
      dependencies: dependencies.map((d) => ({ ...d, docUrl: documentationUrl(d) })),
      warnings,
    };
  }
}
