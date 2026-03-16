/* eslint-disable no-console */
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "../components/layout/DashboardLayout";
import { useAuth } from "../contexts/AuthContext";
import { authAPI, userAPI } from "../services/api";
import toast from "react-hot-toast";

// ---------------------------------------------------------------------------
// Dark-mode helpers
// ---------------------------------------------------------------------------
const THEME_KEY = "afrapay_theme";

function getStoredTheme() {
  return localStorage.getItem(THEME_KEY) || "system";
}

function applyTheme(theme) {
  const root = document.documentElement;
  if (theme === "dark") {
    root.classList.add("dark");
  } else if (theme === "light") {
    root.classList.remove("dark");
  } else {
    // system
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)",
    ).matches;
    root.classList.toggle("dark", prefersDark);
  }
}

// ---------------------------------------------------------------------------
// Small UI helpers
// ---------------------------------------------------------------------------
const SectionCard = ({ title, description, children }) => (
  <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-6 space-y-5">
    <div>
      <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
        {title}
      </h3>
      {description && (
        <p className="mt-0.5 text-sm text-neutral-500 dark:text-neutral-400">
          {description}
        </p>
      )}
    </div>
    {children}
  </div>
);

const Divider = () => (
  <hr className="border-neutral-200 dark:border-neutral-700" />
);

const inputCls =
  "w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg text-sm " +
  "bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 " +
  "focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50";

const btnPrimary =
  "inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white " +
  "bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

const btnDanger =
  "inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white " +
  "bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

const btnOutline =
  "inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold " +
  "text-neutral-700 dark:text-neutral-300 bg-white dark:bg-neutral-800 " +
  "border border-neutral-300 dark:border-neutral-600 hover:bg-neutral-50 dark:hover:bg-neutral-700 " +
  "rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

