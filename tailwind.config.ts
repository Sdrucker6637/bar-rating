import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0E0D10",
        base: "#14121A",
        cream: "#EDE6D9",
        brass: "#B8965F",
        gold: "#C9A876",
        goldDeep: "#8A6D2F",
        goldBright: "#E5B93F",
        mute: "#93887A",
        mist: "#BDB3A4",
        dim: "#6E6457",
        line: "#262029",
        line2: "#302938",
        panel: "#1A1714",
        panelHover: "#171411",
        deep: "#16130F",
        green: "#3F5D4E",
        greenLight: "#7FA88E",
        greenDark: "#2E4438",
        greenDeep: "#1F2E28",
        greenBright: "#5C8D74",
        blue: "#3A4F66",
        blueLight: "#7FA8C9",
        blueDeep: "#3F566B",
        red: "#C77676",
        redLight: "#D98F8F",
        redDeep: "#9A4B4B",
        bronze: "#A9784F",
        bronzeLight: "#C08E5F",
        silver: "#B9B6BC",
        silverLight: "#C9C6CE",
        creamSoft: "#D8D1C4",
        skeleton: "#221C17",
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
        serif: ["Fraunces", "serif"],
        mono: ["'IBM Plex Mono'", "monospace"],
      },
      // New: a real, small type scale so headings stop drifting per-component.
      fontSize: {
        display: [
          "clamp(2.1rem, 6vw, 3.4rem)",
          { lineHeight: "1.04", letterSpacing: "-0.02em" },
        ],
        "title-lg": [
          "1.55rem",
          { lineHeight: "1.15", letterSpacing: "-0.01em" },
        ],
        "title-md": ["1.18rem", { lineHeight: "1.2" }],
        "title-sm": ["1.02rem", { lineHeight: "1.25" }],
        kicker: ["0.7rem", { lineHeight: "1.4", letterSpacing: "0.14em" }],
      },
      boxShadow: {
        lift: "0 2px 10px rgba(0,0,0,0.35)",
        panel: "0 10px 28px rgba(0,0,0,0.45)",
      },
    },
  },
  plugins: [],
};

export default config;
