/* eslint-disable no-console */
import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  Lock,
  Smartphone,
  Key,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertTriangle,
  LogOut,
  Monitor,
  Globe,
  Clock,
  Trash2,
} from "lucide-react";
import { DashboardLayout } from "../components/layout/DashboardLayout";
import { DashboardSection } from "../components/layout/DashboardUtils";
import { Button, Badge } from "../components/ui";
import {
  PageContainer,
  AnimatedSection,
  SectionHeader,
  GlassCard,
} from "../components/ui/PremiumUI";
import { useAuth } from "../contexts/AuthContext";
import { authAPI, userAPI } from "../services/api";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { cn } from "../utils";

/* ── Device icon helper ───────────────────────────────────────────────────── */
function deviceIcon(device) {
  if (/mobile|android|iphone|ipad/i.test(device)) return Smartphone;
  if (/safari|mac/i.test(device)) return Monitor;
  return Globe;
}

/* ── PasswordField ────────────────────────────────────────────────────────── */
function PasswordField({ id, label, value, onChange, error }) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label
        htmlFor={id}
        className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1"
      >
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={show ? "text" : "password"}
          value={value}
          onChange={onChange}
          autoComplete="off"
          className={cn(
            "w-full px-3 py-2.5 pr-10 rounded-xl border text-sm bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white",
            "focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors",
            error
              ? "border-red-400"
              : "border-neutral-200 dark:border-neutral-600",
          )}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
          tabIndex={-1}
          aria-label={show ? "Hide password" : "Show password"}
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

/* ── ToggleRow ────────────────────────────────────────────────────────────── */
function ToggleRow({
  icon: Icon,
  iconBg,
  iconColor,
  title,
  subtitle,
  checked,
  onChange,
  disabled,
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-neutral-100 dark:border-neutral-700/50 last:border-0">
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "w-9 h-9 rounded-xl flex items-center justify-center shrink-0",
            iconBg,
          )}
        >
          <Icon className={cn("w-4 h-4", iconColor)} />
        </div>
        <div>
          <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">
            {title}
          </p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            {subtitle}
          </p>
        </div>
      </div>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => !disabled && onChange(!checked)}
        disabled={disabled}
        className={cn(
          "relative w-11 h-6 rounded-full transition-colors duration-200 shrink-0",
          checked ? "bg-blue-600" : "bg-neutral-200 dark:bg-neutral-600",
          disabled && "opacity-50 cursor-not-allowed",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200",
            checked ? "translate-x-5" : "translate-x-0.5",
          )}
        />
      </button>
    </div>
  );
}

