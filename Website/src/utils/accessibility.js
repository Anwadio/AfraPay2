// Internationalization (i18n) utilities
// Backed by react-i18next for production-grade lazy loading and RTL support.
import React from "react";
import {
  useTranslation as useI18nTranslation,
  I18nextProvider,
} from "react-i18next";
import i18nInstance, { RTL_LANGUAGES, loadLocale, STORAGE_KEY } from "../i18n";

// ── Intl locale mapping ───────────────────────────────────────────────────────
// ar-juba is a custom locale code — map it to "ar" for Intl API calls
const intlLocale = (lang) => (lang === "ar-juba" ? "ar" : lang);

/**
 * useTranslation — backward-compatible hook.
 *
 * Existing callers continue to work unchanged:
 *   const { t, language, direction, formatCurrency } = useTranslation();
 *
 * Backed by react-i18next; no longer reads from the legacy context object.
 */
export const useTranslation = () => {
  const { t: i18nT, i18n } = useI18nTranslation();

  const language = i18n.language || "en";
  const direction = RTL_LANGUAGES.includes(language) ? "rtl" : "ltr";

  /**
   * Translate function — wraps i18next `t` with a compatible signature.
   * Supports {{variable}} interpolation via the values object.
   */
  const t = (key, values = {}) => i18nT(key, values);

  const formatNumber = (number, options = {}) =>
    new Intl.NumberFormat(intlLocale(language), options).format(number);

  const formatCurrency = (amount, currency = "USD") =>
    new Intl.NumberFormat(intlLocale(language), {
      style: "currency",
      currency,
    }).format(amount);

  const formatDate = (date, options = {}) =>
    new Intl.DateTimeFormat(intlLocale(language), options).format(
      new Date(date),
    );

  return {
    t,
    formatNumber,
    formatCurrency,
    formatDate,
    language,
    direction,
  };
};

/**
 * LanguageProvider — backward-compatible wrapper.
 *
 * Wraps the app with I18nextProvider (react-i18next).
 * The `translations` and `initialLanguage` props are still accepted for
 * compatibility but i18next manages the actual language state.
 */
export const LanguageProvider = ({
  children,
  // Legacy props — kept for backward compat but the real state lives in i18next
  initialLanguage = "en",
  // eslint-disable-next-line no-unused-vars
  translations = {},
}) => {
  // Seed the language from props if localStorage doesn't already have a preference
  React.useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored && initialLanguage && initialLanguage !== "en") {
      loadLocale(initialLanguage).then(() => {
        i18nInstance.changeLanguage(initialLanguage);
      });
    }
  }, [initialLanguage]);

  return <I18nextProvider i18n={i18nInstance}>{children}</I18nextProvider>;
};

/**
 * Accessibility utilities
 */

/**
 * Announce messages to screen readers
 */
export const announceToScreenReader = (message, priority = "polite") => {
  const announcement = document.createElement("div");
  announcement.setAttribute("aria-live", priority);
  announcement.setAttribute("aria-atomic", "true");
  announcement.className = "sr-only";
  announcement.textContent = message;

  document.body.appendChild(announcement);

  // Clean up after announcement
  setTimeout(() => {
    if (document.body.contains(announcement)) {
      document.body.removeChild(announcement);
    }
  }, 1000);
};

/**
 * Focus trap utility for modals
 */
export const useFocusTrap = (isActive) => {
  const containerRef = React.useRef(null);

  React.useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const container = containerRef.current;
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleTabKey = (e) => {
      if (e.key !== "Tab") return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    container.addEventListener("keydown", handleTabKey);
    firstElement?.focus();

    return () => {
      container.removeEventListener("keydown", handleTabKey);
    };
  }, [isActive]);

  return containerRef;
};

/**
 * Keyboard navigation utilities
 */

/**
 * Handle keyboard navigation for lists
 */
export const useKeyboardNavigation = (items, onSelect) => {
  const [focusedIndex, setFocusedIndex] = React.useState(-1);

  const handleKeyDown = React.useCallback(
    (e) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setFocusedIndex((prev) => (prev < items.length - 1 ? prev + 1 : 0));
          break;
        case "ArrowUp":
          e.preventDefault();
          setFocusedIndex((prev) => (prev > 0 ? prev - 1 : items.length - 1));
          break;
        case "Enter":
        case " ":
          e.preventDefault();
          if (focusedIndex >= 0 && items[focusedIndex]) {
            onSelect(items[focusedIndex]);
          }
          break;
        case "Escape":
          setFocusedIndex(-1);
          break;
        default:
          break;
      }
    },
    [items, focusedIndex, onSelect],
  );

  return {
    focusedIndex,
    setFocusedIndex,
    handleKeyDown,
  };
};

/**
 * Skip links component for keyboard navigation
 */
export const SkipLinks = ({ links }) => {
  return (
    <nav className="sr-only focus-within:not-sr-only fixed top-0 left-0 z-50 bg-white p-4 shadow-lg">
      <ul className="flex flex-col gap-2">
        {links.map((link, index) => (
          <li key={index}>
            <a
              href={link.href}
              className="text-primary-600 underline focus:outline-none focus:ring-2 focus:ring-primary-500"
              onFocus={(e) => e.target.scrollIntoView()}
            >
              {link.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
};

const accessibilityUtils = {
  useTranslation,
  LanguageProvider,
  announceToScreenReader,
  useFocusTrap,
  useKeyboardNavigation,
  SkipLinks,
};

export default accessibilityUtils;
