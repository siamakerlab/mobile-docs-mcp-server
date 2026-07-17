/**
 * Resolve-project-deps command - Discovers and parses a project's dependency
 * manifests (Gradle version catalog, Flutter pubspec) and prints the resolved
 * coordinate→version set.
 */

import path from "node:path";
import type { Argv } from "yargs";
import { TelemetryEvent, telemetry } from "../../telemetry";
import { ResolveProjectDepsTool } from "../../tools";
import { renderStructuredOutput } from "../output";

export function createResolveProjectDepsCommand(cli: Argv) {
  cli.command(
    "resolve-project-deps [path]",
    "Resolve dependencies declared in a project's build manifests (Gradle version catalog, pubspec.yaml)",
    (yargs) => {
      return yargs.positional("path", {
        type: "string",
        description: "Path to the project root to scan",
        default: ".",
      });
    },
    async (argv) => {
      await telemetry.track(TelemetryEvent.CLI_COMMAND, {
        command: "resolve-project-deps",
      });

      const projectPath = path.resolve((argv.path as string) ?? ".");
      const tool = new ResolveProjectDepsTool();
      const result = await tool.execute({ path: projectPath });

      renderStructuredOutput(result, argv);
    },
  );
}
