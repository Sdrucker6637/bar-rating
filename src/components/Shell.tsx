"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTour } from "@/lib/tour-context";
import Icon from "./Icon";
import type { IconName } from "./Icon";
import BrandMark from "./BrandMark";
import Ornament from "./Ornament";
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
        color: "#F1E8D6",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <div
        className="flex-1 overflow-y-auto overscroll-contain"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        <div
          className="mx-auto max-w-[1000px] px-4 pb-8 sm:px-8 sm:pb-12"
          style={{
            // viewport-fit: cover (see layout.tsx) draws the page under the
            // notch/Dynamic Island too, not just the home indicator — pad
            // the top back out so the header never sits under it. A no-op
            // on devices/browsers without a top inset.
            paddingTop: "env(safe-area-inset-top)",
          }}
        >
        {/* Masthead — the brand as a publication nameplate: the emblem,
            the wordmark with its true-italic "Alcoholism" (the only brass
            in the header), and the tagline in the guide's italic voice. */}
        <header className="pb-5 pt-9 text-center sm:pb-7 sm:pt-14">
          <div className="flex items-center justify-center gap-2.5 sm:gap-4">
            <BrandMark
              size={34}
              className="flex-shrink-0 drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)] sm:hidden"
            />
            <BrandMark
              size={58}
              className="hidden flex-shrink-0 drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)] sm:block"
            />
            <h1 className="m-0 whitespace-nowrap font-serif text-masthead font-semibold text-cream">
              Tour de{" "}
              <span className="font-normal italic tracking-[-0.02em] text-gold">
                Alcoholism
              </span>
            </h1>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1 sm:mt-4">
            <span className="font-serif text-[0.95rem] italic text-mist sm:text-[1.05rem]">
              a running record of the bars we&apos;ve survived
            </span>
            <span aria-hidden="true" className="hidden text-dim sm:inline">
              ·
            </span>
            <button
              type="button"
              title="How Tour de Alcoholism works"
              aria-label="How Tour de Alcoholism works"
              onClick={() => setShowInfo(true)}
              className="cursor-pointer border-none bg-transparent p-0 font-cond text-[0.82rem] font-semibold uppercase tracking-[0.12em] text-mute underline decoration-line2 decoration-1 underline-offset-[5px] transition-colors hover:text-cream hover:decoration-brass"
            >
              How it works
            </button>
          </div>
        </header>

        {/* Desktop / tablet nav — a publication section bar: condensed
            caps between two hairlines, the active section underlined in
            brass. No boxes, no pills, so it never outweighs the content. */}
        <nav
          className="mb-10 hidden border-y border-line sm:block"
          aria-label="Sections"
        >
          <div className="flex items-stretch justify-center">
            {TABS.map((t, i) => {
              const active =
                pathname === t.route ||
                (t.route === "/leaderboard" && pathname === "/");
              return (
                <div key={t.route} className="flex items-center">
                  {i > 0 && (
                    <span aria-hidden="true" className="text-[0.6rem] text-line2">
                      ◆
                    </span>
                  )}
                  <Link
                    href={t.route}
                    aria-current={active ? "page" : undefined}
                    className={`group relative flex items-center whitespace-nowrap px-4 py-3.5 font-cond text-[0.98rem] font-semibold uppercase tracking-[0.12em] transition-colors duration-150 md:px-6 ${
                      active ? "text-cream" : "text-mute hover:text-cream"
                    }`}
                  >
                    {t.label}
                    <span
                      aria-hidden="true"
                      className={`absolute inset-x-4 -bottom-px h-[2px] origin-center bg-brass transition-transform duration-200 md:inset-x-6 ${
                        active ? "scale-x-100" : "scale-x-0 group-hover:scale-x-[0.35] group-hover:bg-line2"
                      }`}
                    />
                  </Link>
                </div>
              );
            })}
          </div>
        </nav>
        <Ornament className="mb-7 sm:hidden" tone="quiet" />

        <div key={pathname} className="tda-page">
        {children}
        </div>

        {saveError && (
          <div className="mt-10 flex items-center justify-center gap-2 rounded-[3px] border border-redDeep bg-[rgba(168,69,63,0.1)] px-4 py-3 text-center text-[0.85rem] text-red">
            <span aria-hidden="true">⚠</span>
            Couldn&apos;t save that change — check your connection and try
            again.
          </div>
        )}
        <Ornament className="mt-14" tone="quiet" />
        <div className="mt-4 text-center font-serif text-[0.85rem] italic text-dim">
          Shared list — anyone with this page can add stages, rank bars, and
          edit entries.
        </div>
        </div>
      </div>

      {/* Mobile bottom tab bar — thumb-reachable, safe-area aware. A normal
          flex item (not `position: fixed`), always at the bottom of the
          100dvh shell above — see the note on the shell's root div. */}
      <nav
        className="z-30 flex-shrink-0 border-t border-line bg-[#12100E]/95 backdrop-blur-sm sm:hidden"
        style={{
          paddingBottom: "calc(env(safe-area-inset-bottom) + 4px)",
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
                className="relative flex min-h-[56px] flex-1 flex-col items-center justify-center gap-1 pb-1.5 pt-2.5"
              >
                {/* active marker: a short brass bar on the nav's top edge */}
                <span
                  aria-hidden="true"
                  className={`absolute left-1/2 top-[-1px] h-[2px] w-7 -translate-x-1/2 bg-brass transition-opacity duration-150 ${
                    active ? "opacity-100" : "opacity-0"
                  }`}
                />
                <Icon
                  name={t.icon}
                  size={20}
                  className={active ? "text-gold" : "text-mute"}
                />
                <span
                  className={`whitespace-nowrap font-cond text-[0.74rem] font-semibold uppercase tracking-[0.08em] ${
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
