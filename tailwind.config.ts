import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

export default {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      // ETNI-21: Africa History (`--afh-*`) token surface for Tailwind utilities.
      // Additive only — existing shadcn HSL tokens below are untouched.
      fontFamily: {
        sans: ["var(--font-inter)", "sans-serif"],
        display: ["var(--font-playfair)", "serif"],
        afh: ["var(--font-nunito-sans)", "system-ui", "sans-serif"],
        "afh-display": ["var(--font-fraunces)", "Georgia", "serif"],
      },
      fontSize: {
        "afh-hero": "var(--afh-text-hero)",
        "afh-h1": "var(--afh-text-h1)",
        "afh-h2": "var(--afh-text-h2)",
        "afh-h3": "var(--afh-text-h3)",
        "afh-body": "var(--afh-text-body)",
        "afh-small": "var(--afh-text-small)",
        "afh-caption": "var(--afh-text-caption)",
        "afh-micro": "var(--afh-text-micro)",
        "afh-nano": "var(--afh-text-nano)",
      },
      spacing: {
        "afh-xs": "var(--afh-space-xs)",
        "afh-sm": "var(--afh-space-sm)",
        "afh-md": "var(--afh-space-md)",
        "afh-base": "var(--afh-space-base)",
        "afh-lg": "var(--afh-space-lg)",
        "afh-xl": "var(--afh-space-xl)",
        "afh-2xl": "var(--afh-space-2xl)",
        "afh-3xl": "var(--afh-space-3xl)",
        "afh-4xl": "var(--afh-space-4xl)",
        "afh-5xl": "var(--afh-space-5xl)",
        "afh-6xl": "var(--afh-space-6xl)",
      },
      boxShadow: {
        "afh-1": "var(--afh-elev-1)",
        "afh-2": "var(--afh-elev-2)",
        "afh-3": "var(--afh-elev-3)",
        "afh-4": "var(--afh-elev-4)",
        "afh-5": "var(--afh-elev-5)",
        "afh-warm": "var(--afh-elev-warm)",
      },
      transitionDuration: {
        "afh-fast": "120ms",
        "afh-base": "200ms",
        "afh-slow": "320ms",
        "afh-fade": "400ms",
        "afh-pageload": "600ms",
      },
      colors: {
        // L2 semantic aliases (ETNI-21). Available as Tailwind utilities
        // like `bg-afh-conf-high` or `text-afh-source-primary`.
        "afh-bg": "var(--afh-bg)",
        "afh-bg-warm": "var(--afh-bg-warm)",
        "afh-surface": "var(--afh-surface)",
        "afh-border": "var(--afh-border)",
        "afh-text": "var(--afh-text)",
        "afh-text-soft": "var(--afh-text-soft)",
        "afh-text-muted": "var(--afh-text-muted)",
        "afh-earth": "var(--afh-earth)",
        "afh-terracotta": "var(--afh-terracotta)",
        "afh-gold": "var(--afh-gold)",
        "afh-conf-high": "var(--afh-conf-high)",
        "afh-conf-mid": "var(--afh-conf-mid)",
        "afh-conf-low": "var(--afh-conf-low)",
        "afh-classification-stable": "var(--afh-classification-stable)",
        "afh-classification-contested": "var(--afh-classification-contested)",
        "afh-classification-disputed": "var(--afh-classification-disputed)",
        "afh-source-primary": "var(--afh-source-primary)",
        "afh-source-secondary": "var(--afh-source-secondary)",
        "afh-source-ai-flagged": "var(--afh-source-ai-flagged)",
        "afh-flag-open": "var(--afh-flag-open)",
        "afh-flag-resolved": "var(--afh-flag-resolved)",
        "afh-error": "var(--afh-error)",
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        // ETNI-21: Africa History radii (additive).
        "afh-sm": "var(--afh-radius-sm)",
        "afh-md": "var(--afh-radius-md)",
        "afh-base": "var(--afh-radius-base)",
        "afh-lg": "var(--afh-radius-lg)",
        "afh-xl": "var(--afh-radius-xl)",
        "afh-2xl": "var(--afh-radius-2xl)",
        "afh-3xl": "var(--afh-radius-3xl)",
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [tailwindcssAnimate],
} satisfies Config;
