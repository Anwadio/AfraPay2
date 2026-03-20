/* eslint-disable no-unused-vars */
/**
 * LanguageSwitcher — AfraPay polished language selector
 * ──────────────────────────────────────────────────────
 * Props:
 *   variant   "dropdown" | "compact"    (default: "dropdown")
 *   placement "navbar" | "settings"     (default: "navbar")
 *   syncBackend  bool — persist to backend when changed
 *
 * Features:
 *   - Flag emoji + native language name
 *   - Animated dropdown with smooth transitions
 *   - RTL-aware (Juba Arabic flips the layout direction)
 *   - Accessible: role=listbox, aria-selected, keyboard navigation
 *   - Closes on outside click / Escape key
 *   - Mobile-friendly touch targets (min 44 px)
 */

import React, { useState, useRef, useEffect, useCallback, useId } from "react";
import { useLanguage } from "../../hooks/useLanguage";
import { cn } from "../../utils";

// ── Compact inline badge (used inside Navbar) ────────────────────────────────
const LanguageSwitcherCompact = ({ syncBackend }) => {
  const { language, languages, setLanguage, currentMeta } = useLanguage({
    syncBackend,
  });
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const listboxId = useId();

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Close on Escape
  const handleKeyDown = useCallback((e) => {
    if (e.key === "Escape") setOpen(false);
  }, []);

  const handleSelect = (code) => {
    setLanguage(code);
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-label={`Language: ${currentMeta.nativeName}`}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={handleKeyDown}
        className={cn(
          "flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-sm font-medium",
          "text-primary-100 hover:text-white hover:bg-white/10",
          "transition-colors duration-150",
          "min-w-[44px] min-h-[44px] sm:min-h-0",
          open && "bg-white/10",
        )}
      >
        <span className="text-base leading-none" aria-hidden="true">
          {currentMeta.flag}
        </span>
        <span className="hidden sm:inline text-xs uppercase tracking-wide">
          {language === "ar-juba" ? "AR" : language.toUpperCase()}
        </span>
        <svg
          className={cn(
            "w-3 h-3 transition-transform duration-200",
            open && "rotate-180",
          )}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <ul
          id={listboxId}
          role="listbox"
          aria-label="Select language"
          className={cn(
            "absolute top-full mt-1.5 z-50",
            "w-48 py-1 rounded-xl",
            "bg-white dark:bg-neutral-800",
            "border border-neutral-200 dark:border-neutral-700",
            "shadow-xl shadow-black/10",
            "animate-fade-in",
            // RTL: anchor to right side
            currentMeta.dir === "rtl" ? "right-0" : "left-0",
          )}
        >
          {languages.map(
            ({ code, nativeName, englishName, flag, isActive }) => (
              <li
                key={code}
                role="option"
                aria-selected={isActive}
                onClick={() => handleSelect(code)}
                onKeyDown={(e) => e.key === "Enter" && handleSelect(code)}
                tabIndex={0}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 cursor-pointer",
                  "text-sm transition-colors duration-100",
                  "focus:outline-none focus:bg-neutral-100 dark:focus:bg-neutral-700",
                  isActive
                    ? "bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 font-semibold"
                    : "text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700",
                )}
              >
                <span
                  className="text-lg leading-none flex-shrink-0"
                  aria-hidden="true"
                >
                  {flag}
                </span>
                <span className="flex flex-col">
                  <span className="font-medium leading-tight">
                    {nativeName}
                  </span>
                  {nativeName !== englishName && (
                    <span className="text-xs text-neutral-400 dark:text-neutral-500 leading-tight">
                      {englishName}
                    </span>
                  )}
                </span>
                {isActive && (
                  <svg
                    className="w-4 h-4 ml-auto text-primary-600 dark:text-primary-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                )}
              </li>
            ),
          )}
        </ul>
      )}
    </div>
  );
};

// ── Full settings-page variant ───────────────────────────────────────────────
const LanguageSwitcherSettings = ({ syncBackend }) => {
  const { languages, setLanguage } = useLanguage({ syncBackend });

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {languages.map(({ code, nativeName, englishName, flag, isActive }) => (
        <button
          key={code}
          type="button"
          aria-pressed={isActive}
          onClick={() => setLanguage(code)}
          className={cn(
            "relative flex items-center gap-3 px-4 py-3 rounded-xl border-2",
            "text-left transition-all duration-150",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500",
            isActive
              ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 shadow-sm"
              : "border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:border-primary-300 dark:hover:border-primary-600",
          )}
        >
          <span className="text-2xl leading-none" aria-hidden="true">
            {flag}
          </span>
          <span className="flex flex-col min-w-0">
            <span className="font-semibold text-sm leading-tight">
              {nativeName}
            </span>
            {nativeName !== englishName && (
              <span className="text-xs text-neutral-400 dark:text-neutral-500 leading-tight truncate">
                {englishName}
              </span>
            )}
          </span>

          {/* Active indicator */}
          {isActive && (
            <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary-500 flex items-center justify-center">
              <svg
                className="w-3 h-3 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={3}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </span>
          )}

          {/* RTL badge */}
          {code === "ar-juba" && (
            <span className="absolute bottom-2 right-2 text-[9px] font-bold tracking-widest text-neutral-400 dark:text-neutral-500 uppercase">
              RTL
            </span>
          )}
        </button>
      ))}
    </div>
  );
};

// ── Public export ─────────────────────────────────────────────────────────────
/**
 * @param {Object} props
 * @param {"dropdown"|"compact"|"settings"} [props.variant="compact"]
 * @param {boolean} [props.syncBackend=false]
 */
const LanguageSwitcher = ({ variant = "compact", syncBackend = false }) => {
  if (variant === "settings") {
    return <LanguageSwitcherSettings syncBackend={syncBackend} />;
  }
  return <LanguageSwitcherCompact syncBackend={syncBackend} />;
};

export default LanguageSwitcher;
