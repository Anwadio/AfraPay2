/**
 * i18n Middleware — Language detection for backend responses
 * ──────────────────────────────────────────────────────────
 * Reads the preferred locale from (in priority order):
 *   1. req.headers['accept-language']
 *   2. req.query.lang
 *   3. req.body.lang (POST/PUT requests only)
 *
 * Sets req.locale to a supported locale code ('en' | 'fr') so that
 * controllers can use it when constructing localised messages or
 * returning multilingual database content.
 *
 * Usage in controllers:
 *   const locale = req.locale;          // 'en' or 'fr'
 *   const msg = t(locale, 'payment.success');
 *
 * Usage in route handlers:
 *   router.use(localeMiddleware);
 */

"use strict";

const SUPPORTED_LOCALES = ["en", "fr"];
const DEFAULT_LOCALE = "en";

/**
 * Built-in translation strings used in backend-generated messages.
 * For richer content (education articles, blog posts) use multilingual
 * fields in the database instead.
 */
const MESSAGES = {
  en: {
    "payment.success": "Payment completed successfully.",
    "payment.failed": "Payment failed. Please try again.",
    "payment.pending": "Your payment is being processed.",
    "transfer.success": "Transfer completed successfully.",
    "transfer.failed": "Transfer failed. Please try again.",
    "transfer.insufficient": "Insufficient funds.",
    "auth.loginSuccess": "Welcome back!",
    "auth.logoutSuccess": "You have been logged out.",
    "auth.registerSuccess": "Account created successfully.",
    "auth.emailVerified": "Email verified successfully.",
    "auth.passwordReset": "Password reset email sent.",
    "auth.passwordChanged": "Password changed successfully.",
    "notification.newTransaction": "New transaction: {{amount}}",
    "notification.paymentReceived": "You received {{amount}} from {{sender}}.",
    "notification.paymentSent": "You sent {{amount}} to {{recipient}}.",
    "notification.transferPending": "Transfer of {{amount}} is pending.",
    "notification.transferFailed": "Transfer of {{amount}} failed.",
    "errors.notFound": "Resource not found.",
    "errors.unauthorized": "Unauthorized access.",
    "errors.badRequest": "Invalid request.",
    "errors.serverError": "Internal server error. Please try again later.",
  },
  fr: {
    "payment.success": "Paiement effectué avec succès.",
    "payment.failed": "Paiement échoué. Veuillez réessayer.",
    "payment.pending": "Votre paiement est en cours de traitement.",
    "transfer.success": "Transfert effectué avec succès.",
    "transfer.failed": "Transfert échoué. Veuillez réessayer.",
    "transfer.insufficient": "Fonds insuffisants.",
    "auth.loginSuccess": "Bon retour !",
    "auth.logoutSuccess": "Vous avez été déconnecté.",
    "auth.registerSuccess": "Compte créé avec succès.",
    "auth.emailVerified": "E-mail vérifié avec succès.",
    "auth.passwordReset": "E-mail de réinitialisation envoyé.",
    "auth.passwordChanged": "Mot de passe modifié avec succès.",
    "notification.newTransaction": "Nouvelle transaction : {{amount}}",
    "notification.paymentReceived": "Vous avez reçu {{amount}} de {{sender}}.",
    "notification.paymentSent": "Vous avez envoyé {{amount}} à {{recipient}}.",
    "notification.transferPending": "Transfert de {{amount}} en attente.",
    "notification.transferFailed": "Transfert de {{amount}} échoué.",
    "errors.notFound": "Ressource introuvable.",
    "errors.unauthorized": "Accès non autorisé.",
    "errors.badRequest": "Requête invalide.",
    "errors.serverError":
      "Erreur interne du serveur. Veuillez réessayer plus tard.",
  },
};

/**
 * Resolve the best matching locale from an Accept-Language header value.
 * e.g. "fr-FR,fr;q=0.9,en;q=0.8" → "fr"
 *
 * @param {string} acceptLanguage
 * @returns {string|null}
 */
function resolveFromAcceptLanguage(acceptLanguage) {
  if (!acceptLanguage) return null;

  // Parse quality-sorted list of language tags
  const tags = acceptLanguage
    .split(",")
    .map((entry) => {
      const [lang, q] = entry.trim().split(";q=");
      return { lang: lang.trim().toLowerCase(), q: parseFloat(q ?? "1") };
    })
    .sort((a, b) => b.q - a.q);

  for (const { lang } of tags) {
    // Exact match first (e.g. "fr")
    if (SUPPORTED_LOCALES.includes(lang)) return lang;
    // Language-tag prefix match: "fr-FR" → "fr"
    const base = lang.split("-")[0];
    if (SUPPORTED_LOCALES.includes(base)) return base;
  }
  return null;
}

/**
 * Express middleware: attaches req.locale and the t() helper.
 */
function localeMiddleware(req, res, next) {
  const fromQuery = req.query?.lang;
  const fromBody = req.body?.lang;
  const fromHeader = resolveFromAcceptLanguage(
    req.headers["accept-language"] || req.headers["x-app-language"],
  );

  // Priority: query param > body field > Accept-Language header > default
  const rawLocale =
    (typeof fromQuery === "string" ? fromQuery.toLowerCase() : null) ||
    (typeof fromBody === "string" ? fromBody.toLowerCase() : null) ||
    fromHeader ||
    DEFAULT_LOCALE;

  req.locale = SUPPORTED_LOCALES.includes(rawLocale)
    ? rawLocale
    : DEFAULT_LOCALE;

  /**
   * Translate a message key for the current request locale.
   * Supports {{variable}} interpolation.
   *
   * @param {string} key
   * @param {Record<string, string>} [vars]
   * @returns {string}
   */
  req.t = (key, vars = {}) => {
    const dict = MESSAGES[req.locale] || MESSAGES[DEFAULT_LOCALE];
    let msg = dict[key] || MESSAGES[DEFAULT_LOCALE][key] || key;
    Object.entries(vars).forEach(([k, v]) => {
      msg = msg.replace(new RegExp(`\\{\\{${k}\\}\\}`, "g"), v);
    });
    return msg;
  };

  next();
}

module.exports = { localeMiddleware, SUPPORTED_LOCALES, MESSAGES };
