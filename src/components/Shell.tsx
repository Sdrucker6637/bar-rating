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
  { route: "/leaderboard", label: "Leaderboard" },
  { route: "/find", label: "Discover" },
  { route: "/map", label: "Tour Map" },
  { route: "/split", label: "Split the Bill" },
];

export default function Shell({ children }: { children: React.ReactNode }) {
  const { saveError, setShowInfo, loading } = useTour();
  const pathname = usePathname();

  if (loading) return <LoadingScreen />;

  return (
    <div
      className="tda-root tda-atmosphere"
      style={{
        minHeight: "100vh",
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

        <nav
          className="tda-scroll-x sticky top-0 z-20 -mx-5 mb-8 border-b border-line bg-[#12100F]/95 px-5 backdrop-blur-sm sm:static sm:mx-0 sm:mb-8 sm:border-b sm:border-line sm:bg-transparent sm:px-0 sm:backdrop-blur-none"
          aria-label="Sections"
        >
          <div className="flex items-stretch">
            {TABS.map((t) => {
              const active =
                pathname === t.route ||
                (t.route === "/leaderboard" && pathname === "/");
              return (
                <Link
                  key={t.route}
                  href={t.route}
                  aria-current={active ? "page" : undefined}
                  className={`relative flex flex-shrink-0 items-center whitespace-nowrap px-4 py-3 font-mono text-[0.72rem] uppercase tracking-[0.16em] transition-colors duration-150 sm:flex-1 sm:justify-center sm:border-r sm:border-line sm:px-2 sm:first:border-l ${
                    active ? "text-cream" : "text-mute hover:text-mist"
                  }`}
                >
                  {t.label}
                  <span
                    aria-hidden="true"
                    className={`absolute bottom-0 left-1/2 h-[2px] -translate-x-1/2 bg-brass transition-all duration-150 ${
                      active ? "w-9 opacity-100" : "w-0 opacity-0"
                    }`}
                  />
                </Link>
              );
            })}
          </div>
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
