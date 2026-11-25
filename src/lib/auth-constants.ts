export const ADMIN_SESSION_COOKIE = "portfolio_admin_session";

/** Admin session lifetime (cookie max-age and signed token expiry). */
export const ADMIN_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

/** Fixed Sanity document id for the admin auth singleton. */
export const ADMIN_AUTH_DOC_ID = "adminAuth";

/** Minimum length for new admin passwords (UI + server). */
export const ADMIN_PASSWORD_MIN_LENGTH = 12;
