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
  Bars3Icon,
  XMarkIcon,
  ArrowRightOnRectangleIcon,
  BellIcon,
  UserCircleIcon,
} from "@heroicons/react/24/outline";

const AdminLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();

  const navigation = [
    {
      name: "Dashboard",
      href: "/dashboard",
      icon: HomeIcon,
    },
    {
      name: "Users",
      href: "/users",
      icon: UsersIcon,
    },
    {
      name: "Transactions",
      href: "/transactions",
      icon: BanknotesIcon,
    },
    {
      name: "Merchants",
      href: "/merchants",
      icon: BuildingStorefrontIcon,
    },
    {
      name: "Cards",
      href: "/cards",
      icon: CreditCardIcon,
    },
    {
      name: "Education",
      href: "/education",
      icon: BookOpenIcon,
    },
    {
      name: "Analytics",
      href: "/analytics",
      icon: ChartBarIcon,
    },
  ];

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar */}
      <div
        className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? "block" : "hidden"}`}
      >
        <div
          className="fixed inset-0 bg-gray-900/80"
          onClick={() => setSidebarOpen(false)}
        />
        <nav className="fixed top-0 left-0 w-64 h-full bg-white shadow-xl">
          <div className="flex h-16 items-center justify-between px-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">A</span>
                </div>
              </div>
              <div className="ml-2">
                <h1 className="text-xl font-bold text-gray-900">AfraPay</h1>
                <p className="text-xs text-gray-500">Admin</p>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="text-gray-400 hover:text-gray-500"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
          <div className="mt-5 flex-1 px-2 space-y-1">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <NavLink
                  key={item.name}
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                    isActive
                      ? "bg-blue-100 text-blue-900"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  <item.icon
                    className={`mr-3 h-5 w-5 flex-shrink-0 ${
                      isActive
                        ? "text-blue-500"
                        : "text-gray-400 group-hover:text-gray-500"
                    }`}
                  />
                  {item.name}
                </NavLink>
              );
            })}
          </div>
        </nav>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:block lg:w-64 lg:bg-white lg:shadow-sm lg:border-r lg:border-gray-200">
        <div className="flex h-16 items-center px-4 border-b border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="h-10 w-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">A</span>
              </div>
            </div>
            <div className="ml-3">
              <h1 className="text-xl font-bold text-gray-900">AfraPay</h1>
              <p className="text-sm text-gray-500">Admin Dashboard</p>
            </div>
          </div>
        </div>
        <nav className="mt-5 flex-1 px-2 space-y-1">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <NavLink
                key={item.name}
                to={item.href}
                className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors ${
                  isActive
                    ? "bg-blue-100 text-blue-900"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                <item.icon
                  className={`mr-3 h-5 w-5 flex-shrink-0 ${
                    isActive
                      ? "text-blue-500"
                      : "text-gray-400 group-hover:text-gray-500"
                  }`}
                />
                {item.name}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Main content */}
      <div className="lg:pl-64 flex flex-col flex-1">
        {/* Top header */}
        <div className="sticky top-0 z-40 flex h-16 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
          <button
            type="button"
            className="-m-2.5 p-2.5 text-gray-700 lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <span className="sr-only">Open sidebar</span>
            <Bars3Icon className="h-6 w-6" />
          </button>

          <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
            <div className="relative flex flex-1">
              <div className="flex items-center">
                <h2 className="text-lg font-semibold text-gray-900">
                  {navigation.find((item) => item.href === location.pathname)
                    ?.name || "Dashboard"}
                </h2>
              </div>
            </div>
            <div className="flex items-center gap-x-4 lg:gap-x-6">
              <button
                type="button"
                className="-m-2.5 p-2.5 text-gray-400 hover:text-gray-500"
              >
                <span className="sr-only">View notifications</span>
                <BellIcon className="h-6 w-6" />
              </button>

              <div className="hidden lg:block lg:h-6 lg:w-px lg:bg-gray-900/10" />

              <div className="flex items-center gap-x-3">
                <div className="flex items-center gap-x-2">
                  <UserCircleIcon className="h-6 w-6 text-gray-400" />
                  <div className="hidden lg:block">
                    <p className="text-sm font-medium text-gray-900">
                      {user?.name || user?.email}
                    </p>
                    <p className="text-xs text-gray-500 capitalize">
                      {user?.role}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="-m-2.5 p-2.5 text-gray-400 hover:text-gray-500"
                  title="Logout"
                >
                  <ArrowRightOnRectangleIcon className="h-6 w-6" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1">
          <div className="py-6">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
