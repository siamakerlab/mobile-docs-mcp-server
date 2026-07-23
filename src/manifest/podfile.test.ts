import { describe, expect, it } from "vitest";
import { parsePodfile } from "./podfile";

const PODFILE = `platform :ios, '15.0'

target 'MyApp' do
  use_frameworks!
  pod 'Alamofire', '5.9.1'
  pod 'SDWebImage', '~> 5.18'
  pod 'SnapKit'
  pod 'Firebase/Analytics', '~> 10.0'
end
`;

describe("parsePodfile", () => {
  it("extracts a bare exact version as a pin", () => {
    const result = parsePodfile(PODFILE);
    expect(result.dependencies).toContainEqual({
      coordinate: "Alamofire",
      version: "5.9.1",
      ecosystem: "cocoapods",
      source: "Podfile",
    });
  });

  it("reports operator constraints as unresolved (null version)", () => {
    const result = parsePodfile(PODFILE);
    expect(result.dependencies).toContainEqual({
      coordinate: "SDWebImage",
      version: null,
      ecosystem: "cocoapods",
      source: "Podfile",
    });
    expect(result.warnings.some((w) => w.includes("constraint"))).toBe(true);
  });

  it("handles a pod with no version and collapses subspecs", () => {
    const names = parsePodfile(PODFILE).dependencies.map((d) => d.coordinate);
    expect(names).toContain("SnapKit");
    expect(names).toContain("Firebase"); // Firebase/Analytics → Firebase
    expect(names).not.toContain("Firebase/Analytics");
  });
});
