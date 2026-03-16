import React, { useState, useEffect } from "react";
import { Outlet, Link } from "react-router-dom";
import { Container } from "./Layout";

/**
 * PublicLayout Component
 * Layout for public pages (landing, about, etc.)
 */
const PublicLayout = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Close mobile menu on resize to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) setIsMobileMenuOpen(false);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Close mobile menu on route navigation
  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  return (
    <div className="min-h-screen">
      {/* Public header */}
      <header className="bg-gradient-to-r from-primary-900 via-primary-800 to-secondary-800 border-b-2 border-b-secondary-400 sticky top-0 z-40">
        <Container>
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center space-x-2">
              <Link to="/" aria-label="AfraPay – go to homepage">
                <img
                  src="/mainlogo.png"
                  alt="AfraPay logo"
                  className="w-14 h-14 object-contain"
                  width={56}
                  height={56}
                  loading="eager"
                />
              </Link>
              <Link
                to="/"
                className="font-bold text-xl text-white hover:text-primary-100 transition-colors"
              >
                AfraPay
              </Link>
            </div>

            {/* Desktop Navigation */}
            <nav
              className="hidden md:flex items-center space-x-8"
              aria-label="Main navigation"
            >
              <a
                href="#features"
                className="text-primary-100 hover:text-white transition-colors"
              >
                Features
              </a>
              <Link
                to="/pricing"
                className="text-primary-100 hover:text-white transition-colors"
              >
                Pricing
              </Link>
              <Link
                to="/about"
                className="text-primary-100 hover:text-white transition-colors"
              >
                About
              </Link>
              <Link
                to="/contact"
                className="text-primary-100 hover:text-white transition-colors"
              >
                Contact
              </Link>
            </nav>

            {/* Desktop Auth buttons */}
            <div className="hidden md:flex items-center space-x-4">
              <Link
                to="/auth/login"
                className="text-primary-100 hover:text-white font-medium transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/auth/register"
                className="bg-gradient-to-r from-primary-600 to-secondary-600 text-white px-4 py-2 rounded-lg hover:from-primary-700 hover:to-secondary-700 font-medium transition-all shadow-sm hover:shadow-md"
              >
                Get Started
              </Link>
            </div>

            {/* Mobile right side — CTA + hamburger */}
            <div className="flex md:hidden items-center space-x-2">
              <Link
                to="/auth/register"
                className="bg-gradient-to-r from-primary-600 to-secondary-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
              >
                Get Started
              </Link>
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 rounded-lg text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
                aria-expanded={isMobileMenuOpen}
                aria-controls="mobile-menu"
              >
                {isMobileMenuOpen ? (
                  <svg
                    className="w-6 h-6"
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
                ) : (
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </Container>

        {/* Mobile menu dropdown */}
        {isMobileMenuOpen && (
          <div
            id="mobile-menu"
            className="md:hidden bg-gradient-to-b from-primary-800 to-secondary-900 border-t border-primary-700/50 shadow-lg"
          >
            <Container>
              <nav className="py-4 space-y-1" aria-label="Mobile navigation">
                <a
                  href="#features"
                  onClick={closeMobileMenu}
                  className="flex items-center px-3 py-3 rounded-lg text-primary-100 hover:text-white hover:bg-white/10 font-medium transition-colors"
                >
                  Features
                </a>
                <Link
                  to="/pricing"
                  onClick={closeMobileMenu}
                  className="flex items-center px-3 py-3 rounded-lg text-primary-100 hover:text-white hover:bg-white/10 font-medium transition-colors"
                >
                  Pricing
                </Link>
                <Link
                  to="/about"
                  onClick={closeMobileMenu}
                  className="flex items-center px-3 py-3 rounded-lg text-primary-100 hover:text-white hover:bg-white/10 font-medium transition-colors"
                >
                  About
                </Link>
                <Link
                  to="/contact"
                  onClick={closeMobileMenu}
                  className="flex items-center px-3 py-3 rounded-lg text-primary-100 hover:text-white hover:bg-white/10 font-medium transition-colors"
                >
                  Contact
                </Link>
                <div className="pt-2 border-t border-white/10">
                  <Link
                    to="/auth/login"
                    onClick={closeMobileMenu}
                    className="flex items-center px-3 py-3 rounded-lg text-primary-100 hover:text-white hover:bg-white/10 font-medium transition-colors"
                  >
                    Sign In
                  </Link>
                </div>
              </nav>
            </Container>
          </div>
        )}
      </header>

      {/* Content */}
      <main id="main-content" tabIndex={-1}>
        <Outlet />
      </main>

      {/* Footer */}
      <footer
        className="bg-gradient-to-r from-primary-950 to-secondary-950 text-white border-t-4 border-t-secondary-500"
        aria-label="Site footer"
      >
        <Container>
          <div className="py-12">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              {/* Company info */}
              <div className="col-span-1 md:col-span-2">
                <div className="flex items-center space-x-2 mb-4">
                  <img
                    src="/mainlogo.png"
                    alt="AfraPay logo"
                    className="w-14 h-14 object-contain"
                    width={56}
                    height={56}
                    loading="lazy"
                  />
                  <span className="font-bold text-xl">AfraPay</span>
                </div>
                <address className="not-italic">
                  <p className="text-neutral-400 max-w-md not-italic">
                    Empowering financial inclusion across Africa with secure,
                    fast, and affordable payment solutions.
                  </p>
                  <p className="text-neutral-500 text-sm mt-2">
                    Juba City Centre, South Sudan
                  </p>
                  <a
                    href="mailto:support@afrapay.com"
                    className="text-neutral-500 text-sm hover:text-white transition-colors"
                  >
                    support@afrapay.com
                  </a>
                </address>
              </div>

              {/* Links */}
              <div>
                <h3 className="font-semibold mb-4">Product</h3>
                <ul
                  className="space-y-2 text-neutral-400"
                  aria-label="Product links"
                >
                  <li>
                    <Link to="/" className="hover:text-white">
                      Features
                    </Link>
                  </li>
                  <li>
                    <Link to="/pricing" className="hover:text-white">
                      Pricing
                    </Link>
                  </li>
                  <li>
                    <Link to="/" className="hover:text-white">
                      API
                    </Link>
                  </li>
                  <li>
                    <Link to="/security-info" className="hover:text-white">
                      Security
                    </Link>
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold mb-4">Company</h3>
                <ul
                  className="space-y-2 text-neutral-400"
                  aria-label="Company links"
                >
                  <li>
                    <Link to="/about" className="hover:text-white">
                      About
                    </Link>
                  </li>
                  <li>
                    <Link to="/careers" className="hover:text-white">
                      Careers
                    </Link>
                  </li>
                  <li>
                    <Link to="/blog" className="hover:text-white">
                      Blog
                    </Link>
                  </li>
                  <li>
                    <Link to="/contact" className="hover:text-white">
                      Contact
                    </Link>
                  </li>
                </ul>
              </div>
            </div>

            <div className="border-t border-neutral-800 mt-8 pt-8 text-center text-neutral-400">
              <p>
                &copy; {new Date().getFullYear()} AfraPay Africa Limited. All
                rights reserved.
              </p>
              <nav
                aria-label="Legal"
                className="mt-2 flex justify-center gap-4 text-sm"
              >
                <Link
                  to="/privacy"
                  className="hover:text-white transition-colors"
                >
                  Privacy Policy
                </Link>
                <Link
                  to="/terms"
                  className="hover:text-white transition-colors"
                >
                  Terms of Service
                </Link>
                <Link
                  to="/security-info"
                  className="hover:text-white transition-colors"
                >
                  Security
                </Link>
              </nav>
            </div>
          </div>
        </Container>
      </footer>
    </div>
  );
};

export { PublicLayout };
