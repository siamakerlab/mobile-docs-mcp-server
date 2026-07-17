import fsPromises from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ValidationError } from "./errors";
import { ResolveProjectDepsTool } from "./ResolveProjectDepsTool";

describe("ResolveProjectDepsTool", () => {
  const tool = new ResolveProjectDepsTool();

  it("throws ValidationError for an empty path", async () => {
    await expect(tool.execute({ path: "" })).rejects.toThrow(ValidationError);
    await expect(tool.execute({ path: "   " })).rejects.toThrow(ValidationError);
  });

  it("resolves dependencies from a project directory", async () => {
    const root = await fsPromises.mkdtemp(path.join(os.tmpdir(), "rpd-tool-"));
    try {
      await fsPromises.writeFile(
        path.join(root, "pubspec.yaml"),
        "dependencies:\n  provider: 6.1.1\n",
      );
      const result = await tool.execute({ path: root });
      const provider = result.dependencies.find((d) => d.coordinate === "provider");
      expect(provider).toMatchObject({ version: "6.1.1", ecosystem: "pub" });
    } finally {
      await fsPromises.rm(root, { recursive: true, force: true });
    }
  });
});