// ---------------------------------------------------------------------------
// Appearance section
// ---------------------------------------------------------------------------
const AppearanceSection = () => {
  const [theme, setTheme] = useState(getStoredTheme);

  const handleThemeChange = (value) => {
    setTheme(value);
    localStorage.setItem(THEME_KEY, value);
    applyTheme(value);
    toast.success(
      value === "system"
        ? "Theme set to follow system preference"
        : `${value.charAt(0).toUpperCase() + value.slice(1)} mode enabled`,
    );
  };

  const options = [
    {
      value: "light",
      label: "Light",
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z"
          />
        </svg>
      ),
    },
    {
      value: "dark",
      label: "Dark",
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
        </svg>
      ),
    },
    {
      value: "system",
      label: "System",
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          />
        </svg>
      ),
    },
  ];

  return (
    <SectionCard
      title="Appearance"
      description="Choose how AfraPay looks for you."
    >
      <div className="grid grid-cols-3 gap-3">
        {options.map((opt) => {
          const active = theme === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => handleThemeChange(opt.value)}
              className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all text-sm font-medium ${
                active
                  ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300"
                  : "border-neutral-200 dark:border-neutral-600 text-neutral-600 dark:text-neutral-400 hover:border-neutral-300 dark:hover:border-neutral-500"
              }`}
            >
              {opt.icon}
              {opt.label}
              {active && (
                <span className="w-1.5 h-1.5 rounded-full bg-primary-500" />
              )}
            </button>
          );
        })}
      </div>
    </SectionCard>
  );
};

// ---------------------------------------------------------------------------
// Change Password
// ---------------------------------------------------------------------------

// Password requirement rules — kept in sync with backend validation
const PW_RULES = [
  { id: "len", label: "At least 8 characters", test: (v) => v.length >= 8 },
  {
    id: "upper",
    label: "One uppercase letter (A-Z)",
    test: (v) => /[A-Z]/.test(v),
  },
  {
    id: "lower",
    label: "One lowercase letter (a-z)",
    test: (v) => /[a-z]/.test(v),
  },
  { id: "num", label: "One number (0-9)", test: (v) => /\d/.test(v) },
  {
    id: "sym",
    label: "One special character",
    test: (v) => /[^A-Za-z\d]/.test(v),
  },
];

const strengthLabel = ["", "Weak", "Fair", "Good", "Strong", "Very strong"];
const strengthColor = [
  "",
  "bg-red-500",
  "bg-orange-400",
  "bg-yellow-400",
  "bg-lime-500",
  "bg-green-500",
];

// Eye icon toggle for password fields
const EyeIcon = ({ open }) =>
  open ? (
    <svg
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
      />
    </svg>
  ) : (
    <svg
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
      />
    </svg>
  );

const ChangePasswordSection = () => {
  const [form, setForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [show, setShow] = useState({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false,
  });
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setTouched((prev) => ({ ...prev, [name]: true }));
  };

  const toggleShow = (name) =>
    setShow((prev) => ({ ...prev, [name]: !prev[name] }));

  // Derived strength (count of rules passed)
  const passedRules = PW_RULES.filter((r) => r.test(form.newPassword));
  const strength = passedRules.length; // 0-5
  const allRulesMet = strength === PW_RULES.length;
  const passwordsMatch =
    form.confirmPassword.length > 0 &&
    form.newPassword === form.confirmPassword;
  const confirmMismatch =
    touched.confirmPassword &&
    form.confirmPassword.length > 0 &&
    form.newPassword !== form.confirmPassword;

  const canSubmit =
    form.currentPassword.length > 0 &&
    allRulesMet &&
    passwordsMatch &&
    form.newPassword !== form.currentPassword;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    try {
      await authAPI.changePassword(form.currentPassword, form.newPassword);
      toast.success("Password changed successfully.");
      setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setTouched({});
    } catch (err) {
      console.error("Change password failed", err);
      const msg =
        err.response?.data?.error?.message ||
        "Failed to change password. Please try again.";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SectionCard
      title="Change Password"
      description="Use a strong password that meets all the requirements below."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Current password */}
        <div className="space-y-1">
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Current Password
          </label>
          <div className="relative">
            <input
              type={show.currentPassword ? "text" : "password"}
              name="currentPassword"
              value={form.currentPassword}
              onChange={handleChange}
              required
              autoComplete="current-password"
              className={inputCls + " pr-10"}
            />
            <button
              type="button"
              onClick={() => toggleShow("currentPassword")}
              className="absolute inset-y-0 right-0 px-3 flex items-center text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
              tabIndex={-1}
              aria-label={
                show.currentPassword ? "Hide password" : "Show password"
              }
            >
              <EyeIcon open={show.currentPassword} />
            </button>
          </div>
        </div>

        {/* New password */}
        <div className="space-y-1">
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
            New Password
          </label>
          <div className="relative">
            <input
              type={show.newPassword ? "text" : "password"}
              name="newPassword"
              value={form.newPassword}
              onChange={handleChange}
              required
              autoComplete="new-password"
              className={inputCls + " pr-10"}
            />
            <button
              type="button"
              onClick={() => toggleShow("newPassword")}
              className="absolute inset-y-0 right-0 px-3 flex items-center text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
              tabIndex={-1}
              aria-label={show.newPassword ? "Hide password" : "Show password"}
            >
              <EyeIcon open={show.newPassword} />
            </button>
          </div>

          {/* Strength meter — only show once user starts typing */}
          {form.newPassword.length > 0 && (
            <div className="space-y-2 pt-1">
              {/* Bar */}
              <div className="flex gap-1">
                {PW_RULES.map((_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                      i < strength
                        ? strengthColor[strength]
                        : "bg-neutral-200 dark:bg-neutral-700"
                    }`}
                  />
                ))}
              </div>
              <p
                className={`text-xs font-medium ${
                  strength <= 2
                    ? "text-red-500"
                    : strength === 3
                      ? "text-yellow-500"
                      : "text-green-600 dark:text-green-400"
                }`}
              >
                {strengthLabel[strength]}
              </p>

              {/* Requirements checklist */}
              <ul className="space-y-1">
                {PW_RULES.map((rule) => {
                  const met = rule.test(form.newPassword);
                  return (
                    <li
                      key={rule.id}
                      className="flex items-center gap-2 text-xs"
                    >
                      <svg
                        className={`w-3.5 h-3.5 flex-shrink-0 transition-colors ${
                          met
                            ? "text-green-500"
                            : "text-neutral-300 dark:text-neutral-600"
                        }`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span
                        className={
                          met
                            ? "text-neutral-700 dark:text-neutral-300"
                            : "text-neutral-400 dark:text-neutral-500"
                        }
                      >
                        {rule.label}
                      </span>
                    </li>
                  );
                })}
                {/* Same-as-current warning */}
                {form.newPassword.length > 0 &&
                  form.currentPassword.length > 0 &&
                  form.newPassword === form.currentPassword && (
                    <li className="flex items-center gap-2 text-xs text-red-500">
                      <svg
                        className="w-3.5 h-3.5 flex-shrink-0"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                          clipRule="evenodd"
                        />
                      </svg>
                      Must be different from your current password
                    </li>
                  )}
              </ul>
            </div>
          )}
        </div>

        {/* Confirm password */}
        <div className="space-y-1">
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Confirm New Password
          </label>
          <div className="relative">
            <input
              type={show.confirmPassword ? "text" : "password"}
              name="confirmPassword"
              value={form.confirmPassword}
              onChange={handleChange}
              required
              autoComplete="new-password"
              className={
                inputCls +
                " pr-10" +
                (confirmMismatch ? " border-red-400 focus:ring-red-400" : "") +
                (passwordsMatch ? " border-green-400 focus:ring-green-400" : "")
              }
            />
            <button
              type="button"
              onClick={() => toggleShow("confirmPassword")}
              className="absolute inset-y-0 right-0 px-3 flex items-center text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
              tabIndex={-1}
              aria-label={
                show.confirmPassword ? "Hide password" : "Show password"
              }
            >
              <EyeIcon open={show.confirmPassword} />
            </button>
          </div>
          {confirmMismatch && (
            <p className="text-xs text-red-500 mt-0.5">
              Passwords do not match.
            </p>
          )}
          {passwordsMatch && (
            <p className="text-xs text-green-600 dark:text-green-400 mt-0.5">
              Passwords match.
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={saving || !canSubmit}
          className={btnPrimary}
        >
          {saving ? (
            <>
              <svg
                className="w-4 h-4 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              Saving…
            </>
          ) : (
            "Update Password"
          )}
        </button>
      </form>
    </SectionCard>
  );
};

