import { execSync } from "node:child_process";
import { resolveAppVersion } from "./src/lib/app-version.mjs";

function git(args) {
  try {
    return execSync(`git ${args}`, { stdio: ["ignore", "pipe", "ignore"] }).toString();
  } catch {
    return undefined;
  }
}

// Docker builds pass RELEASE_* build args (no .git in the build context);
// local dev/builds fall back to the checkout's exact tag or short hash.
const hasReleaseArgs = Boolean(process.env.RELEASE_TAG || process.env.RELEASE_COMMIT);
const appVersion = resolveAppVersion({
  releaseTag: process.env.RELEASE_TAG,
  releaseCommit: process.env.RELEASE_COMMIT,
  gitTag: hasReleaseArgs ? undefined : git("describe --tags --exact-match"),
  gitCommit: hasReleaseArgs ? undefined : git("rev-parse --short HEAD"),
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  env: {
    NEXT_PUBLIC_APP_VERSION: appVersion,
  },
};
export default nextConfig;
