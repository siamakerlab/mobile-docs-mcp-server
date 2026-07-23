import { describe, expect, it } from "vitest";
import { parsePodfileLock } from "./podfileLock";

const LOCK = `PODS:
  - Alamofire (5.9.1)
  - SDWebImage (5.18.0):
    - SDWebImage/Core (= 5.18.0)
  - SDWebImage/Core (5.18.0)

DEPENDENCIES:
  - Alamofire (~> 5.9)

SPEC CHECKSUMS:
  Alamofire: abc123

COCOAPODS: 1.15.2
`;

describe("parsePodfileLock", () => {
  it("extracts top-level pods with exact versions", () => {
    const result = parsePodfileLock(LOCK);
    expect(result.dependencies).toContainEqual({
      coordinate: "Alamofire",
      version: "5.9.1",
      ecosystem: "cocoapods",
      source: "Podfile.lock",
    });
    expect(result.dependencies).toContainEqual({
      coordinate: "SDWebImage",
      version: "5.18.0",
      ecosystem: "cocoapods",
      source: "Podfile.lock",
    });
  });

  it("collapses subspecs into their top-level pod, deduplicated", () => {
    const names = parsePodfileLock(LOCK).dependencies.map((d) => d.coordinate);
    expect(names.filter((n) => n === "SDWebImage")).toHaveLength(1);
    expect(names).not.toContain("SDWebImage/Core");
  });

  it("returns empty for a lock with no PODS section", () => {
    expect(parsePodfileLock("DEPENDENCIES:\n  - X\n").dependencies).toHaveLength(0);
  });
});
