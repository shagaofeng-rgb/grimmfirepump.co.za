import "server-only";

/** Production publication remains opt-in until the verified source catalog and quality gates are live. */
export function automaticNewsPublicationEnabled(): boolean {
  return process.env.NEWS_AUTO_PUBLISH === "true";
}
