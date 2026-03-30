/** @type {import('tailwindcss').Config} */
// AfraPay Premium Design System — tailwind.config.js
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}", "./public/index.html"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Inter",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
      },
      colors: {
        primary: {
          50: "#eff6ff",
          100: "#dbeafe",
          200: "#bfdbfe",
          300: "#93c5fd",
          400: "#60a5fa",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
          800: "#1e40af",
          900: "#1e3a8a",
          950: "#172554",
        },
      },
      boxShadow: {
        card: "0 1px 4px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.03)",
        "card-hover": "0 8px 24px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04)",
        modal: "0 25px 50px -12px rgba(0,0,0,0.22)",
        feature:
          "0 8px 32px rgba(37,99,235,0.14), 0 2px 8px rgba(37,99,235,0.06)",
        topbar: "0 1px 0 rgba(0,0,0,0.05)",
        sidebar: "4px 0 24px rgba(0,0,0,0.18)",
      },
      backgroundImage: {
        "blue-gradient": "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
        "teal-gradient": "linear-gradient(135deg, #10b981 0%, #0d9488 100%)",
        "violet-gradient": "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
        "amber-gradient": "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
        "red-gradient": "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
        "sidebar-bg": "linear-gradient(180deg, #0f172a 0%, #1e293b 100%)",
        "hero-gradient":
          "linear-gradient(135deg, #1e3a8a 0%, #2563eb 50%, #0d9488 100%)",
        "page-gradient":
          "linear-gradient(135deg, #f8fafc 0%, #eff6ff 50%, #f0fdf4 100%)",
        "card-shine":
          "linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 100%)",
      },
      animation: {
        "fade-in": "fadeIn 0.2s ease-out",
        "slide-up": "slideUp 0.25s ease-out",
        "slide-down": "slideDown 0.25s ease-out",
        "slide-in": "slideIn 0.25s ease-out",
        "scale-in": "scaleIn 0.2s ease-out",
        skeleton: "skeleton 1.6s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { transform: "translateY(8px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        slideDown: {
          "0%": { transform: "translateY(-8px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        slideIn: {
          "0%": { transform: "translateY(-10px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        scaleIn: {
          "0%": { transform: "scale(0.95)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        skeleton: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.45" },
        },
      },
    },
  },
  plugins: [],
};
