/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{html,ts}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          '"Plus Jakarta Sans"',
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
        mono: [
          '"Geist Mono"',
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Consolas",
          "monospace",
        ],
      },
      colors: {
        // Identité Karta — source de vérité : styles.css (variables --k-*)
        charcoal: {
          DEFAULT: "#131312",
          soft: "#1E1D1B",
          line: "#2A2926",
          muted: "#9A9A93",
        },
        eclipse: "#0C0C0C",
        persimmon: {
          DEFAULT: "#F05A00",
          hover: "#D44F00",
          soft: "#FCEDE3",
          ring: "#F7B98C",
        },
        ivory: "#F6F6F6",
        canvas: "#FAFAF8",
        hairline: "#E6E6E4",
        ink: {
          900: "#131312",
          700: "#3B3A37",
          600: "#57564F",
          500: "#6B6A64",
          400: "#8C8B84",
          300: "#B6B5AE",
          200: "#DBDAD5",
          100: "#EEEEE9",
        },
        "slate-accent": "#4A6D7C",
        "teal-accent": "#6B8E8E",
        success: { DEFAULT: "#2E7D57", soft: "#E7F2EC" },
        danger: { DEFAULT: "#C0403B", soft: "#FBECEB" },
      },
      borderRadius: {
        xs: "4px",
        sm: "6px",
        md: "8px",
        lg: "12px",
      },
      boxShadow: {
        xs: "0 1px 2px rgba(19, 19, 18, 0.04)",
        sm: "0 1px 3px rgba(19, 19, 18, 0.06), 0 1px 2px rgba(19, 19, 18, 0.04)",
        md: "0 8px 24px -6px rgba(19, 19, 18, 0.12)",
        pop: "0 16px 48px -12px rgba(12, 12, 12, 0.28)",
      },
      transitionTimingFunction: {
        karta: "cubic-bezier(0.2, 0, 0, 1)",
      },
      maxWidth: {
        content: "76rem",
      },
    },
  },
  plugins: [],
};
