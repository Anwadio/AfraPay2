/**
 * authService.js
 * Centralised helpers for parsing backend auth responses and errors.
 *
 * Backend response shape:
 *   Success  → { success: true,  data: { user, tokens: { accessToken, refreshToken, … } } }
 *   Error    → { success: false, error: { code, message, details } }
 */

/**
 * Safely extract { jwt, user } from a raw axios response.
 * Works for login / OAuth endpoints that return tokens.
 */
export function extractAuthPayload(axiosResponse) {
  const payload = axiosResponse?.data?.data || {};
  const jwt =
    payload.tokens?.accessToken || payload.token || payload.accessToken || null;
  const user = payload.user || null;
  return { jwt, user, raw: payload };
}

/**
 * Extract a human-readable error message from an axios error.
 * Handles both the nested `error.message` shape and legacy flat `message`.
 */
export function parseAuthError(err) {
  return (
    err?.response?.data?.error?.message ||
    err?.response?.data?.message ||
    err?.message ||
    "An unexpected error occurred. Please try again."
  );
}

/**
 * Returns true when the backend error code is EMAIL_NOT_VERIFIED (HTTP 403).
 */
export function isEmailNotVerified(err) {
  return err?.response?.data?.error?.code === "EMAIL_NOT_VERIFIED";
}

/**
 * Returns true when the server signals an MFA challenge is required.
 */
export function isMFARequired(payload) {
  return Boolean(payload?.mfaRequired);
}
