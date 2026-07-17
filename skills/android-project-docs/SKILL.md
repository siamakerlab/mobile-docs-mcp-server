---
name: android-project-docs
description: >-
  Index and search version-correct documentation for an Android / Kotlin / Flutter
  project. Resolve the exact dependency versions a project declares, scrape each
  dependency's docs at that version, index Kotlin/Java source with AST-aware chunking,
  and search scoped to the project's versions. Use when working inside an Android or
  Flutter codebase and you need grounded, version-correct library docs.
compatibility: >-
  Requires Node.js 22+ and a local build of this fork (npm run build) or a global
  install of it. The resolve-project-deps / scrape-project commands and Kotlin/Java
  AST chunking are not in upstream.
metadata:
  author: siamakerlab
---

# Android Project Docs

Ground an AI assistant in the **exact versions** of the libraries an Android/Flutter
project uses. This fork parses the project's build manifests, maps each dependency to
its documentation, and indexes it for semantic search.

## When to use

- You are working in an Android (Gradle/Kotlin/Java) or Flutter (Dart) project and need
  accurate, version-specific library documentation.
- You want to index a project's entire dependency set in one shot.
- You want searches to default to the versions the project actually declares.

## Workflow

Commands use `docs-mcp-server` (this fork, locally built/installed).

```bash
# 1. Resolve what the project declares (each dep includes a ready-to-scrape docUrl).
docs-mcp-server resolve-project-deps ./my-app --output json

# 2. One-shot: scrape every dependency's docs at its declared version.
docs-mcp-server scrape-project ./my-app

# 3. Index your own Kotlin/Java source (AST-aware, symbol-aligned chunking).
docs-mcp-server scrape my-app file:///abs/path/to/my-app/app/src

# 4. Search, defaulting to the version the project declares for the library.
docs-mcp-server search okhttp "connection pool timeout" --project ./my-app
```

Over MCP, the same flow is available as the `resolve_project_deps`, `scrape_project`,
`scrape_docs`, and `search_docs` (with `projectPath`) tools.

## Recognized manifests

`libs.versions.toml` (Gradle version catalog), `build.gradle(.kts)` /
`settings.gradle(.kts)`, and Flutter `pubspec.yaml` / `pubspec.lock` (lock preferred for
exact versions).

## Scrape recipes — official docs

When you want the official docs rather than a specific artifact's API reference:

```bash
# Android SDK + AndroidX (Jetpack) reference and guides
docs-mcp-server scrape android https://developer.android.com/reference

# Kotlin language, coroutines, stdlib
docs-mcp-server scrape kotlin https://kotlinlang.org/docs/home.html

# Flutter framework API
docs-mcp-server scrape flutter https://api.flutter.dev/

# Gradle user guide
docs-mcp-server scrape gradle https://docs.gradle.org/current/userguide/userguide.html
```

For a Maven artifact's generated API docs, prefer javadoc.io's scrapeable `/static/`
path (the `/doc/…` page is a Vue wrapper):

```bash
docs-mcp-server scrape okhttp https://javadoc.io/static/com.squareup.okhttp3/okhttp/4.12.0/index.html
```

## Notes

- Only pinned versions produce versioned doc URLs; constraint/dynamic versions map to
  the package's latest page and are indexed unversioned.
- Dart source is indexed with line-based splitting (no AST grammar yet); Kotlin/Java use
  full tree-sitter AST chunking.
