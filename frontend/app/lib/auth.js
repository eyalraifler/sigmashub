/**
 * Read the access token from the browser's cookies.
 *
 * Looks for the `access_token` cookie in document.cookie.
 * Returns null when called server-side (no document object).
 *
 * @returns {string|null} The decoded token string, or null if not found.
 */
export function getAccessToken() {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|;\s*)access_token=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export function getIsAdmin() {
  if (typeof document === "undefined") return false;
  const match = document.cookie.match(/(?:^|;\s*)is_admin=([^;]*)/);
  return match ? match[1] === "1" : false;
}
