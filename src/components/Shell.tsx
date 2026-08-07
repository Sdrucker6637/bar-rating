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
  { route: "/leaderboard", label: "Current Leaderboard" },
  { route: "/find", label: "Find a New Bar" },
  { route: "/map", label: "Tour Map" },
  { route: "/split", label: "Split the Bill" },
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
        background: "linear-gradient(180deg,#14121A 0%,#0E0D10 55%)",
        color: "#EDE6D9",
        fontFamily: "'Inter', sans-serif",
        paddingBottom: "4rem",
      }}
    >
      <div className="mx-auto max-w-[980px] px-5">
        <header className="border-b border-line pb-7 pt-12 text-center">
          <h1 className="m-0 font-serif text-[clamp(1.9rem,5.5vw,2.9rem)] font-medium tracking-[-0.01em] text-cream">
            Tour de{" "}
            <span className="italic text-gold">Alcoholism</span>
            <button
              type="button"
              title="How Tour de Alcoholism works"
              aria-label="How Tour de Alcoholism works"
              onClick={() => setShowInfo(true)}
              className="ml-1 inline-block h-[22px] w-[22px] cursor-pointer rounded-full border border-mute bg-transparent align-middle font-mono text-[0.72rem] font-semibold text-gold"
            >
              i
            </button>
          </h1>
          <div className="mt-2.5 font-mono text-[0.72rem] uppercase tracking-[0.12em] text-mute">
            a running record of the bars we&apos;ve survived
          </div>
        </header>

        <nav className="my-7 flex gap-2">
          {TABS.map((t) => {
            const active =
              pathname === t.route ||
              (t.route === "/leaderboard" && pathname === "/");
            return (
              <Link
                key={t.route}
                href={t.route}
                className={`flex-[1_1_0] rounded-[3px] border px-3 py-2.5 text-center font-mono text-[0.75rem] uppercase tracking-[0.06em] transition-all duration-150 ${
                  active
                    ? "border-brass bg-brass font-semibold text-deep"
                    : "border-line2 bg-transparent text-mist hover:border-brass hover:text-cream"
                }`}
              >
                {t.label}
              </Link>
            );
          })}
        </nav>

        {children}

        {saveError && (
          <div
            className="mt-10 text-center font-mono text-[0.68rem] text-red"
            style={{ color: "#C77676" }}
          >
            Couldn&apos;t save that change — check your connection and try
            again.
          </div>
        )}
        <div className="mt-10 text-center font-mono text-[0.68rem] text-dim">
          Shared list — anyone with this page can add stages, rank bars, and
          edit entries.
        </div>
      </div>

      {/* Global modals */}
      <InfoModal />
      <VisitedFormModal />
      <VisitedNamePromptModal />
      <WishFormModal />
      <PlacesModal />
      <CrawlModal />
    </div>
  );
}
