/** @type {import('tailwindcss').Config} */
module.exports = {
  // NOTE: Update this to include the paths to all of your component files.
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.js, jsx,ts,tsx"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: "#161622",
        secondary: {
          DEFAULT: "#FF9C01",
          100: "#FF9001",
          200: "#FF8E01",
        },
        darkMode: "class",
        black: {
          DEFAULT: "#000",
          100: "#1E1E2D",
          200: "#232533",
        },
        gray: {
          100: "#CDCDE0",
        },

        blue: {
          100: "#1DA1F2",
        },
        brand: {
          DEFAULT: "#3B82F6", // Blue
          green: "#10B981", // Green
          white: "#FFFFFF",
          black: "#000000",
          surface: "#0D1117", // Slightly lifted black
          muted: "#9CA3AF", // Gray-400
          soft: "#1F2937", // Optional secondary bg
        },

        buttons: {
          primary: "#3B82F6", // Blue (buttons, headers)
          secondary: "#10B981", // Green (banners, accents)
          accent: "#F59E0B", // Orange (highlight/seasonal)
          background: "#000000", // Black (main background)
          surface: "#0D1117", // Slight elevation
          white: "#FFFFFF", // Main text/icons on dark bg
          gray: {
            DEFAULT: "#9CA3AF", // Gray text
            light: "#F3F4F6", // Inputs, borders
            dark: "#1F2937", // Surfaces
          },
          border: "#93C5FD", // Light blue for outlines
        },
        orange: {
          100: "#FEE9DD", // Light beige background
          200: "#F5A05C", // Button background (Language Selector)
          300: "#D96B29", // Top banner and main accents (e.g., Maisha Day section)
          400: "#8C3E14", // Iconic hut circle & deep accent
        },
        brown: {
          100: "#AF6432", // Secondary button or UI accents
          200: "#6E3C1A", // Navigation icons and text
        },
        beige: {
          100: "#FFF8F0", // Home screen background
        },

        white: {
          100: "#FFFFFF", // Card backgrounds, text contrast
        },
      },
      fontFamily: {
        pthin: ["Poppins-Thin", "sans-serif"],
        pextralight: ["Poppins-ExtraLight", "sans-serif"],
        plight: ["Poppins-Light", "sans-serif"],
        pregular: ["Poppins-Regular", "sans-serif"],
        pmedium: ["Poppins-Medium", "sans-serif"],
        psemibold: ["Poppins-SemiBold", "sans-serif"],
        pbold: ["Poppins-Bold", "sans-serif"],
        pextrabold: ["Poppins-ExtraBold", "sans-serif"],
        pblack: ["Poppins-Black", "sans-serif"],
      },
    },
  },
  plugins: [],
};
