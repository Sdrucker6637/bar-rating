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
    // Fixed-height (100dvh) flex shell instead of a body-scrolls,
    // position:fixed-nav page. `fixed` bottom-anchored elements are computed
    // against mobile Safari's viewport in a way that can lag its own
    // collapsible toolbar — a `fixed; bottom: 0` (or a JS-computed offset
    // chasing window.visualViewport, tried first) can still render behind
    // the toolbar on a fresh load until a scroll/repaint catches it up,
    // which is exactly "the tabs aren't there until I scroll". Making the
    // nav a normal, non-fixed flex item sidesteps that class of bug
    // entirely: its position is ordinary box layout, not viewport tracking.
    // 100dvh (not 100vh) is what makes that safe — it already resolves to
    // the CURRENT visible height, toolbar included, so the shell is never
    // taller than what's actually on screen.
    <div
      className="tda-root tda-atmosphere flex flex-col overflow-hidden"
      style={{
        height: "100dvh",
        color: "#EDE6D9",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <div
        className="flex-1 overflow-y-auto overscroll-contain"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        <div
          className="mx-auto max-w-[980px] px-5 pb-8 sm:border-x sm:border-[rgba(184,150,95,0.055)] sm:pb-12"
          style={{
            // viewport-fit: cover (see layout.tsx) draws the page under the
            // notch/Dynamic Island too, not just the home indicator — pad
            // the top back out so the header never sits under it. A no-op
            // on devices/browsers without a top inset.
            paddingTop: "env(safe-area-inset-top)",
          }}
        >
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
      </div>

      {/* Mobile bottom tab bar — thumb-reachable, safe-area aware. A normal
          flex item (not `position: fixed`), always at the bottom of the
          100dvh shell above — see the note on the shell's root div. */}
      <nav
        className="z-30 flex-shrink-0 border-t border-line bg-[#12100F]/95 backdrop-blur-sm sm:hidden"
        style={{
          paddingBottom: "calc(env(safe-area-inset-bottom) + 6px)",
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
