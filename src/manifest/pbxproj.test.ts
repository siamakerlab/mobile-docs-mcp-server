import { describe, expect, it } from "vitest";
import { parsePbxproj } from "./pbxproj";

const PBXPROJ = `// !$*UTF8*$!
{
	objects = {
		A1 /* XCRemoteSwiftPackageReference "swift-composable-architecture" */ = {
			isa = XCRemoteSwiftPackageReference;
			repositoryURL = "https://github.com/pointfreeco/swift-composable-architecture";
			requirement = {
				kind = exactVersion;
				version = 1.15.0;
			};
		};
		A2 /* XCRemoteSwiftPackageReference "swift-argument-parser" */ = {
			isa = XCRemoteSwiftPackageReference;
			repositoryURL = "https://github.com/apple/swift-argument-parser.git";
			requirement = {
				kind = upToNextMajorVersion;
				minimumVersion = 1.0.0;
			};
		};
	};
}
`;

describe("parsePbxproj", () => {
  it("extracts an exactVersion requirement as a pinned SPM dependency", () => {
    const result = parsePbxproj(PBXPROJ);
    expect(result.dependencies).toContainEqual({
      coordinate: "pointfreeco/swift-composable-architecture",
      version: "1.15.0",
      ecosystem: "spm",
      source: "project.pbxproj",
    });
  });

  it("reports non-exact requirements as unresolved with a warning", () => {
    const result = parsePbxproj(PBXPROJ);
    expect(result.dependencies).toContainEqual({
      coordinate: "apple/swift-argument-parser",
      version: null,
      ecosystem: "spm",
      source: "project.pbxproj",
    });
    expect(result.warnings.some((w) => w.includes("no exact pin"))).toBe(true);
  });

  it("returns empty when there are no remote package references", () => {
    expect(parsePbxproj("{ objects = {}; }").dependencies).toHaveLength(0);
  });
});
