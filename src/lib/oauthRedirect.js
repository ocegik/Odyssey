/**
 * OAuth's implicit flow returns the session in the URL fragment. Hash routes
 * also live in that fragment, so a route such as `#/overview` must never be
 * used as the OAuth callback destination: a URL can only have one fragment.
 */
export function getOAuthCallbackUrl(origin) {
  return new URL("/", origin).toString();
}
