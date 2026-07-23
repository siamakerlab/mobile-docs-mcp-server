import { describe, expect, it } from "vitest";
import { parseCartfileResolved } from "./cartfileResolved";

describe("parseCartfileResolved", () => {
  it("parses github origins to owner/repo with exact versions", () => {
    const result = parseCartfileResolved('github "Alamofire/Alamofire" "5.9.1"\n');
    expect(result.dependencies).toEqual([
      {
        coordinate: "Alamofire/Alamofire",
        version: "5.9.1",
        ecosystem: "carthage",
        source: "Cartfile.resolved",
      },
    ]);
  });

  it("parses git origins by reducing the URL to owner/repo", () => {
    const result = parseCartfileResolved(
      'git "https://example.com/team/widget.git" "2.0.0"\n',
    );
    expect(result.dependencies[0]).toMatchObject({
      coordinate: "team/widget",
      version: "2.0.0",
      ecosystem: "carthage",
    });
  });

  it("skips blank and comment lines and warns on unparsable ones", () => {
    const result = parseCartfileResolved(
      '# a comment\n\ngarbage line\ngithub "o/r" "1.0.0"\n',
    );
    expect(result.dependencies).toHaveLength(1);
    expect(result.warnings.some((w) => w.includes("unparsable"))).toBe(true);
  });
});
