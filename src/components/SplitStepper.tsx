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
 *  guessed. Numbered stages with a brass rule that fills as you go; the
 *  same numbered-stage language as the crawl route. */
export default function SplitStepper({ step }: { step: SplitStep }) {
  const activeIndex = STEPS.findIndex((s) => s.key === step);

  return (
    <div className="mb-6" role="group" aria-label="Split the Bill progress">
      <div className="grid grid-cols-5 gap-1.5">
        {STEPS.map((s, i) => {
          const done = i < activeIndex;
          const current = i === activeIndex;
          return (
            <div key={s.key} className="min-w-0">
              <span
                aria-hidden="true"
                className={`block h-[3px] rounded-[1px] transition-colors duration-200 ${
                  done || current ? "bg-brass" : "bg-line2"
                } ${current ? "opacity-100" : done ? "opacity-60" : ""}`}
              />
              <div
                aria-current={current ? "step" : undefined}
                className={`mt-2 flex items-center gap-1.5 font-cond font-semibold uppercase tracking-[0.08em] ${
                  current ? "text-cream" : done ? "text-mist" : "text-mute"
                }`}
              >
                <span className="tda-num text-[1rem]">
                  {done ? (
                    <Icon name="check" size={13} className="text-gold" />
                  ) : (
                    String(i + 1).padStart(2, "0")
                  )}
                </span>
                <span
                  className={`truncate text-[0.88rem] ${current ? "inline" : "hidden sm:inline"}`}
                >
                  {s.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
