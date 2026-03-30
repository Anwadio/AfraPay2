import React, { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import {
  HomeIcon,
  UsersIcon,
  CreditCardIcon,
  BanknotesIcon,
  BuildingStorefrontIcon,
  BookOpenIcon,
  ChartBarIcon,
  ClipboardDocumentListIcon,
  ShieldExclamationIcon,
  CurrencyDollarIcon,
  Bars3Icon,
  ArrowRightOnRectangleIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";
import AdminNotifications from "../UI/AdminNotifications";

const NAVIGATION = [
  { name: "Dashboard", href: "/dashboard", icon: HomeIcon },
  { name: "Users", href: "/users", icon: UsersIcon },
  { name: "Transactions", href: "/transactions", icon: BanknotesIcon },
  { name: "Merchants", href: "/merchants", icon: BuildingStorefrontIcon },
  { name: "Cards", href: "/cards", icon: CreditCardIcon },
  { name: "Subscriptions", href: "/subscriptions", icon: CurrencyDollarIcon },
  { name: "Education", href: "/education", icon: BookOpenIcon },
  { name: "Analytics", href: "/analytics", icon: ChartBarIcon },
  { name: "Audit Logs", href: "/audit-logs", icon: ClipboardDocumentListIcon },
  {
    name: "Fraud Monitor",
    href: "/fraud-monitoring",
    icon: ShieldExclamationIcon,
  },
];

const AdminLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();

  const currentPage =
    NAVIGATION.find((n) => n.href === location.pathname)?.name || "Dashboard";

  const userInitials = (user?.name || user?.email || "A")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const handleLogout = async () => {
    await logout();
  };

  /* ── Shared sidebar pieces ── */
  const LogoArea = (
    <div className="flex h-16 items-center px-5 border-b border-white/[0.08] flex-shrink-0">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg flex-shrink-0">
          <span className="text-white font-extrabold text-base tracking-tight">
            A
          </span>
        </div>
        <div>
          <h1 className="text-white font-bold text-[15px] leading-tight tracking-tight">
            AfraPay
          </h1>
          <p className="text-blue-400/70 text-[9px] font-semibold uppercase tracking-[0.18em]">
            Admin Console
          </p>
        </div>
      </div>
    </div>
  );

  const NavItems = ({ onItemClick = () => {} }) => (
    <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto sidebar-scroll">
      {NAVIGATION.map((item) => {
        const isActive = location.pathname === item.href;
        return (
          <NavLink
            key={item.name}
            to={item.href}
            onClick={onItemClick}
            className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
              isActive
                ? "bg-white/[0.12] text-white"
                : "text-slate-400 hover:bg-white/[0.06] hover:text-slate-200"
            }`}
          >
            <item.icon
              style={{ width: "1.0625rem", height: "1.0625rem" }}
              className={`flex-shrink-0 transition-colors duration-150 ${
                isActive
                  ? "text-blue-400"
                  : "text-slate-500 group-hover:text-slate-300"
              }`}
            />
            <span className="flex-1 leading-none">{item.name}</span>
            {isActive && (
              <span className="h-1.5 w-1.5 rounded-full bg-blue-400 flex-shrink-0" />
            )}
          </NavLink>
        );
      })}
    </nav>
  );

  const UserSection = (
    <div className="px-3 py-4 border-t border-white/[0.08] flex-shrink-0">
      <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/[0.06]">
        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-teal-500 flex items-center justify-center flex-shrink-0 shadow-sm">
          <span className="text-white text-xs font-bold">{userInitials}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-medium leading-none truncate">
            {user?.name || user?.email}
          </p>
          <p className="text-slate-400 text-xs capitalize mt-1 leading-none truncate">
            {user?.role}
          </p>
        </div>
        <button
          onClick={handleLogout}
          title="Sign out"
          className="text-slate-500 hover:text-red-400 transition-colors p-1 rounded-lg hover:bg-white/[0.05]"
        >
          <ArrowRightOnRectangleIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );

  const SIDEBAR_STYLE = {
    background: "linear-gradient(180deg, #0f172a 0%, #1e293b 100%)",
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#f8fafc" }}>
      {/* ── Mobile backdrop ── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          style={{
            backgroundColor: "rgba(15,23,42,0.55)",
            backdropFilter: "blur(4px)",
            WebkitBackdropFilter: "blur(4px)",
          }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Mobile sidebar ── */}
      <aside
        className="fixed inset-y-0 left-0 z-50 flex w-64 flex-col lg:hidden transition-transform duration-300 ease-out"
        style={{
          ...SIDEBAR_STYLE,
          transform: sidebarOpen ? "translateX(0)" : "translateX(-100%)",
          boxShadow: "4px 0 32px rgba(0,0,0,0.28)",
        }}
      >
        {LogoArea}
        <NavItems onItemClick={() => setSidebarOpen(false)} />
        {UserSection}
      </aside>

      {/* ── Desktop sidebar ── */}
      <aside
        className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:flex lg:w-64 lg:flex-col"
        style={SIDEBAR_STYLE}
      >
        {LogoArea}
        <NavItems />
        {UserSection}
      </aside>

      {/* ── Main area ── */}
      <div className="lg:pl-64 flex flex-col min-h-screen">
        {/* Topbar */}
        <header
          className="sticky top-0 z-30 flex h-16 items-center gap-x-4 border-b border-slate-200/80 px-4 sm:px-6 lg:px-8"
          style={{
            backgroundColor: "rgba(255,255,255,0.9)",
            backdropFilter: "blur(12px) saturate(160%)",
            WebkitBackdropFilter: "blur(12px) saturate(160%)",
          }}
        >
          {/* Hamburger */}
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden -m-2.5 p-2.5 text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <span className="sr-only">Open sidebar</span>
            <Bars3Icon className="h-5 w-5" />
          </button>

          <div className="flex flex-1 items-center justify-between gap-x-4">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm min-w-0">
              <span className="text-slate-400 font-medium hidden sm:block shrink-0">
                AfraPay
              </span>
              <ChevronRightIcon className="h-3 w-3 text-slate-300 hidden sm:block shrink-0" />
              <span className="font-semibold text-slate-900 truncate">
                {currentPage}
              </span>
            </div>

            {/* Right actions */}
            <div className="flex items-center gap-x-2 shrink-0">
              <AdminNotifications />

              <div className="h-5 w-px bg-slate-200 mx-1 hidden lg:block" />

              <div className="hidden lg:flex items-center gap-2.5">
                <div className="h-7 w-7 rounded-xl bg-gradient-to-br from-blue-500 to-teal-500 flex items-center justify-center shadow-sm">
                  <span className="text-white text-[11px] font-bold">
                    {userInitials}
                  </span>
                </div>
                <div className="hidden xl:block leading-none">
                  <p className="text-xs font-semibold text-slate-900 truncate max-w-[120px]">
                    {user?.name || user?.email}
                  </p>
                  <p className="text-[11px] text-slate-400 capitalize mt-0.5">
                    {user?.role}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 py-7 px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl animate-fade-in">{children}</div>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
