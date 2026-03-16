// Internationalization (i18n) utilities
import React, { createContext, useContext } from "react";

/**
 * Language Context for managing the current language
 */
const LanguageContext = createContext({
  language: "en",
  setLanguage: () => {},
  direction: "ltr",
  translations: {},
});

/**
 * Hook to use translation functionality
 */
export const useTranslation = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useTranslation must be used within a LanguageProvider");
  }

  const { language, translations, direction } = context;

  /**
   * Translate function with interpolation support
   * @param {string} key - Translation key
   * @param {object} values - Values for interpolation
   * @returns {string} Translated text
   */
  const t = (key, values = {}) => {
    const keys = key.split(".");
    let translation = translations[language];

    for (const k of keys) {
      if (translation && typeof translation === "object") {
        translation = translation[k];
      } else {
        // Fallback to English if translation not found
        translation = translations["en"];
        for (const k of keys) {
          if (translation && typeof translation === "object") {
            translation = translation[k];
          } else {
            translation = key; // Ultimate fallback
            break;
          }
        }
        break;
      }
    }

    if (typeof translation !== "string") {
      return key; // Fallback to key if no translation found
    }

    // Handle interpolation
    return translation.replace(/\\{\\{(\\w+)\\}\\}/g, (match, variable) => {
      return values[variable] || match;
    });
  };

  /**
   * Format number according to locale
   */
  const formatNumber = (number, options = {}) => {
    return new Intl.NumberFormat(language, options).format(number);
  };

  /**
   * Format currency according to locale
   */
  const formatCurrency = (amount, currency = "USD") => {
    return new Intl.NumberFormat(language, {
      style: "currency",
      currency,
    }).format(amount);
  };

  /**
   * Format date according to locale
   */
  const formatDate = (date, options = {}) => {
    return new Intl.DateTimeFormat(language, options).format(new Date(date));
  };

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
 * LanguageProvider component
 */
export const LanguageProvider = ({
  children,
  initialLanguage = "en",
  translations = {},
}) => {
  const [language, setLanguage] = React.useState(initialLanguage);

  // RTL languages
  const rtlLanguages = ["ar", "he", "fa", "ur"];
  const direction = rtlLanguages.includes(language) ? "rtl" : "ltr";

  const value = {
    language,
    setLanguage,
    direction,
    translations,
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
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
