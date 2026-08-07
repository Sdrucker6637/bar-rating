"use client";

import { useTour } from "@/lib/tour-context";
import Modal from "./Modal";
import { inputCls } from "@/lib/ui";

export default function VisitedNamePromptModal() {
  const {
    showVisitedNamePrompt,
    setShowVisitedNamePrompt,
    visitedNameInput,
    setVisitedNameInput,
    visitedHoodInput,
    setVisitedHoodInput,
    startPlacesLookup,
  } = useTour();

  if (!showVisitedNamePrompt) return null;

  return (
    <Modal onClose={() => setShowVisitedNamePrompt(false)}>
      <h3 className="mt-0 font-serif font-medium text-cream">
        Which bar did you visit?
      </h3>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!visitedNameInput.trim()) return;
          setShowVisitedNamePrompt(false);
          startPlacesLookup({
            name: visitedNameInput.trim(),
            neighborhood: visitedHoodInput.trim(),
            _placeIntent: "visited",
          });
          setVisitedNameInput("");
          setVisitedHoodInput("");
        }}
      >
        <div className="mb-2.5 flex flex-col gap-1">
          <label className="font-mono text-[0.68rem] uppercase tracking-[0.05em] text-mute">
            Bar name
          </label>
          <input
            className={inputCls}
            required
            autoFocus
            placeholder="e.g. The Dead Rabbit"
            value={visitedNameInput}
            onChange={(e) => setVisitedNameInput(e.target.value)}
          />
        </div>
        <div className="mb-2.5 flex flex-col gap-1">
          <label className="font-mono text-[0.68rem] uppercase tracking-[0.05em] text-mute">
            Neighborhood (optional)
          </label>
          <input
            className={inputCls}
            placeholder="e.g. East Village"
            value={visitedHoodInput}
            onChange={(e) => setVisitedHoodInput(e.target.value)}
          />
        </div>
        <div className="mt-4 flex gap-2.5">
          <button
            type="button"
            className="flex-1 cursor-pointer rounded-[5px] border border-line2 bg-transparent px-3 py-2.5 font-mono text-mist"
            onClick={() => setShowVisitedNamePrompt(false)}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="flex-1 cursor-pointer rounded-[5px] border-none bg-brass px-3 py-2.5 font-mono font-semibold text-deep"
          >
            Look up
          </button>
        </div>
      </form>
    </Modal>
  );
}
