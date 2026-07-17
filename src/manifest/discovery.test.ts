import fsPromises from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resolveProjectManifests } from "./discovery";

describe("resolveProjectManifests", () => {
  let root: string;

  beforeEach(async () => {
    root = await fsPromises.mkdtemp(path.join(os.tmpdir(), "manifest-discovery-"));
  });

  afterEach(async () => {
    await fsPromises.rm(root, { recursive: true, force: true });
  });

  it("discovers and parses a gradle catalog + pubspec across the tree", async () => {
    await fsPromises.mkdir(path.join(root, "gradle"), { recursive: true });
    await fsPromises.writeFile(
      path.join(root, "gradle", "libs.versions.toml"),
      `[versions]
coreKtx = "1.12.0"
[libraries]
core = { group = "androidx.core", name = "core-ktx", version.ref = "coreKtx" }
[plugins]
agp = { id = "com.android.application", version = "8.2.0" }
`,
    );
    await fsPromises.mkdir(path.join(root, "app"), { recursive: true });
    await fsPromises.writeFile(
      path.join(root, "app", "pubspec.yaml"),
      "dependencies:\n  http: ^1.1.0\n",
    );

    const { dependencies, warnings } = await resolveProjectManifests(root);
    const coords = dependencies.map((d) => d.coordinate);

    expect(coords).toContain("androidx.core:core-ktx");
    expect(coords).toContain("com.android.application");
    expect(coords).toContain("http");
    expect(warnings).toEqual([]);

    const core = dependencies.find((d) => d.coordinate === "androidx.core:core-ktx");
    expect(core?.version).toBe("1.12.0");
    expect(core?.ecosystem).toBe("maven");
    expect(core?.source).toBe(path.join("gradle", "libs.versions.toml"));
  });

  it("skips ignored directories (node_modules, build, dot-dirs)", async () => {
    for (const dir of ["node_modules", "build", ".gradle"]) {
      await fsPromises.mkdir(path.join(root, dir), { recursive: true });
      await fsPromises.writeFile(
        path.join(root, dir, "pubspec.yaml"),
        "dependencies:\n  should_not_appear: ^1.0.0\n",
      );
    }

    const { dependencies } = await resolveProjectManifests(root);
    expect(dependencies.map((d) => d.coordinate)).not.toContain("should_not_appear");
  });

  it("de-duplicates identical coordinates across modules", async () => {
    for (const mod of ["moduleA", "moduleB"]) {
      await fsPromises.mkdir(path.join(root, mod), { recursive: true });
      await fsPromises.writeFile(
        path.join(root, mod, "pubspec.yaml"),
        "dependencies:\n  http: ^1.1.0\n",
      );
    }

    const { dependencies } = await resolveProjectManifests(root);
    expect(dependencies.filter((d) => d.coordinate === "http")).toHaveLength(1);
  });

  it("returns an empty result (no throw) for an empty directory", async () => {
    const { dependencies, warnings } = await resolveProjectManifests(root);
    expect(dependencies).toEqual([]);
    expect(warnings).toEqual([]);
  });
});
