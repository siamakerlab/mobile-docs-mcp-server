import type { ProgressCallback } from "../../types";
import type { AppConfig } from "../../utils/config";
import type { ScraperOptions, ScraperProgressEvent, ScraperStrategy } from "../types";
import { WebScraperStrategy } from "./WebScraperStrategy";

/**
 * Scraper strategy for the Gradle Plugin Portal (plugins.gradle.org), which hosts
 * plugin pages keyed by id (e.g. `/plugin/com.android.application`) with usage
 * snippets, versions, and dependency coordinates for the Gradle/Android build ecosystem.
 *
 * Like the npm and PyPI strategies, this is a thin, registry-tuned profile over
 * {@link WebScraperStrategy}: query strings and hash anchors carry no content on
 * plugin pages, so both are normalized away to avoid indexing the same page twice.
 */
export class GradlePluginScraperStrategy implements ScraperStrategy {
  private defaultStrategy: WebScraperStrategy;

  canHandle(url: string): boolean {
    const { hostname } = new URL(url);
    return ["plugins.gradle.org", "www.plugins.gradle.org"].includes(hostname);
  }

  constructor(config: AppConfig) {
    this.defaultStrategy = new WebScraperStrategy(config, {
      urlNormalizerOptions: {
        ignoreCase: true,
        removeHash: true,
        removeTrailingSlash: true,
        removeQuery: true, // plugin portal pages don't need query params
      },
    });
  }

  async scrape(
    options: ScraperOptions,
    progressCallback: ProgressCallback<ScraperProgressEvent>,
    signal?: AbortSignal,
  ): Promise<void> {
    await this.defaultStrategy.scrape(options, progressCallback, signal);
  }

  /**
   * Cleanup resources used by this strategy.
   */
  async cleanup(): Promise<void> {
    await this.defaultStrategy.cleanup();
  }
}
