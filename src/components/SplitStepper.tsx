import type { SplitStep } from "@/app/split/SplitClient";
import Icon from "./Icon";

const STEPS: { key: SplitStep; label: string }[] = [
  { key: "names", label: "Crew" },
  { key: "placesCount", label: "Places" },
  { key: "receipts", label: "Receipts" },
  { key: "tabs", label: "Divide" },
  { key: "summary", label: "Review" },
];

/** Five steps, always visible — so "how much is left" never has to be
 *  guessed. Numbered circles echo the Crawl modal's numbered stops: one
 *  "here's the sequence" language shared by both multi-step flows. */
export default function SplitStepper({ step }: { step: SplitStep }) {
  const activeIndex = STEPS.findIndex((s) => s.key === step);

  return (
    <div
      className="mb-5 flex items-center"
      role="group"
      aria-label="Split the Bill progress"
    >
      {STEPS.map((s, i) => {
        const done = i < activeIndex;
        const current = i === activeIndex;
        return (
          <div key={s.key} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <span
                aria-current={current ? "step" : undefined}
                className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full font-mono text-[0.7rem] font-semibold transition-colors duration-150 ${
                  done
                    ? "bg-brass text-deep"
                    : current
                      ? "border-[1.5px] border-brass text-gold"
                      : "border border-line2 text-mute"
                }`}
              >
                {done ? <Icon name="check" size={12} /> : i + 1}
              </span>
              <span
                className={`hidden font-mono text-[0.58rem] uppercase tracking-[0.08em] sm:block ${
                  current ? "text-cream" : done ? "text-mist" : "text-mute"
                }`}
              >
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                aria-hidden="true"
                className={`mx-1.5 h-px flex-1 sm:mx-2 ${
                  done ? "bg-brass/50" : "bg-line2"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