// ---------------------------------------------------------------------------
// 2FA / TOTP section
// ---------------------------------------------------------------------------

// Step indicator
const Step = ({ n, active, done, label }) => (
  <div className="flex items-center gap-2">
    <div
      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
        done
          ? "bg-green-500 text-white"
          : active
            ? "bg-primary-600 text-white"
            : "bg-neutral-200 dark:bg-neutral-700 text-neutral-500 dark:text-neutral-400"
      }`}
    >
      {done ? (
        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
            clipRule="evenodd"
          />
        </svg>
      ) : (
        n
      )}
    </div>
    <span
      className={`text-sm ${active ? "font-semibold text-neutral-900 dark:text-neutral-100" : "text-neutral-500 dark:text-neutral-400"}`}
    >
      {label}
    </span>
  </div>
);

const TwoFASection = ({ profile, onProfileUpdate }) => {
  const totpEnabled = profile?.mfaEnabled === true;

  // Setup flow state
  const [setupStep, setSetupStep] = useState(0); // 0=idle, 1=qr, 2=confirm, 3=done
  const [qrCode, setQrCode] = useState("");
  const [secret, setSecret] = useState("");
  const [setupCode, setSetupCode] = useState("");
  const [setupLoading, setSetupLoading] = useState(false);

  // Disable flow state
  const [showDisable, setShowDisable] = useState(false);
  const [disableForm, setDisableForm] = useState({ code: "", password: "" });
  const [disableLoading, setDisableLoading] = useState(false);

  // --- Enable flow ---
  const handleBeginSetup = async () => {
    setSetupLoading(true);
    try {
      const res = await authAPI.enable2FA();
      if (res?.success && res.data) {
        setQrCode(res.data.qrCode);
        setSecret(res.data.secret);
        setSetupStep(1);
      }
    } catch (err) {
      console.error("enable2FA failed", err);
      toast.error(
        err.response?.data?.error?.message || "Failed to start 2FA setup.",
      );
    } finally {
      setSetupLoading(false);
    }
  };

  const handleConfirmSetup = async (e) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(setupCode)) {
      toast.error("Enter the 6-digit code from your authenticator app.");
      return;
    }
    setSetupLoading(true);
    try {
      await authAPI.verify2FA(setupCode);
      toast.success("Two-factor authentication enabled!");
      setSetupStep(3);
      onProfileUpdate({ mfaEnabled: true });
      setTimeout(() => setSetupStep(0), 1500);
    } catch (err) {
      console.error("verify2FA failed", err);
      toast.error(
        err.response?.data?.error?.message || "Invalid code. Please try again.",
      );
    } finally {
      setSetupLoading(false);
    }
  };

  const handleCancelSetup = () => {
    setSetupStep(0);
    setQrCode("");
    setSecret("");
    setSetupCode("");
  };

  // --- Disable flow ---
  const handleDisable = async (e) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(disableForm.code)) {
      toast.error("Enter the 6-digit code from your authenticator app.");
      return;
    }
    if (!disableForm.password) {
      toast.error("Password is required to disable 2FA.");
      return;
    }
    setDisableLoading(true);
    try {
      await authAPI.disable2FA(disableForm.code, disableForm.password);
      toast.success("Two-factor authentication has been disabled.");
      setShowDisable(false);
      setDisableForm({ code: "", password: "" });
      onProfileUpdate({ mfaEnabled: false });
    } catch (err) {
      console.error("disable2FA failed", err);
      toast.error(
        err.response?.data?.error?.message ||
          "Failed to disable 2FA. Check your code and password.",
      );
    } finally {
      setDisableLoading(false);
    }
  };

  // --- Idle state (2FA already enabled) ---
  if (totpEnabled) {
    return (
      <SectionCard
        title="Two-Factor Authentication"
        description="Your account is protected with a TOTP authenticator app."
      >
        <div className="flex items-center gap-3 p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
          <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-800 flex items-center justify-center flex-shrink-0">
            <svg
              className="w-4 h-4 text-green-600 dark:text-green-300"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-green-800 dark:text-green-200">
              2FA is active
            </p>
            <p className="text-xs text-green-700 dark:text-green-400 mt-0.5">
              Authenticator app codes are required at each new login.
            </p>
          </div>
        </div>

        {!showDisable ? (
          <button
            type="button"
            onClick={() => setShowDisable(true)}
            className={btnDanger}
          >
            Disable 2FA
          </button>
        ) : (
          <form onSubmit={handleDisable} className="space-y-4 pt-2">
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Enter your current authenticator code and account password to
              confirm.
            </p>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Authenticator Code
              </label>
              <input
                type="text"
                inputMode="numeric"
                pattern="\d{6}"
                maxLength={6}
                value={disableForm.code}
                onChange={(e) =>
                  setDisableForm((p) => ({
                    ...p,
                    code: e.target.value.replace(/\D/g, ""),
                  }))
                }
                placeholder="000000"
                className={
                  inputCls + " tracking-widest text-center text-lg font-mono"
                }
                required
              />
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Account Password
              </label>
              <input
                type="password"
                value={disableForm.password}
                onChange={(e) =>
                  setDisableForm((p) => ({ ...p, password: e.target.value }))
                }
                autoComplete="current-password"
                className={inputCls}
                required
              />
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={disableLoading}
                className={btnDanger}
              >
                {disableLoading ? "Disabling…" : "Confirm Disable"}
              </button>
              <button
                type="button"
                disabled={disableLoading}
                onClick={() => {
                  setShowDisable(false);
                  setDisableForm({ code: "", password: "" });
                }}
                className={btnOutline}
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </SectionCard>
    );
  }

  // --- Setup flow ---
  return (
    <SectionCard
      title="Two-Factor Authentication"
      description="Add an extra layer of security with a TOTP authenticator app (Google Authenticator, Authy, etc.)."
    >
      {setupStep === 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
            <svg
              className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <p className="text-sm text-amber-800 dark:text-amber-200">
              2FA is currently <strong>off</strong>. We strongly recommend
              enabling it to protect your account.
            </p>
          </div>
          <button
            type="button"
            onClick={handleBeginSetup}
            disabled={setupLoading}
            className={btnPrimary}
          >
            {setupLoading ? (
              <>
                <svg
                  className="w-4 h-4 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Starting setup…
              </>
            ) : (
              "Enable Two-Factor Authentication"
            )}
          </button>
        </div>
      )}

      {(setupStep === 1 || setupStep === 2) && (
        <div className="space-y-5">
          {/* Step indicators */}
          <div className="flex flex-col gap-2">
            <Step
              n={1}
              active={setupStep === 1}
              done={setupStep > 1}
              label="Scan QR code in your authenticator app"
            />
            <Step
              n={2}
              active={setupStep === 2}
              done={setupStep > 2}
              label="Enter the 6-digit code to confirm"
            />
          </div>

          <Divider />

          {setupStep === 1 && (
            <div className="space-y-4">
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                Open <strong>Google Authenticator</strong>,{" "}
                <strong>Authy</strong>, or any TOTP app and scan the QR code
                below.
              </p>
              {qrCode && (
                <div className="flex justify-center">
                  <img
                    src={qrCode}
                    alt="2FA QR Code"
                    className="w-44 h-44 rounded-lg border border-neutral-200 dark:border-neutral-700 p-2 bg-white"
                  />
                </div>
              )}
              <details className="text-sm">
                <summary className="cursor-pointer text-primary-600 dark:text-primary-400 select-none">
                  Can't scan? Enter the key manually
                </summary>
                <div className="mt-2 px-3 py-2 bg-neutral-100 dark:bg-neutral-900 rounded-lg font-mono text-xs break-all text-neutral-700 dark:text-neutral-300 select-all">
                  {secret}
                </div>
              </details>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setSetupStep(2)}
                  className={btnPrimary}
                >
                  I've scanned it — Continue
                </button>
                <button
                  type="button"
                  onClick={handleCancelSetup}
                  className={btnOutline}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {setupStep === 2 && (
            <form onSubmit={handleConfirmSetup} className="space-y-4">
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                Enter the 6-digit code currently shown in your authenticator
                app.
              </p>
              <input
                type="text"
                inputMode="numeric"
                pattern="\d{6}"
                maxLength={6}
                value={setupCode}
                onChange={(e) =>
                  setSetupCode(e.target.value.replace(/\D/g, ""))
                }
                placeholder="000000"
                autoFocus
                className={
                  inputCls + " tracking-widest text-center text-2xl font-mono"
                }
              />
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={setupLoading}
                  className={btnPrimary}
                >
                  {setupLoading ? "Verifying…" : "Verify & Activate"}
                </button>
                <button
                  type="button"
                  onClick={() => setSetupStep(1)}
                  disabled={setupLoading}
                  className={btnOutline}
                >
                  Back
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {setupStep === 3 && (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
          <svg
            className="w-5 h-5 text-green-600 dark:text-green-400"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
          <p className="text-sm font-semibold text-green-800 dark:text-green-200">
            2FA has been successfully enabled!
          </p>
        </div>
      )}
    </SectionCard>
  );
};

// ---------------------------------------------------------------------------
// Delete Account section
// ---------------------------------------------------------------------------
const DeleteAccountSection = ({ onAccountDeleted }) => {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ password: "", confirmation: "" });
  const [loading, setLoading] = useState(false);

  const REQUIRED_PHRASE = "DELETE_MY_ACCOUNT";
  const canSubmit =
    form.password.length > 0 && form.confirmation === REQUIRED_PHRASE;

  const handleDelete = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    try {
      await userAPI.deleteAccount(form.password, form.confirmation);
      toast.success("Your account has been deleted. Goodbye.");
      onAccountDeleted();
    } catch (err) {
      console.error("Delete account failed", err);
      const msg =
        err.response?.data?.error?.message ||
        "Account deletion failed. Please check your password and try again.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SectionCard
      title="Delete Account"
      description="Permanently remove your account and all associated data."
    >
      <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-800 dark:text-red-300 space-y-1">
        <p className="font-semibold">This action is irreversible.</p>
        <ul className="list-disc list-inside space-y-0.5 text-red-700 dark:text-red-400">
          <li>
            Your profile, transactions, and wallet data will be permanently
            deleted.
          </li>
          <li>Any pending transactions may be cancelled.</li>
          <li>You will be immediately logged out.</li>
        </ul>
      </div>

      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={btnDanger}
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
          Delete My Account
        </button>
      ) : (
        <form onSubmit={handleDelete} className="space-y-4">
          <div className="space-y-1">
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Account Password
            </label>
            <input
              type="password"
              value={form.password}
              onChange={(e) =>
                setForm((p) => ({ ...p, password: e.target.value }))
              }
              autoComplete="current-password"
              className={inputCls}
              required
            />
          </div>
          <div className="space-y-1">
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Type{" "}
              <code className="font-mono text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 px-1 rounded">
                {REQUIRED_PHRASE}
              </code>{" "}
              to confirm
            </label>
            <input
              type="text"
              value={form.confirmation}
              onChange={(e) =>
                setForm((p) => ({ ...p, confirmation: e.target.value }))
              }
              placeholder={REQUIRED_PHRASE}
              autoComplete="off"
              spellCheck={false}
              className={
                inputCls +
                (form.confirmation && form.confirmation !== REQUIRED_PHRASE
                  ? " border-red-400 focus:ring-red-400"
                  : "")
              }
              required
            />
          </div>
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading || !canSubmit}
              className={btnDanger}
            >
              {loading ? "Deleting…" : "Permanently Delete Account"}
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => {
                setOpen(false);
                setForm({ password: "", confirmation: "" });
              }}
              className={btnOutline}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </SectionCard>
  );
};

// ---------------------------------------------------------------------------
// Main Settings page
// ---------------------------------------------------------------------------
const TABS = [
  {
    id: "appearance",
    label: "Appearance",
    icon: "M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z",
  },
  {
    id: "security",
    label: "Security",
    icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
  },
  {
    id: "account",
    label: "Account",
    icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
  },
];

const Settings = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("appearance");
  const [profile, setProfile] = useState(null);

  // Apply stored theme on mount
  useEffect(() => {
    applyTheme(getStoredTheme());
  }, []);

  // Seed 2FA state from user context (updated optimistically when toggled)
  useEffect(() => {
    if (user) {
      setProfile({ mfaEnabled: user.mfaEnabled === true });
    }
  }, [user]);

  const handleProfileUpdate = useCallback((updates) => {
    setProfile((prev) => ({ ...prev, ...updates }));
  }, []);

  const handleAccountDeleted = useCallback(async () => {
    await logout?.();
    navigate("/");
  }, [logout, navigate]);

  const dashboardUser = {
    name: user?.name || user?.email || "User",
    email: user?.email || "",
    avatar: user?.avatar || null,
    role: user?.role || "user",
  };

  return (
    <DashboardLayout user={dashboardUser}>
      <div className="max-w-3xl mx-auto pb-12">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
            Settings
          </h1>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            Manage your preferences and account security.
          </p>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 border-b border-neutral-200 dark:border-neutral-700 mb-6">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-primary-600 text-primary-700 dark:text-primary-400"
                  : "border-transparent text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200"
              }`}
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d={tab.icon}
                />
              </svg>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="space-y-5">
          {activeTab === "appearance" && <AppearanceSection />}

          {activeTab === "security" && (
            <>
              <ChangePasswordSection />
              <TwoFASection
                profile={profile}
                onProfileUpdate={handleProfileUpdate}
              />
            </>
          )}

          {activeTab === "account" && (
            <DeleteAccountSection onAccountDeleted={handleAccountDeleted} />
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Settings;
