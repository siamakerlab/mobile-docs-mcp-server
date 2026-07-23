import { describe, expect, it } from "vitest";
import { projectVersionForLibrary } from "./projectVersion";
import type { ResolvedDependency } from "./types";

const dep = (over: Partial<ResolvedDependency>): ResolvedDependency => ({
  coordinate: "g:a",
  version: null,
  ecosystem: "maven",
  source: "test",
  ...over,
});

describe("projectVersionForLibrary", () => {
  it("matches an exact coordinate", () => {
    const deps = [dep({ coordinate: "provider", version: "6.1.1", ecosystem: "pub" })];
    expect(projectVersionForLibrary(deps, "provider")).toBe("6.1.1");
  });

  it("matches a Maven artifact name", () => {
    const deps = [dep({ coordinate: "com.squareup.okhttp3:okhttp", version: "4.12.0" })];
    expect(projectVersionForLibrary(deps, "okhttp")).toBe("4.12.0");
  });

  it("prefers an exact coordinate over an artifact-name match", () => {
    const deps = [
      dep({ coordinate: "com.foo:okhttp", version: "1.0.0" }),
      dep({ coordinate: "okhttp", version: "2.0.0", ecosystem: "pub" }),
    ];
    expect(projectVersionForLibrary(deps, "okhttp")).toBe("2.0.0");
  });

  it("ignores constraint/dynamic versions", () => {
    const deps = [dep({ coordinate: "http", version: "^1.1.0", ecosystem: "pub" })];
    expect(projectVersionForLibrary(deps, "http")).toBeNull();
  });

  it("returns null when there is no match", () => {
    expect(projectVersionForLibrary([], "okhttp")).toBeNull();
    expect(
      projectVersionForLibrary([dep({ coordinate: "g:a", version: "1.0.0" })], "b"),
    ).toBeNull();
  });

  it("matches an SPM repo name (search term ~ owner/repo)", () => {
    const deps = [
      dep({
        coordinate: "apple/swift-argument-parser",
        version: "1.3.0",
        ecosystem: "spm",
      }),
    ];
    expect(projectVersionForLibrary(deps, "swift-argument-parser")).toBe("1.3.0");
  });

  it("matches a Carthage repo name", () => {
    const deps = [
      dep({ coordinate: "Alamofire/Alamofire", version: "5.9.1", ecosystem: "carthage" }),
    ];
    expect(projectVersionForLibrary(deps, "Alamofire")).toBe("5.9.1");
  });
});
