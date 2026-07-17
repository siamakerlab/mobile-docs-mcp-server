import { documentationUrl, pinnedVersion, resolveProjectManifests } from "../manifest";
import type { IPipeline } from "../pipeline/trpc/interfaces";
import type { AppConfig } from "../utils/config";
import { ValidationError } from "./errors";
import { ScrapeTool } from "./ScrapeTool";

export interface ScrapeProjectToolOptions {
  /** Path to the project root to scan for dependency manifests. */
  path: string;
}

export interface ScrapeProjectJob {
  coordinate: string;
  version: string | null;
  url: string;
  jobId: string;
}

export interface ScrapeProjectSkip {
  coordinate: string;
  reason: string;
}

export interface ScrapeProjectToolResult {
  /** One enqueued scrape job per dependency that mapped to a documentation URL. */
  jobs: ScrapeProjectJob[];
  /** Dependencies that were not scraped, with the reason. */
  skipped: ScrapeProjectSkip[];
  /** Non-fatal notes from manifest parsing. */
  warnings: string[];
}

/**
 * Tool that indexes a whole project's dependency documentation in one shot: it
 * resolves the project's declared coordinates, maps each to its registry doc URL
 * ({@link documentationUrl}), and enqueues a scrape job per dependency.
 *
 * Jobs are enqueued without waiting (`waitForCompletion: false`); callers monitor
 * progress via the normal job tools. Dependencies without a mappable doc URL, or
 * whose version ScrapeTool rejects, are reported in `skipped` rather than failing
 * the whole run. Only concrete pinned versions are passed through; constraint or
 * dynamic versions are indexed unversioned.
 */
export class ScrapeProjectTool {
  private readonly scrapeTool: ScrapeTool;

  constructor(pipeline: IPipeline, config: AppConfig["scraper"]) {
    this.scrapeTool = new ScrapeTool(pipeline, config);
  }

  async execute(options: ScrapeProjectToolOptions): Promise<ScrapeProjectToolResult> {
    const { path: projectPath } = options;

    if (!projectPath || typeof projectPath !== "string" || projectPath.trim() === "") {
      throw new ValidationError(
        "Project path is required and must be a non-empty string.",
        this.constructor.name,
      );
    }

    const { dependencies, warnings } = await resolveProjectManifests(projectPath);
    const jobs: ScrapeProjectJob[] = [];
    const skipped: ScrapeProjectSkip[] = [];

    for (const dep of dependencies) {
      const url = documentationUrl(dep);
      if (!url) {
        skipped.push({
          coordinate: dep.coordinate,
          reason: "no documentation URL for this coordinate",
        });
        continue;
      }

      const version = pinnedVersion(dep.version);
      try {
        const result = await this.scrapeTool.execute({
          library: dep.coordinate,
          version,
          url,
          waitForCompletion: false,
        });
        if ("jobId" in result) {
          jobs.push({ coordinate: dep.coordinate, version, url, jobId: result.jobId });
        }
      } catch (error) {
        // ScrapeTool only accepts semver-shaped versions; some pinned-but-non-semver
        // versions (e.g. Guava's `31.1-jre`, Spring's `1.0.0.RELEASE`) are rejected even
        // though documentationUrl built a valid versioned URL. Retry unversioned so the
        // dependency is still indexed at that URL rather than dropped entirely.
        if (version !== null) {
          try {
            const retry = await this.scrapeTool.execute({
              library: dep.coordinate,
              version: null,
              url,
              waitForCompletion: false,
            });
            if ("jobId" in retry) {
              jobs.push({
                coordinate: dep.coordinate,
                version: null,
                url,
                jobId: retry.jobId,
              });
            }
            continue;
          } catch {
            // fall through to skipped below
          }
        }
        skipped.push({
          coordinate: dep.coordinate,
          reason: error instanceof Error ? error.message : "failed to enqueue scrape job",
        });
      }
    }

    return { jobs, skipped, warnings };
  }
}
