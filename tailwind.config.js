/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{html,js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // FinPilot brand colors
        fp: {
          bg: "#08091A", // Main background
          surface: "#0F1629", // Card surface
          card: "#141E35", // Elevated card
          border: "#1E2D4A", // Border
          muted: "#243352", // Muted elements

          // Text
          text: "#E8EDF5", // Primary text
          "text-2": "#8B9DC3", // Secondary text
          "text-3": "#4A5A7A", // Muted text

          // Brand
          primary: "#10D9A0", // Emerald green (growth)
          "primary-dim": "#0A7A59",
          accent: "#3D7FFF", // Blue (accent)
          "accent-dim": "#1A3D99",

          // Semantic
          success: "#10D9A0",
          danger: "#FF4D6B",
          warning: "#FFB84D",
          info: "#3D7FFF",

          // Chart colors
          chart1: "#10D9A0", // Green
          chart2: "#3D7FFF", // Blue
          chart3: "#FF4D6B", // Red
          chart4: "#FFB84D", // Amber
          chart5: "#B04DFF", // Purple
          chart6: "#FF6B3D", // Orange
        },
      },
      fontFamily: {
        sans: ["Outfit", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
        display: ["Outfit", "sans-serif"],
      },
      animation: {
        "fade-in": "fadeIn 0.4s ease-out",
        "slide-up": "slideUp 0.4s ease-out",
        "slide-right": "slideRight 0.3s ease-out",
        "pulse-green": "pulseGreen 2s infinite",
        counter: "counter 0.8s ease-out",
        shimmer: "shimmer 1.5s infinite",
        confetti: "confetti 1s ease-out",
        glow: "glow 2s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        slideUp: {
          from: { transform: "translateY(20px)", opacity: "0" },
          to: { transform: "translateY(0)", opacity: "1" },
        },
        slideRight: {
          from: { transform: "translateX(-20px)", opacity: "0" },
          to: { transform: "translateX(0)", opacity: "1" },
        },
        pulseGreen: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        glow: {
          "0%, 100%": { boxShadow: "0 0 5px rgba(16, 217, 160, 0.3)" },
          "50%": { boxShadow: "0 0 20px rgba(16, 217, 160, 0.6)" },
        },
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        shimmer:
          "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.04) 50%, transparent 100%)",
      },
      boxShadow: {
        card: "0 4px 24px rgba(0, 0, 0, 0.4)",
        "glow-green": "0 0 20px rgba(16, 217, 160, 0.3)",
        "glow-blue": "0 0 20px rgba(61, 127, 255, 0.3)",
        "inner-border": "inset 0 1px 0 rgba(255,255,255,0.05)",
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.25rem",
        "3xl": "1.5rem",
      },
    },
  },
  plugins: [],
};
