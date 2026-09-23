import type { Config } from "tailwindcss";

/* Tour de Alcoholism — design tokens.
 *
 * The room is a warm cellar at night: brown-black surfaces that step up in
 * warmth rather than in shadow, parchment and taupe type, and a very short
 * list of accents that each MEAN something:
 *   brass    — interactive: primary actions, active states, focus
 *   maillot  — the current leader, and nothing else
 *   claret   — disqualification and destructive actions only
 *   bottle   — the wishlist
 * Everything else is neutral, so the accents stay special.
 *
 * Existing token NAMES are kept (they're referenced across every screen);
 * their values are retuned to the new palette. */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // ---- surfaces: page → row → raised → inset ----
        base: "#12100E", // the room (page background)
        panel: "#1A1613", // cellar — rows, panels, cards
        panelHover: "#201A16", // row hover
        oak: "#241E19", // raised — leader feature, modals, menus
        well: "#0F0C0A", // inset — inputs, tracks, segmented wells
        ink: "#0F0C0A", // legacy alias of `well`
        deep: "#16110C", // dark type on brass fills
        skeleton: "#241D18",

        // ---- hairlines: warm, never purple ----
        line: "#2B231E",
        line2: "#3A2F28",

        // ---- type ----
        cream: "#F1E8D6", // parchment — primary text
        creamSoft: "#D8CEBC",
        mist: "#B7AB95", // taupe — secondary text
        mute: "#978B78", // quiet labels (≥4.5:1 on panel)
        // #8A7F6F clears 4.5:1 against panel/base for small print while
        // staying the quietest tier below `mute`.
        dim: "#8A7F6F",

        // ---- brass: the one interactive accent ----
        brass: "#C9A26A",
        gold: "#D6B47C", // brass as TEXT (a notch lighter for contrast)
        goldDeep: "#8C6D3E",
        // ---- maillot: reserved for the current leader ----
        goldBright: "#F0C75A",
        maillot: "#F0C75A",

        // ---- claret: DQ / destructive ----
        red: "#DC8C84", // claret as text
        redLight: "#EBAAA2",
        redDeep: "#8E3A35",
        claret: "#A8453F",

        // ---- bottle green: wishlist ----
        green: "#3F6B4E",
        greenLight: "#8DB89A",
        greenDark: "#2C4A37",
        greenDeep: "#1D2E24",
        greenBright: "#5E8C6A",

        // ---- podium metals ----
        silver: "#C4C1C7",
        silverLight: "#D9D6DC",
        bronze: "#B57E52",
        bronzeLight: "#CC9868",

        // ---- enamel (achievement categories only) ----
        blue: "#3D5467",
        blueLight: "#93AEC2",
        blueDeep: "#2B3C4A",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        serif: ["Fraunces", "Georgia", "serif"],
        // Race-programme numerals and labels: ranks, scores, buttons, nav.
        cond: ["'Barlow Condensed'", "'Arial Narrow'", "sans-serif"],
        // Reserved for printed/receipt figures (Split the Bill) only.
        mono: ["'IBM Plex Mono'", "ui-monospace", "monospace"],
      },
      fontSize: {
        masthead: [
          "clamp(1.9rem, 8.2vw, 3.9rem)",
          { lineHeight: "1", letterSpacing: "-0.03em" },
        ],
        display: [
          "clamp(1.75rem, 5vw, 2.4rem)",
          { lineHeight: "1.05", letterSpacing: "-0.02em" },
        ],
        "title-lg": ["1.6rem", { lineHeight: "1.12", letterSpacing: "-0.015em" }],
        "title-md": ["1.3rem", { lineHeight: "1.18", letterSpacing: "-0.01em" }],
        "title-sm": ["1.08rem", { lineHeight: "1.25" }],
        kicker: ["0.8rem", { lineHeight: "1.3", letterSpacing: "0.14em" }],
      },
      borderRadius: {
        DEFAULT: "3px",
        card: "4px",
      },
      boxShadow: {
        lift: "0 1px 0 rgba(0,0,0,0.45)",
        panel: "0 24px 60px rgba(0,0,0,0.55)",
        menu: "0 16px 40px rgba(0,0,0,0.5)",
      },
    },
  },
  plugins: [],
};

export default config;
