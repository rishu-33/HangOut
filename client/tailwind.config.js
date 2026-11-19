/** @type {import("tailwindcss").Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        /* ── Core palette (used everywhere) ── */
        background:      "#0b1120",
        "bg-alt":        "#070d18",
        surface:         "#111827",
        "surface-2":     "#1a2235",
        "surface-light": "#1e2d44",   /* kept for legacy classes */
        "surface-3":     "rgba(255,255,255,0.05)",
        primary:         "#f0ece8",
        secondary:       "rgba(255,255,255,0.50)",
        accent:          "#c46b4a",
        "accent-hover":  "#d4845e",
        border:          "rgba(255,255,255,0.09)",   /* kept for legacy */
        "border-2":      "rgba(255,255,255,0.14)",
        online:          "#34d399",
        danger:          "#ef4444",
      },
      fontFamily: {
        sans:    ["Outfit",    "system-ui", "-apple-system", "sans-serif"],
        display: ["Fraunces",  "Georgia",   "serif"],
        mono:    ["JetBrains Mono", "Fira Code", "monospace"],
      },
      borderRadius: {
        sm:   "8px",
        md:   "12px",
        lg:   "18px",
        xl:   "24px",
        "2xl":"28px",
        "3xl":"32px",
      },
      spacing: {
        "4.5": "18px",
      },
      maxWidth: {
        chat: "800px",
      },
      animation: {
        "fade-in":   "msgFade   200ms ease both",
        "slide-up":  "msgSlide  200ms cubic-bezier(0.22,1,0.36,1) both",
        "scale-in":  "scaleIn   180ms cubic-bezier(0.22,1,0.36,1) both",
        "shimmer":   "shimmer   1.4s ease-in-out infinite",
      },
      keyframes: {
        msgFade:  { from:{opacity:0},            to:{opacity:1} },
        msgSlide: { from:{opacity:0,transform:"translateY(10px)"}, to:{opacity:1,transform:"translateY(0)"} },
        scaleIn:  { from:{opacity:0,transform:"scale(0.94)"}, to:{opacity:1,transform:"scale(1)"} },
        shimmer:  { "0%":{"background-position":"-600px 0"}, "100%":{"background-position":"600px 0"} },
      },
      transitionTimingFunction: {
        spring: "cubic-bezier(0.22,1,0.36,1)",
      },
      backgroundSize: {
        shimmer: "600px 100%",
      },
    },
  },
  plugins: [],
};
