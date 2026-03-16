import React from "react";
import { Outlet } from "react-router-dom";

/**
 * AuthLayout Component
 * Layout for authentication pages (login, register, etc.)
 */
const AuthLayout = () => {
  return (
    <div className="min-h-screen bg-neutral-25 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Logo */}
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-primary-500 rounded-2xl flex items-center justify-center">
            <span className="text-white font-bold text-2xl">AP</span>
          </div>
          <h1 className="mt-4 text-3xl font-bold text-neutral-900">AfraPay</h1>
          <p className="mt-2 text-sm text-neutral-600">
            Secure and fast payments for Africa
          </p>
        </div>

        {/* Content */}
        <div className="bg-white rounded-2xl shadow-lg border border-neutral-200 p-8">
          <Outlet />
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-neutral-500">
          <p>&copy; 2024 AfraPay. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
};

export { AuthLayout };
