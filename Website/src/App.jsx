import React, { useEffect, lazy, Suspense } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { QueryClient, QueryClientProvider } from "react-query";
import { Toaster } from "react-hot-toast";
// Layout components
import { AuthLayout } from "./components/layout/AuthLayout.jsx";
import { PublicLayout } from "./components/layout/PublicLayout.jsx";

// Authentication (small — keep eager for auth-gating to work immediately)
import { AuthProvider } from "./contexts/AuthContext.js";
import { CurrencyProvider } from "./contexts/CurrencyContext.jsx";
import { MerchantProvider } from "./contexts/MerchantContext.jsx";
import ProtectedRoute from "./components/auth/ProtectedRoute.js";
import PublicRoute from "./components/auth/PublicRoute.js";
import FallbackRoute from "./components/auth/FallbackRoute.js";

// i18n — must be imported before any component that uses useTranslation
import "./i18n/index.js";
// Accessibility and i18n providers (LanguageProvider now wraps I18nextProvider)
import { LanguageProvider } from "./utils/accessibility.js";

// Route-level code splitting — each page is a separate chunk
const Dashboard = lazy(() => import("./pages/Dashboard.jsx"));
const TransactionHistory = lazy(() => import("./pages/TransactionHistory.jsx"));
const EducationHub = lazy(() => import("./pages/EducationHub.jsx"));
const Login = lazy(() => import("./pages/auth/Login.jsx"));
const Register = lazy(() => import("./pages/auth/Register.jsx"));
const ResetPassword = lazy(() => import("./pages/auth/ResetPassword.jsx"));
const ResetPasswordConfirm = lazy(
  () => import("./pages/auth/ResetPasswordConfirm.jsx"),
);
const VerifyEmail = lazy(() => import("./pages/auth/VerifyEmail.jsx"));
const Landing = lazy(() => import("./pages/Landing.jsx"));
const Pricing = lazy(() => import("./pages/Pricing.jsx"));
const About = lazy(() => import("./pages/About.jsx"));
const TermsOfService = lazy(() => import("./pages/TermsOfService.jsx"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy.jsx"));
const Profile = lazy(() => import("./pages/Profile.jsx"));
const Settings = lazy(() => import("./pages/Settings.jsx"));
const HelpSupport = lazy(() => import("./pages/HelpSupport.jsx"));
const Wallets = lazy(() => import("./pages/Wallets.jsx"));
const Contact = lazy(() => import("./pages/Contact.jsx"));
const Blog = lazy(() => import("./pages/Blog.jsx"));
const BlogPost = lazy(() => import("./pages/BlogPost.jsx"));
const Security = lazy(() => import("./pages/Security.jsx"));
const AccountSecurity = lazy(() => import("./pages/AccountSecurity.jsx"));
const Careers = lazy(() => import("./pages/Careers.jsx"));
const Cards = lazy(() => import("./pages/Cards.jsx"));
const SendMoney = lazy(() => import("./pages/SendMoney.jsx"));
const Analytics = lazy(() => import("./pages/Analytics.jsx"));
const Notifications = lazy(() => import("./pages/Notifications.jsx"));
const Exchange = lazy(() => import("./pages/Exchange.jsx"));
const PayBills = lazy(() => import("./pages/PayBills.jsx"));
const MerchantDashboard = lazy(() => import("./pages/MerchantDashboard.jsx"));
const Subscriptions = lazy(() => import("./pages/Subscriptions.jsx"));

// ── Bootstrap theme before first render (prevents flash of wrong theme) ────
(function initTheme() {
  const theme = localStorage.getItem("afrapay_theme") || "system";
  const root = document.documentElement;
  if (theme === "dark") {
    root.classList.add("dark");
  } else if (theme === "light") {
    root.classList.remove("dark");
  } else {
    root.classList.toggle(
      "dark",
      window.matchMedia("(prefers-color-scheme: dark)").matches,
    );
  }
})();

// Create a client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes — avoid redundant refetches
      cacheTime: 15 * 60 * 1000, // 15 minutes in-memory cache
      refetchOnWindowFocus: false, // don't refetch just because user alt-tabs
    },
  },
});

