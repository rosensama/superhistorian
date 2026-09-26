const DOCKER_TAG_DEFAULT = "dev";
const DOCKER_COMMIT_DEFAULT = "unknown";
const SHORT_HASH_LENGTH = 7;

/**
 * Picks the version to display: release tag, else short commit hash, else "dev".
 * Build args (set by the Docker release workflow) win over local git state.
 *
 * @param {{ releaseTag?: string, releaseCommit?: string, gitTag?: string, gitCommit?: string }} sources
 * @returns {string}
 */
export function resolveAppVersion({ releaseTag, releaseCommit, gitTag, gitCommit }) {
  const tag = releaseTag?.trim();
  if (tag && tag !== DOCKER_TAG_DEFAULT) return tag;

  const commit = releaseCommit?.trim();
  if (commit && commit !== DOCKER_COMMIT_DEFAULT) return commit.slice(0, SHORT_HASH_LENGTH);

  if (gitTag?.trim()) return gitTag.trim();
  if (gitCommit?.trim()) return gitCommit.trim().slice(0, SHORT_HASH_LENGTH);

  return "dev";
}
