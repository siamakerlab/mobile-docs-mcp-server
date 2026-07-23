import { describe, expect, it } from "vitest";
import { parsePackageSwift } from "./packageSwift";

const MANIFEST = `// swift-tools-version:5.9
import PackageDescription

let package = Package(
  name: "MyApp",
  dependencies: [
    .package(url: "https://github.com/pointfreeco/swift-composable-architecture", exact: "1.15.0"),
    .package(url: "https://github.com/apple/swift-argument-parser.git", from: "1.0.0"),
    .package(url: "https://github.com/vapor/vapor.git", .upToNextMajor(from: "4.0.0")),
  ]
)
`;

describe("parsePackageSwift", () => {
  it("extracts an exact pin and reduces the URL to owner/repo", () => {
    const result = parsePackageSwift(MANIFEST);
    expect(result.dependencies).toContainEqual({
      coordinate: "pointfreeco/swift-composable-architecture",
      version: "1.15.0",
      ecosystem: "spm",
      source: "Package.swift",
    });
  });

  it("reports range/from requirements as unresolved (null version) with a warning", () => {
    const result = parsePackageSwift(MANIFEST);
    expect(result.dependencies).toContainEqual({
      coordinate: "apple/swift-argument-parser",
      version: null,
      ecosystem: "spm",
      source: "Package.swift",
    });
    expect(result.dependencies).toContainEqual({
      coordinate: "vapor/vapor",
      version: null,
      ecosystem: "spm",
      source: "Package.swift",
    });
    expect(result.warnings.some((w) => w.includes("no exact pin"))).toBe(true);
  });

  it("returns empty for a manifest with no url-based packages", () => {
    expect(
      parsePackageSwift('let package = Package(name: "X", dependencies: [])')
        .dependencies,
    ).toHaveLength(0);
  });
});