function App() {
  // Detect keyboard navigation for accessibility
  useEffect(() => {
    const handleFirstTab = (e) => {
      if (e.key === "Tab") {
        document.body.classList.add("keyboard-navigation");
        window.removeEventListener("keydown", handleFirstTab);
      }
    };

    const handleMouseDown = () => {
      document.body.classList.remove("keyboard-navigation");
    };

    window.addEventListener("keydown", handleFirstTab);
    window.addEventListener("mousedown", handleMouseDown);

    return () => {
      window.removeEventListener("keydown", handleFirstTab);
      window.removeEventListener("mousedown", handleMouseDown);
    };
  }, []);

  // Keep theme in sync with OS preference when user has chosen "system"
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      if ((localStorage.getItem("afrapay_theme") || "system") === "system") {
        document.documentElement.classList.toggle("dark", mq.matches);
      }
    };
    mq.addEventListener("change", handleChange);
    return () => mq.removeEventListener("change", handleChange);
  }, []);

  return (
    <AuthProvider>
      <CurrencyProvider>
        {/* LanguageProvider now wraps react-i18next's I18nextProvider */}
        <LanguageProvider>
          <QueryClientProvider client={queryClient}>
            <MerchantProvider>
              <Router
                future={{
                  v7_relativeSplatPath: true,
                  v7_startTransition: true,
                }}
              >
                <Suspense
                  fallback={
                    <div className="min-h-screen flex items-center justify-center bg-neutral-50">
                      <div
                        className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"
                        aria-label="Loading"
                      />
                    </div>
                  }
                >
                  <Routes>
                    {/* Public routes */}
                    <Route path="/" element={<PublicLayout />}>
                      <Route index element={<Landing />} />
                      <Route path="pricing" element={<Pricing />} />
                      <Route path="about" element={<About />} />
                      <Route path="terms" element={<TermsOfService />} />
                      <Route path="privacy" element={<PrivacyPolicy />} />
                      <Route path="contact" element={<Contact />} />
                      <Route path="blog" element={<Blog />} />
                      <Route path="blog/:id" element={<BlogPost />} />
                      <Route path="security-info" element={<Security />} />
                      <Route path="careers" element={<Careers />} />
                    </Route>

                    {/* Auth routes */}
                    <Route path="/auth" element={<AuthLayout />}>
                      <Route
                        path="login"
                        element={
                          <PublicRoute>
                            <Login />
                          </PublicRoute>
                        }
                      />
                      <Route
                        path="register"
                        element={
                          <PublicRoute>
                            <Register />
                          </PublicRoute>
                        }
                      />
                      <Route
                        path="reset-password"
                        element={<ResetPassword />}
                      />
                      <Route
                        path="reset-password/confirm"
                        element={<ResetPasswordConfirm />}
                      />
                      <Route path="verify-email" element={<VerifyEmail />} />
                    </Route>

                    {/* Legacy auth routes (redirect to new paths) */}
                    <Route
                      path="/login"
                      element={<Navigate to="/auth/login" replace />}
                    />
                    <Route
                      path="/register"
                      element={<Navigate to="/auth/register" replace />}
                    />

                    {/* Protected app routes */}
                    <Route
                      path="/dashboard"
                      element={
                        <ProtectedRoute>
                          <Dashboard />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/transactions"
                      element={
                        <ProtectedRoute>
                          <TransactionHistory />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/education"
                      element={
                        <ProtectedRoute>
                          <EducationHub />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/profile"
                      element={
                        <ProtectedRoute>
                          <Profile />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/settings"
                      element={
                        <ProtectedRoute>
                          <Settings />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/help"
                      element={
                        <ProtectedRoute>
                          <HelpSupport />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/wallets"
                      element={
                        <ProtectedRoute>
                          <Wallets />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/cards"
                      element={
                        <ProtectedRoute>
                          <Cards />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/send"
                      element={
                        <ProtectedRoute>
                          <SendMoney />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/analytics"
                      element={
                        <ProtectedRoute>
                          <Analytics />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/notifications"
                      element={
                        <ProtectedRoute>
                          <Notifications />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/exchange"
                      element={
                        <ProtectedRoute>
                          <Exchange />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/bills"
                      element={
                        <ProtectedRoute>
                          <PayBills />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/security"
                      element={
                        <ProtectedRoute>
                          <AccountSecurity />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/merchant"
                      element={
                        <ProtectedRoute>
                          <MerchantDashboard />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/subscriptions"
                      element={
                        <ProtectedRoute>
                          <Subscriptions />
                        </ProtectedRoute>
                      }
                    />

                    {/* Catch all route - redirect to dashboard if authenticated, otherwise to landing */}
                    <Route path="*" element={<FallbackRoute />} />
                  </Routes>
                </Suspense>

                {/* Toast notifications with accessibility features */}
                <Toaster
                  position="top-right"
                  toastOptions={{
                    duration: 4000,
                    style: {
                      background: "#fff",
                      color: "#374151",
                      borderRadius: "8px",
                      border: "1px solid #e5e7eb",
                      fontSize: "14px",
                    },
                    success: {
                      iconTheme: {
                        primary: "#10b981",
                        secondary: "#fff",
                      },
                    },
                    error: {
                      iconTheme: {
                        primary: "#ef4444",
                        secondary: "#fff",
                      },
                    },
                    // Make toasts focusable for screen readers
                    className:
                      "focus:outline-none focus:ring-2 focus:ring-primary-500",
                    ariaProps: {
                      role: "status",
                      "aria-live": "polite",
                    },
                  }}
                  containerStyle={{
                    zIndex: 9999,
                  }}
                />
              </Router>
            </MerchantProvider>
          </QueryClientProvider>
        </LanguageProvider>
      </CurrencyProvider>
    </AuthProvider>
  );
}

export default App;
