/* eslint-disable no-console */
import React, { useState } from "react";
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
import { cn } from "../utils";

/* ── Demo session data ────────────────────────────────────────────────────── */
const DEMO_SESSIONS = [
  {
    id: "s1",
    device: "Chrome on Windows",
    location: "Accra, Ghana",
    ip: "105.113.xx.xx",
    lastActive: "Active now",
    current: true,
    icon: Monitor,
  },
  {
    id: "s2",
    device: "Safari on iPhone",
    location: "Lagos, Nigeria",
    ip: "197.210.xx.xx",
    lastActive: "2 hours ago",
    current: false,
    icon: Smartphone,
  },
  {
    id: "s3",
    device: "Firefox on macOS",
    location: "London, UK",
    ip: "86.182.xx.xx",
    lastActive: "3 days ago",
    current: false,
    icon: Globe,
  },
];

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
        onClick={() => onChange(!checked)}
        className={cn(
          "relative w-11 h-6 rounded-full transition-colors duration-200 shrink-0",
          checked ? "bg-blue-600" : "bg-neutral-200 dark:bg-neutral-600",
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
  const { user } = useAuth();

  /* ── Password change state ──────────────────────────────────────────────── */
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [pwdErrors, setPwdErrors] = useState({});
  const [pwdSuccess, setPwdSuccess] = useState(false);
  const [pwdLoading, setPwdLoading] = useState(false);

  /* ── 2FA + security toggles ─────────────────────────────────────────────── */
  const [twoFA, setTwoFA] = useState(false);
  const [loginAlerts, setLoginAlerts] = useState(true);
  const [txAlerts, setTxAlerts] = useState(true);

  /* ── Sessions ───────────────────────────────────────────────────────────── */
  const [sessions, setSessions] = useState(DEMO_SESSIONS);
  const [revoking, setRevoking] = useState(null);

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

  const revokeSession = async (id) => {
    setRevoking(id);
    await new Promise((r) => setTimeout(r, 800));
    setSessions((prev) => prev.filter((s) => s.id !== id));
    setRevoking(null);
  };

  const revokeAll = async () => {
    setRevoking("all");
    await new Promise((r) => setTimeout(r, 1000));
    setSessions((prev) => prev.filter((s) => s.current));
    setRevoking(null);
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
                  {sessions.map((session) => {
                    const Icon = session.icon;
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
                            <span>{session.location}</span>
                            <span>·</span>
                            <span>{session.ip}</span>
                            <span>·</span>
                            <Clock className="w-3 h-3 inline" />
                            <span>{session.lastActive}</span>
                          </p>
                        </div>
                        {!session.current && (
                          <button
                            onClick={() => revokeSession(session.id)}
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
                    onChange={setTwoFA}
                  />
                  <ToggleRow
                    icon={AlertTriangle}
                    iconBg="bg-amber-100 dark:bg-amber-900/40"
                    iconColor="text-amber-600 dark:text-amber-400"
                    title="Login Alerts"
                    subtitle="Notify me on new sign-ins"
                    checked={loginAlerts}
                    onChange={setLoginAlerts}
                  />
                  <ToggleRow
                    icon={Shield}
                    iconBg="bg-emerald-100 dark:bg-emerald-900/40"
                    iconColor="text-emerald-600 dark:text-emerald-400"
                    title="Transaction Alerts"
                    subtitle="Notify me on every payment"
                    checked={txAlerts}
                    onChange={setTxAlerts}
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
    </DashboardLayout>
  );
};

export default AccountSecurity;
