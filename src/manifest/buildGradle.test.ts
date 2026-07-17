import { describe, expect, it } from "vitest";
import { parseBuildGradle } from "./buildGradle";

describe("parseBuildGradle", () => {
  it("extracts inline dependency coordinates (Kotlin DSL and Groovy)", () => {
    const gradle = `
dependencies {
    implementation("com.squareup.okhttp3:okhttp:4.12.0")
    api 'com.google.code.gson:gson:2.10.1'
    testImplementation("junit:junit:4.13.2")
}
`;
    const { dependencies } = parseBuildGradle(gradle);
    const byCoord = Object.fromEntries(dependencies.map((d) => [d.coordinate, d]));

    expect(byCoord["com.squareup.okhttp3:okhttp"]).toMatchObject({
      version: "4.12.0",
      ecosystem: "maven",
    });
    expect(byCoord["com.google.code.gson:gson"].version).toBe("2.10.1");
    expect(byCoord["junit:junit"].version).toBe("4.13.2");
  });

  it("extracts plugin id + version declarations", () => {
    const gradle = `
plugins {
    id("com.android.application") version "8.2.0"
    id 'org.jetbrains.kotlin.android' version '1.9.22'
}
`;
    const { dependencies } = parseBuildGradle(gradle);
    const byCoord = Object.fromEntries(dependencies.map((d) => [d.coordinate, d]));

    expect(byCoord["com.android.application"]).toMatchObject({
      version: "8.2.0",
      ecosystem: "gradle-plugin",
    });
    expect(byCoord["org.jetbrains.kotlin.android"].version).toBe("1.9.22");
  });

  it("de-duplicates a coordinate declared under multiple configurations", () => {
    const gradle = `
dependencies {
    implementation("androidx.core:core-ktx:1.12.0")
    debugImplementation("androidx.core:core-ktx:1.12.0")
}
`;
    const { dependencies } = parseBuildGradle(gradle);
    expect(
      dependencies.filter((d) => d.coordinate === "androidx.core:core-ktx"),
    ).toHaveLength(1);
  });

  it("skips catalog accessors and variable/interpolated versions", () => {
    const gradle = `
dependencies {
    implementation(libs.okhttp)
    implementation("com.example:lib:\${libVersion}")
}
`;
    const { dependencies } = parseBuildGradle(gradle);
    // Neither the catalog accessor nor the interpolated coordinate is extracted.
    expect(dependencies).toEqual([]);
  });

  it("tags source and captures dynamic versions verbatim", () => {
    const gradle = `implementation("com.example:lib:1.0.+")`;
    const { dependencies } = parseBuildGradle(gradle, "app/build.gradle.kts");
    expect(dependencies[0]).toMatchObject({
      coordinate: "com.example:lib",
      version: "1.0.+",
      source: "app/build.gradle.kts",
    });
  });

  it("does not match 'id' inside a larger identifier (word boundary)", () => {
    const gradle = `android {
    defaultConfig {
        applicationId "com.evil.app"
    }
}
some_id("com.example.evil") version "9.9.9"
`;
    const { dependencies } = parseBuildGradle(gradle);
    const coords = dependencies.map((d) => d.coordinate);
    // applicationId (no trailing \`version\`) and some_id (\`id\` preceded by a word char)
    // must not be mis-parsed as plugin ids.
    expect(coords).not.toContain("com.evil.app");
    expect(coords).not.toContain("com.example.evil");
  });
});
