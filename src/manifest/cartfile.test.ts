import { describe, expect, it } from "vitest";
import { parseCartfile } from "./cartfile";

describe("parseCartfile", () => {
  it("extracts an exact-pinned github dependency (== operator absent)", () => {
    const result = parseCartfile('github "Alamofire/Alamofire" == 5.9.1\n');
    // `==` is a range operator here, so it is not a bare exact pin.
    expect(result.dependencies[0]).toMatchObject({
      coordinate: "Alamofire/Alamofire",
      version: null,
      ecosystem: "carthage",
    });
    expect(result.warnings.some((w) => w.includes("no exact pin"))).toBe(true);
  });

  it("treats a bare version with no operator as an exact pin", () => {
    const result = parseCartfile('github "Alamofire/Alamofire" "5.9.1"\n');
    expect(result.dependencies[0]).toMatchObject({
      coordinate: "Alamofire/Alamofire",
      version: "5.9.1",
    });
  });

  it("reports range operators as unresolved and handles no-version lines", () => {
    const result = parseCartfile(
      'github "ReactiveCocoa/ReactiveSwift" ~> 6.0\ngithub "o/r"\n',
    );
    const rc = result.dependencies.find(
      (d) => d.coordinate === "ReactiveCocoa/ReactiveSwift",
    );
    expect(rc?.version).toBeNull();
    const bare = result.dependencies.find((d) => d.coordinate === "o/r");
    expect(bare?.version).toBeNull();
  });
});
