/**
 * Reduce a git remote URL to an `owner/repo` coordinate, the identifier Swift
 * Package Index (and this fork's SPM/Carthage doc mapping) uses. Handles both
 * `https://host/owner/repo(.git)` and scp-like `git@host:owner/repo(.git)` forms.
 * Returns `null` when an owner/repo pair can't be extracted.
 */
export function gitUrlToCoordinate(gitUrl: string): string | null {
  const trimmed = gitUrl.trim();

  // scp-like syntax: git@github.com:owner/repo.git (no scheme, has `:` after host)
  if (!trimmed.includes("://") && trimmed.includes("@") && trimmed.includes(":")) {
    const afterColon = trimmed.slice(trimmed.indexOf(":") + 1);
    return ownerRepoFromPath(afterColon);
  }

  try {
    const u = new URL(trimmed);
    return ownerRepoFromPath(u.pathname);
  } catch {
    return null;
  }
}

/** Extract the last two non-empty path segments as `owner/repo`, dropping `.git`. */
function ownerRepoFromPath(pathLike: string): string | null {
  const parts = pathLike
    .replace(/\.git\/?$/, "")
    .split("/")
    .filter(Boolean);
  if (parts.length < 2) {
    return null;
  }
  return `${parts[parts.length - 2]}/${parts[parts.length - 1]}`;
}
