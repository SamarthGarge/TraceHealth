/**
 * Tailwind CSS configuration — DataLens v2.0 design token mapping.
 * Maps the CSS custom properties from tokens.css into Tailwind utility classes
 * so components can use `bg-parchment`, `text-terra`, `border-border-soft`, etc.
 *
 * See docs/UI_Design_System_v2_DataLens.md §6 for the canonical token table.
 * INVARIANT: Values here must EXACTLY match the :root block in tokens.css.
 */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      // ── Color tokens ──────────────────────────────────────────────────────
      colors: {
        // Neutral — parchment base
        parchment: {
          DEFAULT: "#F4EFE6",
          lo:      "#EDE7DC",
          hi:      "#FAF7F2",
        },
        white: "#FFFFFF",
        // Ink scale
        ink: {
          DEFAULT: "#1C1510",
          mid:     "#4A3D35",
          light:   "#8A7D74",
          ghost:   "#C4B9B0",
        },
        // Border scale
        border: {
          DEFAULT: "#DDD5C9",
          soft:    "#EDE7DC",
          strong:  "#C4B9B0",
        },
        // Primary accent — terracotta
        terra: {
          DEFAULT: "#C25539",
          dark:    "#9E3D26",
          dim:     "rgba(194,85,57,0.09)",
        },
        // Sage (success / low-risk reuse)
        sage: {
          DEFAULT: "#4D7A60",
          dim:     "rgba(77,122,96,0.12)",
        },
        // Status / health-semantic colors (risk severity only — never on buttons or nav)
        status: {
          low:           "#4D7A60",
          "low-dim":     "rgba(77,122,96,0.12)",
          moderate:      "#B8862E",
          "moderate-dim":"rgba(184,134,46,0.12)",
          high:          "#B23A3A",
          "high-dim":    "rgba(178,58,58,0.12)",
        },
        // Categorical chart colors (inside charts only — never on buttons/links/nav)
        chart: {
          clay:  "#C25539",   // Diabetes  / —
          plum:  "#8B5D6B",   // Heart     / XGBoost
          slate: "#5B7C99",   // TB        / Logistic Regression
          gold:  "#A68A4E",   // Cancer    / Random Forest
        },
      },

      // ── Typography ────────────────────────────────────────────────────────
      fontFamily: {
        display: ['"Cormorant Garamond"', "Georgia", "serif"],
        body:    ["Figtree",             "system-ui", "sans-serif"],
        mono:    ['"JetBrains Mono"',    '"Courier New"', "monospace"],
      },

      // ── Border radius ─────────────────────────────────────────────────────
      borderRadius: {
        sm: "4px",
        md: "8px",
        lg: "10px",
        xl: "14px",
      },

      // ── Spacing scale (base-4) ────────────────────────────────────────────
      // Tailwind's default scale already covers most of this; these add the
      // DataLens-named stops for direct 1-to-1 mapping.
      spacing: {
        1:  "4px",
        2:  "8px",
        3:  "12px",
        4:  "16px",
        5:  "20px",
        6:  "24px",
        7:  "28px",
        8:  "32px",
        9:  "36px",
        10: "40px",
        11: "48px",
        12: "56px",
        13: "64px",
        14: "80px",
      },

      // ── Animation / transitions ───────────────────────────────────────────
      transitionTimingFunction: {
        enter:  "cubic-bezier(0.0, 0.0, 0.2, 1)",
        spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
        std:    "cubic-bezier(0.4, 0.0, 0.2, 1)",
        exit:   "cubic-bezier(0.4, 0.0, 1, 1)",
      },
      transitionDuration: {
        fast:  "100ms",
        base:  "200ms",
        slow:  "300ms",
        enter: "350ms",
      },
    },
  },
  plugins: [],
};
