import type { NextConfig } from "next";

/**
 * Project Pages live at /<repo> (e.g. username.github.io/grok-bot-interface).
 * User/org sites (repo name ends with .github.io) stay at the domain root.
 * Local `npm run build` / `next dev` leave basePath empty.
 */
function githubPagesBasePath(): string | undefined {
  if (process.env.GITHUB_PAGES !== "true") {
    return undefined;
  }

  const repo = process.env.GITHUB_REPOSITORY?.split("/")[1];
  if (!repo || repo.endsWith(".github.io")) {
    return undefined;
  }

  return `/${repo}`;
}

const basePath = githubPagesBasePath();

const nextConfig: NextConfig = {
  output: "export",
  // Directory indexes so GitHub Pages can serve /gym/ → gym/index.html
  trailingSlash: true,
  images: { unoptimized: true },
  // next/image does not prefix public-file src when images are unoptimized.
  // The navbar logo is a public file, so it needs the same prefix as basePath.
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath ?? "",
  },
  ...(basePath ? { basePath, assetPrefix: basePath } : {}),
};

export default nextConfig;
