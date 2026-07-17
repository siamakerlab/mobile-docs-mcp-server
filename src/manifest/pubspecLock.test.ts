import { describe, expect, it } from "vitest";
import { parsePubspecLock } from "./pubspecLock";

describe("parsePubspecLock", () => {
  it("extracts exact resolved versions for hosted packages", () => {
    const lock = `
packages:
  http:
    dependency: "direct main"
    source: hosted
    version: "1.1.0"
  provider:
    dependency: "direct main"
    source: hosted
    version: "6.1.1"
`;
    const { dependencies, warnings } = parsePubspecLock(lock);
    const byCoord = Object.fromEntries(dependencies.map((d) => [d.coordinate, d]));

    expect(byCoord.http).toMatchObject({ version: "1.1.0", ecosystem: "pub" });
    expect(byCoord.provider.version).toBe("6.1.1");
    expect(warnings).toEqual([]);
  });

  it("reports non-hosted (sdk/git/path) packages with null version and a warning", () => {
    const lock = `
packages:
  flutter:
    dependency: "direct main"
    source: sdk
    version: "0.0.0"
  local_pkg:
    dependency: "direct main"
    source: path
    version: "0.1.0"
`;
    const { dependencies, warnings } = parsePubspecLock(lock);
    const byCoord = Object.fromEntries(dependencies.map((d) => [d.coordinate, d]));

    expect(byCoord.flutter.version).toBeNull();
    expect(byCoord.local_pkg.version).toBeNull();
    expect(warnings.some((w) => w.includes('source is "sdk"'))).toBe(true);
    expect(warnings.some((w) => w.includes('source is "path"'))).toBe(true);
  });

  it("returns empty for a lockfile without packages", () => {
    const { dependencies, warnings } = parsePubspecLock("sdks:\n  dart: '>=3.0.0'\n");
    expect(dependencies).toEqual([]);
    expect(warnings).toEqual([]);
  });

  it("returns a warning (not a throw) on malformed YAML", () => {
    const { dependencies, warnings } = parsePubspecLock("packages:\n  - : : :\n bad");
    expect(Array.isArray(dependencies)).toBe(true);
    expect(Array.isArray(warnings)).toBe(true);
  });
});
