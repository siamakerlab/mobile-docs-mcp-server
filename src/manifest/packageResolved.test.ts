import { describe, expect, it } from "vitest";
import { parsePackageResolved } from "./packageResolved";

describe("parsePackageResolved", () => {
  it("parses v3 pins (identity/location/state.version + originHash)", () => {
    const json = JSON.stringify({
      pins: [
        {
          identity: "swift-composable-architecture",
          kind: "remoteSourceControl",
          location: "https://github.com/pointfreeco/swift-composable-architecture.git",
          state: { revision: "abc123", version: "1.15.0" },
        },
      ],
      version: 3,
      originHash: "deadbeef",
    });
    const result = parsePackageResolved(json);
    expect(result.dependencies).toEqual([
      {
        coordinate: "pointfreeco/swift-composable-architecture",
        version: "1.15.0",
        ecosystem: "spm",
        source: "Package.resolved",
      },
    ]);
    expect(result.warnings).toHaveLength(0);
  });

  it("parses v1 pins (object.pins, package/repositoryURL/state.version)", () => {
    const json = JSON.stringify({
      object: {
        pins: [
          {
            package: "Alamofire",
            repositoryURL: "https://github.com/Alamofire/Alamofire.git",
            state: { version: "5.9.1" },
          },
        ],
      },
      version: 1,
    });
    const result = parsePackageResolved(json);
    expect(result.dependencies).toEqual([
      {
        coordinate: "Alamofire/Alamofire",
        version: "5.9.1",
        ecosystem: "spm",
        source: "Package.resolved",
      },
    ]);
  });

  it("reports a branch/revision pin with a null version and a warning", () => {
    const json = JSON.stringify({
      pins: [
        {
          identity: "x",
          location: "https://github.com/o/x.git",
          state: { revision: "deadbeef", branch: "main" },
        },
      ],
      version: 2,
    });
    const result = parsePackageResolved(json);
    expect(result.dependencies[0]).toMatchObject({
      coordinate: "o/x",
      version: null,
      ecosystem: "spm",
    });
    expect(result.warnings.some((w) => w.includes("branch/revision"))).toBe(true);
  });

  it("returns a warning for invalid JSON", () => {
    const result = parsePackageResolved("{ not json");
    expect(result.dependencies).toHaveLength(0);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it("returns empty for a resolved file with no pins", () => {
    expect(
      parsePackageResolved(JSON.stringify({ version: 2, pins: [] })).dependencies,
    ).toHaveLength(0);
  });
});
