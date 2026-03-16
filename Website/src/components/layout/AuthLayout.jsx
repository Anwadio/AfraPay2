import React from "react";
import { Outlet } from "react-router-dom";

/**
 * AuthLayout Component
 * Layout for authentication pages (login, register, etc.)
 */
const AuthLayout = () => {
  return (
    <div className="min-h-screen [height:100svh] bg-gradient-to-br from-primary-900 via-primary-800 to-secondary-700 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 overflow-x-hidden">
      <div className="max-w-md w-full space-y-8">
        {/* Logo */}
        <div className="text-center">
          <img
            src="/mainlogo.png"
            alt="AfraPay"
            className="mx-auto w-36 h-36 object-contain"
          />
          <h1 className="mt-4 text-3xl font-bold text-white">AfraPay</h1>
          <p className="mt-2 text-sm text-primary-200">
            Secure and fast payments for Africa
          </p>
        </div>

        {/* Content */}
        <div className="bg-white rounded-2xl shadow-2xl border-0 p-5 sm:p-8 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary-600 to-secondary-500"></div>
          <Outlet />
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-primary-200">
          <p>&copy; 2026 AfraPay. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
};

export { AuthLayout };
