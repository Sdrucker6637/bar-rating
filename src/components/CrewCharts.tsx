"use client";

import { useMemo, useState } from "react";
import type { CrewEntry } from "@/lib/crew";
import { fmt } from "@/lib/scoring";
import { SCORE_CATS } from "./Scorecard";
import type { ScoreKey } from "./Scorecard";
import { SectionRule } from "./Ornament";

/* ------------------------------------------------------------------------
 * By the numbers — two charts under the crew board, both single-hue (brass)
 * so they sit inside the cellar palette without inventing series colors:
 *   PickStrip  — every scored pick as a dot on one 0–10 axis per person,
 *                with their average as a tick: spread vs. consistency.
 *   CatHeatmap — each person's average per category, binned into a brass
 *                ramp: what their picks are actually good at.
 * Identity is carried by the row label, never by color.
 * ---------------------------------------------------------------------- */

/** Zoom the axis to where the picks actually land (scores cluster in the
 *  5–8 band, which a fixed 0–10 axis would crush into one blob), always
 *  ending at 10 and starting on a whole number. */
function axisDomain(entries: CrewEntry[]): { lo: number; ticks: number[] } {
  const all = entries.flatMap((e) => e.picks.map((p) => p.score).filter((v): v is number => v !== null));
  const min = all.length ? Math.min(...all) : 0;
  const lo = Math.max(0, Math.min(Math.floor(min) - 1, 8));
  const step = 10 - lo > 6 ? 2 : 1;
  const ticks: number[] = [];
  for (let t = 10; t >= lo; t -= step) ticks.unshift(t);
  return { lo: ticks[0], ticks };
}

/** Sequential brass ramp, dark → bright, one step per score bin. The last
 *  two steps are light enough to need dark ink. */
const RAMP = ["#2A2119", "#3E3020", "#5A4529", "#7E6136", "#A88248", "#D6B47C"];
const SHORT: Record<ScoreKey, string> = {
  vibe: "Vibe",
  value: "Value",
  service: "Svc",
  food: "Food",
  drinks: "Drink",
};
const BIN_LABELS = ["<4", "4", "5", "6", "7", "8+"];
function binOf(v: number): number {
  if (v < 4) return 0;
  if (v >= 8) return 5;
  return Math.floor(v) - 3; // 4→1 … 7→4
}

function NameCell({ e }: { e: CrewEntry }) {
  return (
    <span className="flex min-w-0 items-center gap-1.5 font-serif text-[0.98rem] text-cream">
      <span className="truncate">{e.name}</span>
    </span>
  );
}

/** Anchored at the center of its (relative) parent. `at` is where that
 *  parent sits across the chart, 0–100, so tooltips near either end open
 *  inward instead of running off screen. */
function Tooltip({ children, at = 50 }: { children: React.ReactNode; at?: number }) {
  const align = at < 18 ? "-translate-x-3" : at > 82 ? "-translate-x-[calc(100%-0.75rem)]" : "-translate-x-1/2";
  return (
    <div
      role="tooltip"
      className={`pointer-events-none absolute bottom-full z-20 mb-2 w-max max-w-[15rem] ${align} animate-[tda-rise_120ms_ease-out] rounded-[3px] border border-line2 bg-oak px-2.5 py-1.5 text-left shadow-menu`}
      style={{ left: "50%" }}
    >
      {children}
    </div>
  );
}

/* ============================ Strip plot ================================ */

