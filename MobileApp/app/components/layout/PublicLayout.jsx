import React from "react";
import { Outlet, Link } from "react-router-dom";
import { Container } from "./Layout";

/**
 * PublicLayout Component
 * Layout for public pages (landing, about, etc.)
 */
const PublicLayout = () => {
  return (
    <div className="min-h-screen bg-white">
      {/* Public header */}
      <header className="border-b border-neutral-200">
        <Container>
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">AP</span>
              </div>
              <span className="font-bold text-xl text-neutral-900">
                AfraPay
              </span>
            </div>

            {/* Navigation */}
            <nav className="hidden md:flex items-center space-x-8">
              <a
                href="#features"
                className="text-neutral-600 hover:text-neutral-900"
              >
                Features
              </a>
              <Link
                to="/pricing"
                className="text-neutral-600 hover:text-neutral-900"
              >
                Pricing
              </Link>
              <Link
                to="/about"
                className="text-neutral-600 hover:text-neutral-900"
              >
                About
              </Link>
              <a
                href="#contact"
                className="text-neutral-600 hover:text-neutral-900"
              >
                Contact
              </a>
            </nav>

            {/* Auth buttons */}
            <div className="flex items-center space-x-4">
              <Link
                to="/auth/login"
                className="text-neutral-600 hover:text-neutral-900 font-medium"
              >
                Sign In
              </Link>
              <Link
                to="/auth/register"
                className="bg-primary-500 text-white px-4 py-2 rounded-lg hover:bg-primary-600 font-medium"
              >
                Get Started
              </Link>
            </div>
          </div>
        </Container>
      </header>

      {/* Content */}
      <main>
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-neutral-900 text-white">
        <Container>
          <div className="py-12">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              {/* Company info */}
              <div className="col-span-1 md:col-span-2">
                <div className="flex items-center space-x-2 mb-4">
                  <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-sm">AP</span>
                  </div>
                  <span className="font-bold text-xl">AfraPay</span>
                </div>
                <p className="text-neutral-400 max-w-md">
                  Empowering financial inclusion across Africa with secure,
                  fast, and affordable payment solutions.
                </p>
              </div>

              {/* Links */}
              <div>
                <h3 className="font-semibold mb-4">Product</h3>
                <ul className="space-y-2 text-neutral-400">
                  <li>
                    <a href="#" className="hover:text-white">
                      Features
                    </a>
                  </li>
                  <li>
                    <a href="#" className="hover:text-white">
                      Pricing
                    </a>
                  </li>
                  <li>
                    <a href="#" className="hover:text-white">
                      API
                    </a>
                  </li>
                  <li>
                    <a href="#" className="hover:text-white">
                      Security
                    </a>
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold mb-4">Company</h3>
                <ul className="space-y-2 text-neutral-400">
                  <li>
                    <a href="#" className="hover:text-white">
                      About
                    </a>
                  </li>
                  <li>
                    <a href="#" className="hover:text-white">
                      Careers
                    </a>
                  </li>
                  <li>
                    <a href="#" className="hover:text-white">
                      Blog
                    </a>
                  </li>
                  <li>
                    <a href="#" className="hover:text-white">
                      Contact
                    </a>
                  </li>
                </ul>
              </div>
            </div>

            <div className="border-t border-neutral-800 mt-8 pt-8 text-center text-neutral-400">
              <p>&copy; 2024 AfraPay. All rights reserved.</p>
            </div>
          </div>
        </Container>
      </footer>
    </div>
  );
};

export { PublicLayout };