/* ── Main Page ────────────────────────────────────────────────────────────── */
const AccountSecurity = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  /* ── Password change state ──────────────────────────────────────────────── */
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [pwdErrors, setPwdErrors] = useState({});
  const [pwdSuccess, setPwdSuccess] = useState(false);
  const [pwdLoading, setPwdLoading] = useState(false);

  /* ── 2FA + security toggles ─────────────────────────────────────────────── */
  const [twoFA, setTwoFA] = useState(false);
  const [loginAlerts, setLoginAlerts] = useState(false);
  const [txAlerts, setTxAlerts] = useState(false);

  /* ── Security settings loading ──────────────────────────────────────────── */
  const [settingsLoading, setSettingsLoading] = useState(true);

  /* ── 2FA setup flow ─────────────────────────────────────────────────────── */
  const [twoFASetupStep, setTwoFASetupStep] = useState(0); // 0=idle,1=qr,2=confirm,3=done
  const [twoFAQrCode, setTwoFAQrCode] = useState("");
  const [twoFASecret, setTwoFASecret] = useState("");
  const [twoFASetupCode, setTwoFASetupCode] = useState("");
  const [twoFASetupLoading, setTwoFASetupLoading] = useState(false);

  /* ── 2FA disable flow ───────────────────────────────────────────────────── */
  const [showDisable2FA, setShowDisable2FA] = useState(false);
  const [disable2FACode, setDisable2FACode] = useState("");
  const [disable2FAPassword, setDisable2FAPassword] = useState("");
  const [disable2FALoading, setDisable2FALoading] = useState(false);

  /* ── Sessions ───────────────────────────────────────────────────────────── */
  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [sessionsError, setSessionsError] = useState(null);
  const [revoking, setRevoking] = useState(null);

  const loadSessions = useCallback(async () => {
    setSessionsLoading(true);
    setSessionsError(null);
    try {
      const res = await userAPI.getSessions();
      setSessions(res?.data?.data ?? res?.data ?? []);
    } catch (err) {
      setSessionsError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to load sessions.",
      );
    } finally {
      setSessionsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const loadSecuritySettings = useCallback(async () => {
    setSettingsLoading(true);
    try {
      const res = await userAPI.getSecuritySettings();
      const data = res?.data?.data ?? res?.data ?? {};
      setTwoFA(data.mfaEnabled === true);
      setLoginAlerts(data.loginAlerts === true);
      setTxAlerts(data.transactionAlerts === true);
    } catch (err) {
      console.error("Failed to load security settings:", err);
    } finally {
      setSettingsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSecuritySettings();
  }, [loadSecuritySettings]);

  const dashboardUser = {
    name: user?.name || user?.email || "User",
    email: user?.email || "",
    avatar: user?.avatar || null,
  };

  /* ── Password strength ──────────────────────────────────────────────────── */
  const getStrength = (pwd) => {
    if (!pwd) return { score: 0, label: "", color: "" };
    let score = 0;
    if (pwd.length >= 8) score++;
    if (pwd.length >= 12) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    if (score <= 1) return { score, label: "Weak", color: "bg-red-400" };
    if (score <= 3) return { score, label: "Fair", color: "bg-amber-400" };
    return { score, label: "Strong", color: "bg-emerald-500" };
  };

  const strength = getStrength(newPwd);

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!currentPwd) errs.current = "Current password is required.";
    if (!newPwd || newPwd.length < 8)
      errs.new = "Minimum 8 characters required.";
    if (strength.score < 2) errs.new = "Please choose a stronger password.";
    if (newPwd !== confirmPwd) errs.confirm = "Passwords do not match.";
    if (Object.keys(errs).length) {
      setPwdErrors(errs);
      return;
    }

    setPwdLoading(true);
    setPwdErrors({});
    // Simulate API call
    await new Promise((r) => setTimeout(r, 1200));
    setPwdLoading(false);
    setPwdSuccess(true);
    setCurrentPwd("");
    setNewPwd("");
    setConfirmPwd("");
    setTimeout(() => setPwdSuccess(false), 4000);
  };

  const revokeSession = async (id, isCurrent = false) => {
    setRevoking(id);
    try {
      const res = await userAPI.revokeSession(id);
      const data = res?.data?.data ?? res?.data;
      if (isCurrent || data?.loggedOut) {
        // Current session revoked — log out and redirect
        await logout();
        navigate("/auth/login");
        return;
      }
      setSessions((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      console.error(
        "Revoke session failed:",
        err?.response?.data?.message || err?.message,
      );
    } finally {
      setRevoking(null);
    }
  };

  const revokeAll = async () => {
    setRevoking("all");
    try {
      await userAPI.revokeAllSessions();
      setSessions((prev) => prev.filter((s) => s.current));
    } catch (err) {
      console.error(
        "Revoke all sessions failed:",
        err?.response?.data?.message || err?.message,
      );
    } finally {
      setRevoking(null);
    }
  };

  /* ── 2FA handlers ─────────────────────────────────────────────────────── */
  const handleTwoFAToggle = async (newVal) => {
    if (newVal) {
      setTwoFASetupLoading(true);
      try {
        const res = await authAPI.enable2FA();
        const data = res?.data?.data ?? res?.data;
        if (data?.qrCode) {
          setTwoFAQrCode(data.qrCode);
          setTwoFASecret(data.secret || "");
          setTwoFASetupStep(1);
        }
      } catch (err) {
        toast.error(
          err?.response?.data?.error?.message || "Failed to start 2FA setup.",
        );
      } finally {
        setTwoFASetupLoading(false);
      }
    } else {
      setShowDisable2FA(true);
    }
  };

  const handleConfirmSetup = async (e) => {
    e.preventDefault();
    if (twoFASetupCode.length !== 6) return;
    setTwoFASetupLoading(true);
    try {
      await authAPI.verify2FA(twoFASetupCode);
      setTwoFA(true);
      setTwoFASetupStep(3);
      toast.success("Two-factor authentication enabled!");
      setTimeout(() => {
        setTwoFASetupStep(0);
        setTwoFAQrCode("");
        setTwoFASecret("");
        setTwoFASetupCode("");
      }, 2000);
    } catch (err) {
      toast.error(
        err?.response?.data?.error?.message ||
          "Invalid code. Please try again.",
      );
    } finally {
      setTwoFASetupLoading(false);
    }
  };

  const handleCancelSetup = () => {
    setTwoFASetupStep(0);
    setTwoFAQrCode("");
    setTwoFASecret("");
    setTwoFASetupCode("");
  };

  const handleDisable2FA = async (e) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(disable2FACode) || !disable2FAPassword) return;
    setDisable2FALoading(true);
    try {
      await authAPI.disable2FA(disable2FACode, disable2FAPassword);
      setTwoFA(false);
      setShowDisable2FA(false);
      setDisable2FACode("");
      setDisable2FAPassword("");
      toast.success("Two-factor authentication disabled.");
    } catch (err) {
      toast.error(
        err?.response?.data?.error?.message ||
          "Failed to disable 2FA. Check your code and password.",
      );
    } finally {
      setDisable2FALoading(false);
    }
  };

  /* ── Alert toggle handlers ────────────────────────────────────────────── */
  const handleLoginAlertsToggle = async (newVal) => {
    setLoginAlerts(newVal);
    try {
      await userAPI.updateSecuritySettings({ loginAlerts: newVal });
      toast.success(`Login alerts ${newVal ? "enabled" : "disabled"}.`);
    } catch (err) {
      setLoginAlerts(!newVal);
      toast.error("Failed to update login alerts.");
    }
  };

  const handleTxAlertsToggle = async (newVal) => {
    setTxAlerts(newVal);
    try {
      await userAPI.updateSecuritySettings({ transactionAlerts: newVal });
      toast.success(`Transaction alerts ${newVal ? "enabled" : "disabled"}.`);
    } catch (err) {
      setTxAlerts(!newVal);
      toast.error("Failed to update transaction alerts.");
    }
  };

  return (
    <DashboardLayout user={dashboardUser}>
      <PageContainer>
        {/* Header */}
        <AnimatedSection>
          <SectionHeader
            title="Security"
            subtitle="Manage your password, two-factor authentication, and active sessions"
            icon={<Shield className="w-6 h-6" />}
            className="mb-6"
          />
        </AnimatedSection>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            {/* Change Password */}
            <AnimatedSection delay={0.05}>
              <DashboardSection
                title="Change Password"
                description="Use a strong, unique password you don't use elsewhere"
              >
                <form onSubmit={handlePasswordChange} className="space-y-4">
                  <PasswordField
                    id="current-pwd"
                    label="Current Password"
                    value={currentPwd}
                    onChange={(e) => setCurrentPwd(e.target.value)}
                    error={pwdErrors.current}
                  />
                  <PasswordField
                    id="new-pwd"
                    label="New Password"
                    value={newPwd}
                    onChange={(e) => setNewPwd(e.target.value)}
                    error={pwdErrors.new}
                  />

                  {/* Strength bar */}
                  {newPwd && (
                    <div>
                      <div className="flex gap-1 mb-1">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <div
                            key={i}
                            className={cn(
                              "flex-1 h-1.5 rounded-full transition-all",
                              i <= strength.score
                                ? strength.color
                                : "bg-neutral-200 dark:bg-neutral-700",
                            )}
                          />
                        ))}
                      </div>
                      <p className="text-xs text-neutral-400">
                        Password strength:{" "}
                        <span
                          className={cn(
                            "font-semibold",
                            strength.score <= 1
                              ? "text-red-500"
                              : strength.score <= 3
                                ? "text-amber-500"
                                : "text-emerald-500",
                          )}
                        >
                          {strength.label}
                        </span>
                      </p>
                    </div>
                  )}

                  <PasswordField
                    id="confirm-pwd"
                    label="Confirm New Password"
                    value={confirmPwd}
                    onChange={(e) => setConfirmPwd(e.target.value)}
                    error={pwdErrors.confirm}
                  />

                  <AnimatePresence>
                    {pwdSuccess && (
                      <motion.div
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="flex items-center gap-2 text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 px-3 py-2 rounded-xl text-sm"
                      >
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        Password updated successfully.
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <Button
                    type="submit"
                    variant="primary"
                    className="flex items-center gap-2"
                    disabled={pwdLoading}
                  >
                    {pwdLoading ? (
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Key className="w-4 h-4" />
                    )}
                    {pwdLoading ? "Updating…" : "Update Password"}
                  </Button>
                </form>
              </DashboardSection>
            </AnimatedSection>

            {/* Active Sessions */}
            <AnimatedSection delay={0.1}>
              <DashboardSection
                title="Active Sessions"
                description="Devices currently signed in to your account"
                action={
                  sessions.filter((s) => !s.current).length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={revokeAll}
                      disabled={revoking === "all"}
                      className="flex items-center gap-1.5 text-red-500 border-red-200 hover:bg-red-50 dark:hover:bg-red-900/20 text-xs"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      {revoking === "all"
                        ? "Signing out…"
                        : "Sign Out All Others"}
                    </Button>
                  )
                }
              >
                <div className="space-y-3">
                  {sessionsLoading && (
                    <div className="space-y-2">
                      {[1, 2].map((i) => (
                        <div
                          key={i}
                          className="flex items-center gap-3 p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 animate-pulse"
                        >
                          <div className="w-9 h-9 rounded-xl bg-neutral-200 dark:bg-neutral-700 shrink-0" />
                          <div className="flex-1 space-y-1.5">
                            <div className="h-3 bg-neutral-200 dark:bg-neutral-700 rounded w-40" />
                            <div className="h-2.5 bg-neutral-200 dark:bg-neutral-700 rounded w-56" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {sessionsError && !sessionsLoading && (
                    <div className="flex items-center gap-2 text-sm text-red-500 py-2">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      {sessionsError}
                      <button
                        onClick={loadSessions}
                        className="underline text-xs ml-1"
                      >
                        Retry
                      </button>
                    </div>
                  )}

                  {!sessionsLoading &&
                    !sessionsError &&
                    sessions.map((session) => {
                      const Icon = deviceIcon(session.device);
                      const lastActiveText = session.current
                        ? "Active now"
                        : session.lastActive
                          ? new Date(session.lastActive).toLocaleString()
                          : "—";
                      return (
                        <div
                          key={session.id}
                          className={cn(
                            "flex items-center gap-3 p-3 rounded-xl",
                            session.current
                              ? "bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-700/40"
                              : "bg-neutral-50 dark:bg-neutral-800/50",
                          )}
                        >
                          <div
                            className={cn(
                              "w-9 h-9 rounded-xl flex items-center justify-center shrink-0",
                              session.current
                                ? "bg-blue-100 dark:bg-blue-900/40"
                                : "bg-neutral-100 dark:bg-neutral-700",
                            )}
                          >
                            <Icon
                              className={cn(
                                "w-4 h-4",
                                session.current
                                  ? "text-blue-600 dark:text-blue-400"
                                  : "text-neutral-500",
                              )}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100 truncate">
                                {session.device}
                              </p>
                              {session.current && (
                                <Badge variant="success" size="sm">
                                  Current
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-neutral-400 flex items-center gap-2 mt-0.5">
                              <span>{session.ip}</span>
                              <span>·</span>
                              <Clock className="w-3 h-3 inline" />
                              <span>{lastActiveText}</span>
                            </p>
                          </div>
                          {!session.current && (
                            <button
                              onClick={() => revokeSession(session.id, false)}
                              disabled={revoking === session.id}
                              className="p-1.5 rounded-lg text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors shrink-0"
                              title="Sign out this session"
                            >
                              {revoking === session.id ? (
                                <span className="w-3.5 h-3.5 border-2 border-neutral-300 border-t-red-400 rounded-full animate-spin block" />
                              ) : (
                                <Trash2 className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}
                          {session.current && (
                            <button
                              onClick={() => revokeSession(session.id, true)}
                              disabled={revoking === session.id}
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-red-500 border border-red-200 hover:bg-red-50 dark:hover:bg-red-900/30 dark:border-red-800 transition-colors shrink-0"
                              title="Sign out of this device"
                            >
                              {revoking === session.id ? (
                                <span className="w-3 h-3 border-2 border-red-300 border-t-red-500 rounded-full animate-spin" />
                              ) : (
                                <LogOut className="w-3 h-3" />
                              )}
                              Sign out
                            </button>
                          )}
                        </div>
                      );
                    })}
                </div>
              </DashboardSection>
            </AnimatedSection>
          </div>

          {/* Right column */}
          <div className="flex flex-col gap-6">
            {/* Security toggles */}
            <AnimatedSection delay={0.08}>
              <GlassCard className="p-5">
                <p className="text-sm font-bold text-neutral-800 dark:text-neutral-100 mb-1 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-blue-500" />
                  Security Settings
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-4">
                  Configure your account protection options.
                </p>
                <div>
                  <ToggleRow
                    icon={Smartphone}
                    iconBg="bg-blue-100 dark:bg-blue-900/40"
                    iconColor="text-blue-600 dark:text-blue-400"
                    title="Two-Factor Authentication"
                    subtitle="Require OTP on every login"
                    checked={twoFA}
                    onChange={handleTwoFAToggle}
                    disabled={
                      settingsLoading ||
                      twoFASetupLoading ||
                      twoFASetupStep > 0 ||
                      showDisable2FA
                    }
                  />
                  <ToggleRow
                    icon={AlertTriangle}
                    iconBg="bg-amber-100 dark:bg-amber-900/40"
                    iconColor="text-amber-600 dark:text-amber-400"
                    title="Login Alerts"
                    subtitle="Notify me on new sign-ins"
                    checked={loginAlerts}
                    onChange={handleLoginAlertsToggle}
                    disabled={settingsLoading}
                  />
                  <ToggleRow
                    icon={Shield}
                    iconBg="bg-emerald-100 dark:bg-emerald-900/40"
                    iconColor="text-emerald-600 dark:text-emerald-400"
                    title="Transaction Alerts"
                    subtitle="Notify me on every payment"
                    checked={txAlerts}
                    onChange={handleTxAlertsToggle}
                    disabled={settingsLoading}
                  />
                </div>
              </GlassCard>
            </AnimatedSection>

            {/* Security score */}
            <AnimatedSection delay={0.12}>
              <GlassCard className="p-5">
                <p className="text-sm font-bold text-neutral-800 dark:text-neutral-100 mb-3 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-emerald-500" />
                  Security Score
                </p>
                {(() => {
                  const score =
                    (twoFA ? 40 : 0) +
                    (loginAlerts ? 30 : 0) +
                    (txAlerts ? 30 : 0);
                  const label =
                    score >= 80 ? "Strong" : score >= 50 ? "Fair" : "Weak";
                  const color =
                    score >= 80
                      ? "text-emerald-600"
                      : score >= 50
                        ? "text-amber-600"
                        : "text-red-500";
                  const bar =
                    score >= 80
                      ? "bg-emerald-500"
                      : score >= 50
                        ? "bg-amber-400"
                        : "bg-red-400";
                  return (
                    <>
                      <div className="flex items-end justify-between mb-2">
                        <span className={cn("text-3xl font-bold", color)}>
                          {score}
                        </span>
                        <span
                          className={cn("text-sm font-semibold mb-1", color)}
                        >
                          {label}
                        </span>
                      </div>
                      <div className="w-full bg-neutral-100 dark:bg-neutral-700 rounded-full h-2 mb-4">
                        <motion.div
                          className={cn("h-2 rounded-full", bar)}
                          initial={{ width: 0 }}
                          animate={{ width: `${score}%` }}
                          transition={{ duration: 0.6, ease: "easeOut" }}
                        />
                      </div>
                      <div className="space-y-1.5 text-xs text-neutral-500 dark:text-neutral-400">
                        {[
                          { label: "Two-Factor Auth", done: twoFA },
                          { label: "Login Alerts", done: loginAlerts },
                          { label: "Transaction Alerts", done: txAlerts },
                        ].map((item) => (
                          <div
                            key={item.label}
                            className="flex items-center gap-2"
                          >
                            <CheckCircle2
                              className={cn(
                                "w-3.5 h-3.5 shrink-0",
                                item.done
                                  ? "text-emerald-500"
                                  : "text-neutral-300 dark:text-neutral-600",
                              )}
                            />
                            <span
                              className={
                                item.done
                                  ? "text-neutral-700 dark:text-neutral-300"
                                  : ""
                              }
                            >
                              {item.label}
                            </span>
                          </div>
                        ))}
                      </div>
                    </>
                  );
                })()}
              </GlassCard>
            </AnimatedSection>

            {/* Trusted info */}
            <AnimatedSection delay={0.15}>
              <GlassCard className="p-4 bg-blue-50 dark:bg-blue-900/20">
                <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-1">
                  AfraPay Security Guarantee
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-400 leading-relaxed">
                  All data is encrypted with AES-256. We are PCI DSS Level 1
                  certified and ISO 27001 compliant.
                </p>
              </GlassCard>
            </AnimatedSection>
          </div>
        </div>
      </PageContainer>

      {/* ── 2FA Setup Modal ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {twoFASetupStep > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-neutral-800 rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-5"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-blue-500" />
                  Set Up Two-Factor Auth
                </h2>
                {twoFASetupStep !== 3 && (
                  <button
                    onClick={handleCancelSetup}
                    className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
                    aria-label="Close"
                  >
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
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                )}
              </div>

              {twoFASetupStep === 1 && (
                <div className="space-y-4">
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">
                    Open <strong>Google Authenticator</strong>,{" "}
                    <strong>Authy</strong>, or any TOTP app and scan the QR code
                    below.
                  </p>
                  {twoFAQrCode && (
                    <div className="flex justify-center">
                      <img
                        src={twoFAQrCode}
                        alt="2FA QR Code"
                        className="w-40 h-40 rounded-xl border border-neutral-200 dark:border-neutral-700 p-2 bg-white"
                      />
                    </div>
                  )}
                  <details className="text-sm">
                    <summary className="cursor-pointer text-blue-600 dark:text-blue-400 select-none">
                      Can&apos;t scan? Enter key manually
                    </summary>
                    <div className="mt-2 px-3 py-2 bg-neutral-100 dark:bg-neutral-900 rounded-lg font-mono text-xs break-all text-neutral-700 dark:text-neutral-300 select-all">
                      {twoFASecret}
                    </div>
                  </details>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setTwoFASetupStep(2)}
                      className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors"
                    >
                      I&apos;ve scanned it — Continue
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelSetup}
                      className="px-4 py-2.5 border border-neutral-200 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 text-sm font-semibold rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {twoFASetupStep === 2 && (
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
                    value={twoFASetupCode}
                    onChange={(e) =>
                      setTwoFASetupCode(e.target.value.replace(/\D/g, ""))
                    }
                    placeholder="000000"
                    autoFocus
                    className="w-full px-4 py-3 border border-neutral-200 dark:border-neutral-600 rounded-xl text-center text-2xl font-mono tracking-widest bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="flex gap-3">
                    <button
                      type="submit"
                      disabled={
                        twoFASetupLoading || twoFASetupCode.length !== 6
                      }
                      className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
                    >
                      {twoFASetupLoading && (
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      )}
                      {twoFASetupLoading ? "Verifying…" : "Verify & Activate"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setTwoFASetupStep(1)}
                      disabled={twoFASetupLoading}
                      className="px-4 py-2.5 border border-neutral-200 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 text-sm font-semibold rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
                    >
                      Back
                    </button>
                  </div>
                </form>
              )}

              {twoFASetupStep === 3 && (
                <div className="flex flex-col items-center gap-3 py-4">
                  <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                  </div>
                  <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100 text-center">
                    2FA successfully enabled!
                  </p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 text-center">
                    Your account is now protected with two-factor
                    authentication.
                  </p>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 2FA Disable Modal ────────────────────────────────────────────── */}
      <AnimatePresence>
        {showDisable2FA && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-neutral-800 rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-5"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
                  Disable 2FA
                </h2>
                <button
                  onClick={() => {
                    setShowDisable2FA(false);
                    setDisable2FACode("");
                    setDisable2FAPassword("");
                  }}
                  className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
                  aria-label="Close"
                >
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
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                Enter your current authenticator code and account password to
                confirm disabling 2FA.
              </p>

              <form onSubmit={handleDisable2FA} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Authenticator Code
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="\d{6}"
                    maxLength={6}
                    value={disable2FACode}
                    onChange={(e) =>
                      setDisable2FACode(e.target.value.replace(/\D/g, ""))
                    }
                    placeholder="000000"
                    className="w-full px-4 py-3 border border-neutral-200 dark:border-neutral-600 rounded-xl text-center text-lg font-mono tracking-widest bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Account Password
                  </label>
                  <input
                    type="password"
                    value={disable2FAPassword}
                    onChange={(e) => setDisable2FAPassword(e.target.value)}
                    autoComplete="current-password"
                    className="w-full px-3 py-2.5 border border-neutral-200 dark:border-neutral-600 rounded-xl bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={disable2FALoading}
                    className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
                  >
                    {disable2FALoading && (
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    )}
                    {disable2FALoading ? "Disabling…" : "Confirm Disable"}
                  </button>
                  <button
                    type="button"
                    disabled={disable2FALoading}
                    onClick={() => {
                      setShowDisable2FA(false);
                      setDisable2FACode("");
                      setDisable2FAPassword("");
                    }}
                    className="px-4 py-2.5 border border-neutral-200 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 text-sm font-semibold rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
};

export default AccountSecurity;
