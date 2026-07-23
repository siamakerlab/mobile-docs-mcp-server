import { describe, expect, it } from "vitest";
import { gitUrlToCoordinate } from "./gitCoordinate";

describe("gitUrlToCoordinate", () => {
  it("reduces an https git URL (with .git) to owner/repo", () => {
    expect(
      gitUrlToCoordinate(
        "https://github.com/pointfreeco/swift-composable-architecture.git",
      ),
    ).toBe("pointfreeco/swift-composable-architecture");
  });

  it("reduces an https git URL without a .git suffix", () => {
    expect(gitUrlToCoordinate("https://github.com/Alamofire/Alamofire")).toBe(
      "Alamofire/Alamofire",
    );
  });

  it("reduces an scp-like git URL", () => {
    expect(gitUrlToCoordinate("git@github.com:apple/swift-argument-parser.git")).toBe(
      "apple/swift-argument-parser",
    );
  });

  it("returns null when owner/repo cannot be extracted", () => {
    expect(gitUrlToCoordinate("https://example.com/")).toBeNull();
    expect(gitUrlToCoordinate("not a url")).toBeNull();
  });
});
