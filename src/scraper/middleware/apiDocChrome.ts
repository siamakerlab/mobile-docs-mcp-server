/**
 * CSS selectors for navigation/chrome emitted by API-documentation generators
 * (Javadoc, Dokka/KDoc, Dartdoc). These wrap the real reference content in nav bars,
 * sub-navigation, breadcrumbs, and skip-links that carry no documentation value.
 *
 * Selectors lean generator-specific to limit false positives on ordinary sites: the
 * broadest classes (`.header`, `.nav`, `.sidebar`, layout containers like Javadoc's
 * `.flex-content`) are deliberately excluded and left to the general sanitizer
 * defaults. The remaining nav / sub-nav / breadcrumb / skip-link classes are navigation
 * chrome even on generic sites, so removing them does not lose content. Verified against
 * real `/static/` Javadoc and Dartdoc HTML; see docs/spikes/javadoc-io-scraping.md.
 * Dokka-specific classes that could wrap real content (e.g. `.filter-section`) are
 * intentionally omitted until verified against actual Dokka HTML.
 */
export const API_DOC_CHROME_SELECTORS: string[] = [
  // Javadoc (JDK javadoc) — new-style, Java 11+ (kebab-case)
  ".flex-header",
  ".top-nav",
  ".bottom-nav",
  ".sub-nav",
  ".sub-nav-list",
  ".nav-list-search",
  ".skip-nav",
  // Javadoc — old-style, Java 8–10 (camelCase)
  ".topNav",
  ".bottomNav",
  ".subNav",
  ".navList",
  // Dartdoc — breadcrumb trail + sidebar search
  ".breadcrumbs",
  ".self-crumb",
  ".gt-separated",
  ".search-sidebar",
];
