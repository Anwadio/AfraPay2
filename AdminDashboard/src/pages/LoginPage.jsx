import React, { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import {
  EyeIcon,
  EyeSlashIcon,
  ShieldCheckIcon,
  LockClosedIcon,
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";

const LoginPage = () => {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { user, login } = useAuth();

  // Redirect if already logged in
  if (user && (user.role === "admin" || user.role === "super_admin")) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.email || !formData.password) {
      toast.error("Please fill in all fields");
      return;
    }

    setIsLoading(true);

    try {
      const result = await login(formData);
      if (result.success) {
        // Navigation will be handled by the protected route
      }
    } catch (error) {
      console.error("Login error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* ── Left: Branded panel (desktop only) ── */}
      <div
        className="hidden lg:flex lg:w-[45%] flex-col justify-between p-12 relative overflow-hidden"
        style={{
          background:
            "linear-gradient(150deg, #0f172a 0%, #1e3a8a 55%, #0d9488 100%)",
        }}
      >
        {/* Decorative orbs */}
        <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-white/[0.04]" />
        <div className="absolute bottom-0 -left-20 h-72 w-72 rounded-full bg-white/[0.04]" />

        {/* Logo */}
        <div className="relative flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-white/[0.12] backdrop-blur-sm flex items-center justify-center">
            <span className="text-white font-extrabold text-lg">A</span>
          </div>
          <div>
            <h1 className="text-white font-bold text-[17px] leading-none">
              AfraPay
            </h1>
            <p className="text-white/40 text-[10px] uppercase tracking-[0.18em] mt-0.5">
              Admin Console
            </p>
          </div>
        </div>

        {/* Tagline */}
        <div className="relative space-y-6">
          <div>
            <h2 className="text-white text-3xl font-bold leading-tight">
              Manage your fintech
              <br />
              platform with confidence.
            </h2>
            <p className="mt-3 text-white/55 text-sm leading-relaxed max-w-xs">
              Real-time control over users, transactions, compliance, and fraud
              detection — all in one place.
            </p>
          </div>

          <div className="space-y-3">
            {[
              { icon: ShieldCheckIcon, label: "Role-based access control" },
              { icon: LockClosedIcon, label: "AES-256 encrypted sessions" },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-3">
                <div className="h-7 w-7 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                  <Icon className="h-3.5 w-3.5 text-white/60" />
                </div>
                <span className="text-sm text-white/60">{label}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-white/25 text-xs">
          © {new Date().getFullYear()} AfraPay. All rights reserved.
        </p>
      </div>

      {/* ── Right: Login form ── */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 bg-slate-50">
        <div className="w-full max-w-sm animate-fade-in">
          {/* Mobile logo */}
          <div className="lg:hidden flex flex-col items-center mb-10">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center shadow-feature mb-3">
              <span className="text-white font-extrabold text-xl">A</span>
            </div>
            <h1 className="text-xl font-bold text-slate-900">AfraPay Admin</h1>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
              Sign in
            </h2>
            <p className="mt-1.5 text-sm text-slate-500">
              Enter your admin credentials to continue
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label htmlFor="email" className="label">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="admin@afrapay.com"
                value={formData.email}
                onChange={handleChange}
                className="input"
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="label">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  className="input pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center px-3.5 text-slate-400 hover:text-slate-600 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeSlashIcon
                      style={{ height: "1.0625rem", width: "1.0625rem" }}
                    />
                  ) : (
                    <EyeIcon
                      style={{ height: "1.0625rem", width: "1.0625rem" }}
                    />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full justify-center mt-2"
            >
              {isLoading ? (
                <>
                  <span className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in…
                </>
              ) : (
                "Sign in to Admin"
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-xs text-slate-400">
            Admin access only. Contact your system administrator if you need
            access.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
