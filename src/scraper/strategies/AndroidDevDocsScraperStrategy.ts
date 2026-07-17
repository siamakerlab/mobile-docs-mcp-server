import type { ProgressCallback } from "../../types";
import type { AppConfig } from "../../utils/config";
import type { ScraperOptions, ScraperProgressEvent, ScraperStrategy } from "../types";
import { WebScraperStrategy } from "./WebScraperStrategy";

/**
 * Scraper strategy for developer.android.com — the official documentation host for
 * the Android SDK, Jetpack/AndroidX, and framework guides/reference. This is where
 * AndroidX artifacts (published to Google Maven, which has no per-artifact hosted doc
 * page of its own) are actually documented.
 *
 * Like the npm/PyPI strategies, this is a thin, host-tuned profile over
 * {@link WebScraperStrategy}: it normalizes away query strings (e.g. `?hl=en`) and
 * hash anchors so the same reference page is not indexed multiple times.
 */
export class AndroidDevDocsScraperStrategy implements ScraperStrategy {
  private defaultStrategy: WebScraperStrategy;

  canHandle(url: string): boolean {
    const { hostname } = new URL(url);
    return hostname === "developer.android.com";
  }

  constructor(config: AppConfig) {
    this.defaultStrategy = new WebScraperStrategy(config, {
      urlNormalizerOptions: {
        ignoreCase: true,
        removeHash: true,
        removeTrailingSlash: true,
        removeQuery: true, // strips ?hl=<lang> and tracking params
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
