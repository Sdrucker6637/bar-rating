"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTour } from "@/lib/tour-context";
import LoadingScreen from "./LoadingScreen";
import InfoModal from "./modals/InfoModal";
import VisitedFormModal from "./modals/VisitedFormModal";
import VisitedNamePromptModal from "./modals/VisitedNamePromptModal";
import WishFormModal from "./modals/WishFormModal";
import PlacesModal from "./modals/PlacesModal";
import CrawlModal from "./modals/CrawlModal";

const TABS = [
  { route: "/leaderboard", label: "Leaderboard", icon: "🏆" },
  { route: "/find", label: "Find", icon: "🔎" },
  { route: "/map", label: "Map", icon: "🗺️" },
  { route: "/split", label: "Split", icon: "🧾" },
];

export default function Shell({ children }: { children: React.ReactNode }) {
  const { saveError, setShowInfo, loading } = useTour();
  const pathname = usePathname();

  if (loading) return <LoadingScreen />;

  return (
    <div
      className="tda-root"
      style={{
        minHeight: "100vh",
        backgroundColor: "#100E10",
        backgroundImage: [
          // a whisper of brass warmth near the top — not a glow, barely there
          "radial-gradient(60% 38% at 50% 0%, rgba(184,150,95,0.035), transparent 72%)",
          // edge vignette: center stays neutral, corners recede into warm black
          "radial-gradient(130% 85% at 50% 18%, rgba(0,0,0,0) 0%, rgba(6,5,6,0.5) 100%)",
          // fine grain — the actual texture layer (previously defined on body,
          // where it never rendered because this div's opaque background
          // always painted over it)
          "radial-gradient(rgba(237,230,217,0.03) 1px, transparent 1px)",
        ].join(", "),
        backgroundSize: "100% 100%, 100% 100%, 3px 3px",
        backgroundRepeat: "no-repeat, no-repeat, repeat",
        color: "#EDE6D9",
        fontFamily: "'Inter', sans-serif",
        paddingBottom: "4rem",
      }}
    >
      <div className="mx-auto max-w-[980px] px-5 sm:border-x sm:border-[rgba(184,150,95,0.055)]">
        <header className="border-b border-[rgba(184,150,95,0.16)] pb-7 pt-12 text-center">
          <h1 className="m-0 font-serif text-display font-medium text-cream">
            Tour de <span className="italic text-gold">Alcoholism</span>
            <button
              type="button"
              title="How Tour de Alcoholism works"
              aria-label="How Tour de Alcoholism works"
              onClick={() => setShowInfo(true)}
              className="ml-2 inline-flex h-[26px] w-[26px] cursor-pointer items-center justify-center rounded-full border border-mute bg-transparent align-middle font-mono text-[0.72rem] font-semibold text-gold transition-colors hover:border-gold hover:bg-[rgba(201,168,118,0.1)]"
            >
              i
            </button>
          </h1>
          <div className="mt-3 font-mono text-kicker uppercase text-mute">
            a running record of the bars we&apos;ve survived
          </div>
        </header>

        <nav className="tda-scroll-x sticky top-0 z-20 -mx-5 my-7 flex gap-2 border-b border-line bg-[#0E0D10]/90 px-5 py-3 sm:static sm:mx-0 sm:border-none sm:bg-transparent sm:px-0 sm:py-0">
          {TABS.map((t) => {
            const active =
              pathname === t.route ||
              (t.route === "/leaderboard" && pathname === "/");
            return (
              <Link
                key={t.route}
                href={t.route}
                className={`flex flex-shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-4 py-2 font-mono text-[0.75rem] uppercase tracking-[0.06em] transition-all duration-150 sm:flex-1 sm:justify-center ${
                  active
                    ? "border-brass bg-brass font-semibold text-deep shadow-lift"
                    : "border-line2 bg-transparent text-mist hover:border-brass hover:text-cream"
                }`}
              >
                <span aria-hidden="true">{t.icon}</span>
                {t.label}
              </Link>
            );
          })}
        </nav>

        {children}

        {saveError && (
          <div className="mt-10 flex items-center justify-center gap-2 rounded-[6px] border border-redDeep bg-[rgba(199,118,118,0.08)] px-4 py-3 text-center font-mono text-[0.72rem] text-red">
            <span aria-hidden="true">⚠</span>
            Couldn&apos;t save that change — check your connection and try
            again.
          </div>
        )}
        <div className="mt-10 text-center font-mono text-[0.68rem] text-dim">
          Shared list — anyone with this page can add stages, rank bars, and
          edit entries.
        </div>
      </div>

      <InfoModal />
      <VisitedFormModal />
      <VisitedNamePromptModal />
      <WishFormModal />
      <PlacesModal />
      <CrawlModal />
    </div>
  );
}
