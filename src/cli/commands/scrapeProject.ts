/**
 * Scrape-project command - Resolves a project's declared dependencies and indexes
 * each one's documentation (one scrape job per dependency).
 */

import path from "node:path";
import type { Argv } from "yargs";
import { PipelineFactory, type PipelineOptions } from "../../pipeline";
import type { IPipeline } from "../../pipeline/trpc/interfaces";
import { createDocumentManagement } from "../../store";
import type { IDocumentManagement } from "../../store/trpc/interfaces";
import { TelemetryEvent, telemetry } from "../../telemetry";
import { ScrapeProjectTool } from "../../tools";
import { loadConfig } from "../../utils/config";
import { logger } from "../../utils/logger";
import { renderStructuredOutput } from "../output";
import { type CliContext, getEventBus } from "../utils";

export function createScrapeProjectCommand(cli: Argv) {
  cli.command(
    "scrape-project [path]",
    "Resolve a project's dependencies and index each one's documentation (one scrape job per dependency)",
    (yargs) => {
      return yargs
        .version(false)
        .positional("path", {
          type: "string",
          description: "Path to the project root to scan",
          default: ".",
        })
        .option("server-url", {
          type: "string",
          description:
            "URL of external pipeline worker RPC (e.g., http://localhost:8080/api)",
          alias: "serverUrl",
        });
    },
    async (argv) => {
      await telemetry.track(TelemetryEvent.CLI_COMMAND, {
        command: "scrape-project",
      });

      const projectPath = path.resolve((argv.path as string) ?? ".");
      const serverUrl = argv.serverUrl as string | undefined;

      const appConfig = loadConfig(argv, {
        configPath: argv.config as string,
        searchDir: argv.storePath as string, // resolved globally
      });

      const eventBus = getEventBus(argv as CliContext);
      const docService: IDocumentManagement = await createDocumentManagement({
        serverUrl,
        eventBus,
        appConfig,
      });
      let pipeline: IPipeline | null = null;

      try {
        const pipelineOptions: PipelineOptions = {
          recoverJobs: false,
          serverUrl,
          appConfig,
        };
        pipeline = serverUrl
          ? await PipelineFactory.createPipeline(undefined, eventBus, {
              serverUrl,
              ...pipelineOptions,
            })
          : await PipelineFactory.createPipeline(
              docService as unknown as never,
              eventBus,
              pipelineOptions,
            );
        await pipeline.start();

        const tool = new ScrapeProjectTool(pipeline, appConfig.scraper);
        const result = await tool.execute({ path: projectPath });

        logger.info(
          `⏳ Enqueued ${result.jobs.length} scrape job(s)${result.skipped.length ? `, skipped ${result.skipped.length}` : ""}; waiting for completion...`,
        );

        // The CLI process must stay alive until the enqueued jobs finish, otherwise
        // stopping the pipeline below would cancel them.
        for (const job of result.jobs) {
          try {
            await pipeline.waitForJobCompletion(job.jobId);
          } catch (error) {
            logger.warn(
              `⚠️  Scrape job for ${job.coordinate} failed: ${error instanceof Error ? error.message : String(error)}`,
            );
          }
        }

        renderStructuredOutput(result, argv);
      } finally {
        if (pipeline) await pipeline.stop();
        await docService.shutdown();
      }
    },
  );
}
