---
name: ios-project-docs
description: >-
  Index and search version-correct documentation for an iOS / Swift project. Resolve
  the exact dependency versions a project declares (Swift Package Manager, CocoaPods,
  Carthage), scrape each dependency's DocC documentation at that version from Swift
  Package Index, index Apple framework docs (developer.apple.com, docs.swift.org)
  directly from their DocC render JSON with no browser, and search scoped to the
  project's versions. Use when working inside an iOS/Swift codebase and you need
  grounded, version-correct library docs.
compatibility: >-
  Requires Node.js 22+ and a local build of this fork (npm run build) or a global
  install of it. The resolve-project-deps / scrape-project commands, the DocC
  render-JSON pipeline, and iOS manifest parsing are not in upstream.
metadata:
  author: siamakerlab
---

# iOS Project Docs

Ground an AI assistant in the **exact versions** of the libraries an iOS/Swift project
uses. This fork parses the project's package manifests, maps each dependency to its
Swift Package Index documentation, and indexes it for semantic search. Apple's own docs
(developer.apple.com, docs.swift.org) are indexed directly from their DocC render JSON —
no headless browser needed.

## When to use

- You are working in an iOS/Swift project (SwiftPM, CocoaPods, or Carthage) and need
  accurate, version-specific library documentation.
- You want to index a project's entire dependency set in one shot.
- You want searches to default to the versions the project actually declares.

## Workflow

Commands use `docs-mcp-server` (this fork, locally built/installed).

```bash
# 1. Resolve what the project declares (each dep includes a ready-to-scrape docUrl).
docs-mcp-server resolve-project-deps ./MyApp --output json

# 2. One-shot: scrape every dependency's docs at its declared version.
docs-mcp-server scrape-project ./MyApp

# 3. Index your own Swift source (line-based, content-preserving chunking).
docs-mcp-server scrape my-app file:///abs/path/to/MyApp/Sources

# 4. Search, defaulting to the version the project declares for the library.
docs-mcp-server search swift-composable-architecture "store scope" --project ./MyApp
```

Over MCP, the same flow is available as the `resolve_project_deps`, `scrape_project`,
`scrape_docs`, and `search_docs` (with `projectPath`) tools.

## Recognized manifests

Lock files (exact versions, preferred): `Package.resolved` (SwiftPM — including the copy
embedded in `*.xcodeproj/project.xcworkspace/xcshareddata/swiftpm/`), `Podfile.lock`
(CocoaPods), `Cartfile.resolved` (Carthage). Loose manifests (fallback, exact pins only):
`Package.swift`, `Podfile`, `Cartfile`.

Coordinates: SwiftPM/Carthage resolve to `owner/repo` → Swift Package Index docs;
CocoaPods pods carry versions but have no hosted docs (CocoaDocs was sunset).

## Scrape recipes — official Apple docs

Apple's docs render as a `swift-docc-render` SPA, but this fork fetches the underlying
DocC render JSON directly (no browser):

```bash
# Apple framework reference (SwiftUI, UIKit, Foundation, …)
docs-mcp-server scrape swiftui https://developer.apple.com/documentation/swiftui

# The Swift Programming Language book + standard library
docs-mcp-server scrape swift https://docs.swift.org/swift-book/documentation/the-swift-programming-language

# A Swift package's DocC docs (Swift Package Index — Swift's javadoc.io equivalent)
docs-mcp-server scrape tca https://swiftpackageindex.com/pointfreeco/swift-composable-architecture/1.15.0/documentation/composablearchitecture
```

## Notes

- Only pinned versions produce versioned doc URLs; constraint/dynamic versions map to
  the package's latest page and are indexed unversioned.
- Swift source is indexed with line-based splitting (no AST grammar yet), like Dart.
- Swift Package Index is behind Cloudflare; if a plain fetch is challenged, scraping
  falls back to the browser fetcher (requires a Playwright install).
