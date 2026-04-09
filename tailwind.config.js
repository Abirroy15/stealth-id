/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans:    ["'Inter'",       "system-ui", "sans-serif"],
        mono:    ["'JetBrains Mono'", "'Fira Code'", "monospace"],
        display: ["'Inter'",       "system-ui", "sans-serif"],
      },
      colors: {
        // Base
        bg:       "#080816",
        surface:  "rgba(255,255,255,0.04)",
        border:   "rgba(255,255,255,0.08)",
        // Purple spectrum
        purple: {
          DEFAULT: "#8b5cf6",
          light:   "#a78bfa",
          dark:    "#6d28d9",
          glow:    "rgba(139,92,246,0.35)",
          dim:     "rgba(139,92,246,0.12)",
        },
        // Blue spectrum
        blue: {
          DEFAULT: "#3b82f6",
          light:   "#60a5fa",
          glow:    "rgba(59,130,246,0.35)",
          dim:     "rgba(59,130,246,0.12)",
        },
        // Green
        green: {
          DEFAULT: "#10b981",
          light:   "#34d399",
          glow:    "rgba(16,185,129,0.35)",
          dim:     "rgba(16,185,129,0.12)",
        },
        // Orange
        orange: {
          DEFAULT: "#f59e0b",
          light:   "#fbbf24",
          glow:    "rgba(245,158,11,0.35)",
        },
        // Red
        red: {
          DEFAULT: "#ef4444",
          light:   "#f87171",
          glow:    "rgba(239,68,68,0.3)",
        },
        // Neutral
        slate: {
          900: "#0f172a",
          800: "#1e293b",
          700: "#334155",
          600: "#475569",
          500: "#64748b",
          400: "#94a3b8",
          300: "#cbd5e1",
          200: "#e2e8f0",
          100: "#f1f5f9",
        },
      },
      backgroundImage: {
        "page-gradient": "radial-gradient(ellipse 120% 80% at 50% -20%, rgba(109,40,217,0.18) 0%, rgba(30,27,75,0.15) 40%, transparent 70%), radial-gradient(ellipse 80% 60% at 80% 60%, rgba(59,130,246,0.08) 0%, transparent 60%), linear-gradient(180deg, #080816 0%, #0a0a1a 100%)",
        "card-gradient": "linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)",
        "btn-gradient":  "linear-gradient(135deg, #7c3aed 0%, #4f46e5 50%, #2563eb 100%)",
        "btn-green":     "linear-gradient(135deg, #059669 0%, #10b981 100%)",
        "btn-orange":    "linear-gradient(135deg, #d97706 0%, #f59e0b 100%)",
        "hero-glow":     "radial-gradient(ellipse 60% 40% at 50% 0%, rgba(139,92,246,0.15) 0%, transparent 70%)",
        "grid-pattern":  "linear-gradient(rgba(139,92,246,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(139,92,246,0.04) 1px, transparent 1px)",
      },
      backdropBlur: { xs: "2px" },
      boxShadow: {
        "glow-purple": "0 0 30px rgba(139,92,246,0.25), 0 0 60px rgba(139,92,246,0.08)",
        "glow-blue":   "0 0 30px rgba(59,130,246,0.25)",
        "glow-green":  "0 0 20px rgba(16,185,129,0.3)",
        "glow-sm":     "0 0 12px rgba(139,92,246,0.2)",
        "card":        "0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)",
        "card-hover":  "0 8px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)",
      },
      animation: {
        "fade-in":    "fadeIn 0.5s ease forwards",
        "slide-up":   "slideUp 0.6s cubic-bezier(0.16,1,0.3,1) forwards",
        "glow-pulse": "glowPulse 3s ease-in-out infinite",
        "spin-slow":  "spin 2s linear infinite",
        "float":      "float 6s ease-in-out infinite",
        "shimmer":    "shimmer 2s linear infinite",
      },
      keyframes: {
        fadeIn:    { from: { opacity: "0" },                           to: { opacity: "1" } },
        slideUp:   { from: { opacity: "0", transform: "translateY(20px)" }, to: { opacity: "1", transform: "translateY(0)" } },
        glowPulse: { "0%,100%": { opacity: "0.7" }, "50%": { opacity: "1" } },
        float:     { "0%,100%": { transform: "translateY(0px)" }, "50%": { transform: "translateY(-8px)" } },
        shimmer:   { from: { backgroundPosition: "-200% 0" }, to: { backgroundPosition: "200% 0" } },
      },
    },
  },
  plugins: [],
};