function PickStrip({ entries }: { entries: CrewEntry[] }) {
  const [hover, setHover] = useState<string | null>(null);
  const { lo, ticks } = useMemo(() => axisDomain(entries), [entries]);
  const x = (v: number) => ((v - lo) / (10 - lo)) * 100;

  return (
    <figure className="m-0">
      <figcaption className="mb-1 text-[0.86rem] text-mute">
        Each dot is one bar they picked; the tall tick is their average.
      </figcaption>
      <div className="grid grid-cols-[6.75rem_minmax(0,1fr)_2.75rem] gap-x-3 sm:grid-cols-[8rem_minmax(0,1fr)_3.25rem]">
        {entries.map((e) => {
          const scored = e.picks.filter((p) => p.score !== null);
          // Dots that would overlap (within ~a dot's width) get nudged apart
          // vertically, alternating up/down, so none hides behind another.
          const placed: number[] = [];
          return (
            <div key={e.key} className="col-span-3 grid grid-cols-subgrid items-center border-b border-line/70 py-1">
              <NameCell e={e} />
              <div className="relative h-12">
                {/* recessive gridlines */}
                {ticks.map((t) => (
                  <span
                    key={t}
                    aria-hidden="true"
                    className="absolute inset-y-1 w-px bg-line"
                    style={{ left: `${x(t)}%` }}
                  />
                ))}
                {e.average !== null && (
                  <span
                    aria-hidden="true"
                    className="absolute top-1/2 h-7 w-[2px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cream"
                    style={{ left: `${x(e.average)}%` }}
                  />
                )}
                {scored.map((p) => {
                  const s = p.score as number;
                  const n = placed.filter((q) => Math.abs(x(q) - x(s)) < 7).length;
                  placed.push(s);
                  const dy = n === 0 ? 0 : (n % 2 ? -1 : 1) * Math.ceil(n / 2) * 9;
                  const id = `${e.key}:${p.bar.id}`;
                  const on = hover === id;
                  return (
                    <button
                      key={p.bar.id}
                      type="button"
                      aria-label={`${p.bar.name}, ${fmt(s)}${p.rank ? `, #${p.rank} overall` : ""}`}
                      onMouseEnter={() => setHover(id)}
                      onMouseLeave={() => setHover((h) => (h === id ? null : h))}
                      onFocus={() => setHover(id)}
                      onBlur={() => setHover((h) => (h === id ? null : h))}
                      onClick={() => setHover((h) => (h === id ? null : id))}
                      className="absolute top-1/2 flex h-7 w-7 -translate-x-1/2 cursor-pointer items-center justify-center border-none bg-transparent p-0"
                      style={{ left: `${x(s)}%`, marginTop: -14 + dy }}
                    >
                      <span
                        className={`block rounded-full ring-2 ring-panel transition-transform duration-100 ${
                          on ? "h-3.5 w-3.5 bg-gold" : "h-3 w-3 bg-brass/85"
                        }`}
                      />
                      {on && (
                        <Tooltip at={x(s)}>
                          <div className="font-serif text-[0.95rem] leading-tight text-cream">{p.bar.name}</div>
                          <div className="mt-0.5 font-cond text-[0.85rem] font-semibold uppercase tracking-[0.06em] text-mist">
                            <span className="tda-num text-cream">{fmt(s)}</span>
                            {p.rank !== null && <> · #{p.rank} overall</>}
                          </div>
                        </Tooltip>
                      )}
                    </button>
                  );
                })}
              </div>
              <span className="tda-num text-right font-cond text-[1.1rem] font-semibold text-cream">
                {fmt(e.average)}
              </span>
            </div>
          );
        })}
        {/* x axis */}
        <span />
        <div className="relative mt-1 h-4">
          {ticks.map((t) => (
            <span
              key={t}
              className="tda-num absolute -translate-x-1/2 font-cond text-[0.78rem] text-dim"
              style={{ left: `${x(t)}%` }}
            >
              {t}
            </span>
          ))}
        </div>
        <span className="mt-1 text-right font-cond text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-mute">
          avg
        </span>
      </div>
    </figure>
  );
}

/* ============================== Heatmap ================================= */

interface CatRow {
  e: CrewEntry;
  avg: Record<ScoreKey, number | null>;
  n: Record<ScoreKey, number>;
}

function CatHeatmap({ entries }: { entries: CrewEntry[] }) {
  const [hover, setHover] = useState<string | null>(null);

  const rows: CatRow[] = useMemo(
    () =>
      entries.map((e) => {
        const avg = {} as CatRow["avg"];
        const n = {} as CatRow["n"];
        SCORE_CATS.forEach(({ key }) => {
          const vals = e.picks
            .filter((p) => !p.bar.disqualified)
            .map((p) => p.bar[key])
            .filter((v): v is number => v !== null && v !== undefined && !isNaN(Number(v)))
            .map(Number);
          n[key] = vals.length;
          avg[key] = vals.length ? vals.reduce((a, c) => a + c, 0) / vals.length : null;
        });
        return { e, avg, n };
      }),
    [entries],
  );

  // The best average in each column gets a brass underline — the
  // "who to ask for X" read.
  const colBest = useMemo(() => {
    const out = {} as Record<ScoreKey, number | null>;
    SCORE_CATS.forEach(({ key }) => {
      const vals = rows.map((r) => r.avg[key]).filter((v): v is number => v !== null);
      out[key] = vals.length > 1 ? Math.max(...vals) : null;
    });
    return out;
  }, [rows]);

  return (
    <figure className="m-0">
      <figcaption className="mb-3 text-[0.86rem] text-mute">
        Average score per category across each person&apos;s picks — brighter is better; the diamond marks the crew&apos;s best in that column.
      </figcaption>
      <table className="w-full table-fixed border-separate border-spacing-[3px]">
        <thead>
          <tr>
            <th className="w-[6.75rem] sm:w-[8rem]" />
            {SCORE_CATS.map((c) => (
              <th
                key={c.key}
                scope="col"
                className="pb-1 text-center font-cond text-[0.72rem] font-semibold uppercase tracking-[0.04em] text-mute sm:text-[0.78rem] sm:tracking-[0.08em]"
              >
                <abbr title={c.label} className="no-underline">
                  {SHORT[c.key]}
                </abbr>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(({ e, avg, n }) => (
            <tr key={e.key}>
              <th scope="row" className="pr-2 text-left font-normal">
                <NameCell e={e} />
              </th>
              {SCORE_CATS.map((c) => {
                const v = avg[c.key];
                const id = `${e.key}:${c.key}`;
                const on = hover === id;
                if (v === null)
                  return (
                    <td key={c.key} className="h-10 rounded-[3px] border border-dashed border-line text-center text-dim">
                      —
                    </td>
                  );
                const bin = binOf(v);
                const best = colBest[c.key] !== null && Math.abs(v - (colBest[c.key] as number)) < 1e-9;
                return (
                  <td
                    key={c.key}
                    tabIndex={0}
                    aria-label={`${e.name}, ${c.label}: ${fmt(v)} average over ${n[c.key]} pick${n[c.key] === 1 ? "" : "s"}`}
                    onMouseEnter={() => setHover(id)}
                    onMouseLeave={() => setHover((h) => (h === id ? null : h))}
                    onFocus={() => setHover(id)}
                    onBlur={() => setHover((h) => (h === id ? null : h))}
                    className={`relative h-10 cursor-default rounded-[3px] text-center outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-brass ${
                      on ? "shadow-[inset_0_0_0_1.5px_rgba(241,232,214,0.7)]" : ""
                    }`}
                    style={{ background: RAMP[bin] }}
                  >
                    <span
                      className={`tda-num font-cond text-[0.98rem] font-semibold ${
                        bin >= 4 ? "text-deep" : "text-cream"
                      }`}
                    >
                      {v.toFixed(1)}
                    </span>
                    {best && (
                      <span
                        aria-hidden="true"
                        className="absolute right-1 top-1 h-1.5 w-1.5 rotate-45 bg-cream"
                      />
                    )}
                    {on && (
                      <Tooltip at={c.key === "vibe" ? 0 : c.key === "drinks" ? 100 : 50}>
                        <div className="font-serif text-[0.95rem] leading-tight text-cream">
                          {e.name} · {c.label}
                        </div>
                        <div className="mt-0.5 text-[0.82rem] text-mist">
                          <span className="tda-num font-cond text-[0.95rem] font-semibold text-cream">{fmt(v)}</span>{" "}
                          avg over {n[c.key]} pick{n[c.key] === 1 ? "" : "s"}
                          {best && <span className="text-gold"> · best in crew</span>}
                        </div>
                      </Tooltip>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {/* ramp legend */}
      <div className="mt-3 flex items-center justify-end gap-2 font-cond text-[0.78rem] text-dim">
        <span>low</span>
        <div className="flex gap-[2px]">
          {RAMP.map((c, i) => (
            <span key={c} className="flex flex-col items-center gap-0.5">
              <span className="block h-2.5 w-6 rounded-[2px]" style={{ background: c }} />
              <span className="tda-num">{BIN_LABELS[i]}</span>
            </span>
          ))}
        </div>
        <span>high</span>
      </div>
    </figure>
  );
}

export default function CrewCharts({ entries }: { entries: CrewEntry[] }) {
  return (
    <section aria-label="Crew charts" className="mt-10">
      <SectionRule label="By the numbers" />
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="min-w-0 rounded-[4px] border border-line bg-panel px-4 pb-4 pt-4 sm:px-5">
          <h3 className="m-0 mb-1 font-serif text-[1.15rem] font-semibold text-cream">Every pick, plotted</h3>
          <PickStrip entries={entries} />
        </div>
        <div className="min-w-0 rounded-[4px] border border-line bg-panel px-4 pb-4 pt-4 sm:px-5">
          <h3 className="m-0 mb-1 font-serif text-[1.15rem] font-semibold text-cream">What their picks are good at</h3>
          <CatHeatmap entries={entries} />
        </div>
      </div>
    </section>
  );
}
