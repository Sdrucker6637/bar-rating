"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTour } from "@/lib/tour-context";
import Icon from "./Icon";
import type { IconName } from "./Icon";
import BrandMark from "./BrandMark";
import LoadingScreen from "./LoadingScreen";
import InfoModal from "./modals/InfoModal";
import VisitedFormModal from "./modals/VisitedFormModal";
import VisitedNamePromptModal from "./modals/VisitedNamePromptModal";
import WishFormModal from "./modals/WishFormModal";
import PlacesModal from "./modals/PlacesModal";
import CrawlModal from "./modals/CrawlModal";
import AchievementToastStack from "./AchievementToastStack";

const TABS: { route: string; label: string; shortLabel?: string; icon: IconName }[] = [
  // shortLabel is the bottom mobile bar only — the desktop segmented nav
  // always uses the full label. Every tab gets one now: leaving only the two
  // longest words shortened made "Map"/"Split" float in extra space while
  // "Leaderboard"/"Achievements" crowded their neighbors, an uneven rhythm
  // across 5 equal-width columns. "Badges" reuses the term the Achievements
  // page itself already uses throughout, rather than inventing a new one.
  { route: "/leaderboard", label: "Leaderboard", shortLabel: "Ranks", icon: "trophy" },
  { route: "/find", label: "Discover", icon: "compass" },
  { route: "/map", label: "Tour Map", shortLabel: "Map", icon: "pin" },
  { route: "/split", label: "Split the Bill", shortLabel: "Split", icon: "receipt" },
  { route: "/achievements", label: "Achievements", shortLabel: "Badges", icon: "medal" },
];

export default function Shell({ children }: { children: React.ReactNode }) {
  const { saveError, setShowInfo, loading } = useTour();
  const pathname = usePathname();

  if (loading) return <LoadingScreen />;

  return (
    <div
      className="tda-root tda-atmosphere pb-32 sm:pb-16"
      style={{
        minHeight: "100vh",
        color: "#EDE6D9",
        fontFamily: "'Inter', sans-serif",
        // viewport-fit: cover (see layout.tsx) draws the page under the
        // notch/Dynamic Island too, not just the home indicator — pad the
        // top back out so the header never sits under it. A no-op on
        // devices/browsers without a top inset.
        paddingTop: "env(safe-area-inset-top)",
      }}
    >
      <div className="mx-auto max-w-[980px] px-5 sm:border-x sm:border-[rgba(184,150,95,0.055)]">
        <header className="border-b border-[rgba(184,150,95,0.16)] pb-7 pt-12 text-center">
          <div className="flex items-center justify-center gap-2.5">
            <BrandMark
              size={34}
              className="hidden flex-shrink-0 opacity-90 drop-shadow-[0_2px_6px_rgba(0,0,0,0.4)] sm:block"
            />
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
          </div>
          <div className="mt-3 font-mono text-kicker uppercase text-mute">
            a running record of the bars we&apos;ve survived
          </div>
        </header>

        {/* Desktop / tablet nav — segmented tabs */}
        <nav
          className="mb-8 hidden border-b border-line sm:block"
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
                  className={`relative flex flex-1 items-center justify-center gap-2 whitespace-nowrap border-r border-line px-2 py-3 font-mono text-[0.72rem] uppercase tracking-[0.16em] transition-colors duration-150 first:border-l ${
                    active ? "text-cream" : "text-mute hover:text-mist"
                  }`}
                >
                  <Icon name={t.icon} size={14} />
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
        <div className="h-6 sm:hidden" />

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

      {/* Mobile bottom tab bar — thumb-reachable, safe-area aware.
          translateZ(0) forces its own compositing layer: iOS Safari has a
          long-standing bug where a `fixed` element on a tall page can render
          a frame late (or get momentarily covered by Safari's own bottom
          toolbar) until the next scroll/repaint — a dedicated layer avoids
          that. The extra +6px on top of the safe-area inset is a real gap
          above the home indicator (and Safari's own chrome) rather than
          sitting flush against it; safe-area-inset-bottom alone is 0 on
          anything that isn't actually notched. */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-[#12100F]/95 backdrop-blur-sm sm:hidden"
        style={{
          paddingBottom: "calc(env(safe-area-inset-bottom) + 6px)",
          transform: "translateZ(0)",
        }}
        aria-label="Sections"
      >
        <div className="flex items-stretch justify-around">
          {TABS.map((t) => {
            const active =
              pathname === t.route ||
              (t.route === "/leaderboard" && pathname === "/");
            return (
              <Link
                key={t.route}
                href={t.route}
                aria-current={active ? "page" : undefined}
                className="flex flex-1 flex-col items-center gap-1 py-3"
              >
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-full border transition-colors ${
                    active ? "border-brass bg-[rgba(201,168,118,0.14)] text-gold" : "border-transparent text-mute"
                  }`}
                >
                  <Icon name={t.icon} size={16} />
                </span>
                <span
                  className={`whitespace-nowrap font-mono text-[0.58rem] uppercase tracking-[0.1em] ${
                    active ? "text-cream" : "text-mute"
                  }`}
                >
                  {t.shortLabel ?? t.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

      <InfoModal />
      <VisitedFormModal />
      <VisitedNamePromptModal />
      <WishFormModal />
      <PlacesModal />
      <CrawlModal />
      <AchievementToastStack />
    </div>
  );
}
