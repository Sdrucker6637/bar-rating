"use client";

import { useTour } from "@/lib/tour-context";
import Modal from "./Modal";
import {
  inputCls,
  labelCls,
  modalTitleCls,
  primaryBtnCls,
  secondaryBtnCls,
} from "@/lib/ui";

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
      <h3 className={`${modalTitleCls} mb-5`}>
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
        <div className="mb-3.5 flex flex-col gap-1.5">
          <label className={labelCls}>
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
        <div className="mb-3.5 flex flex-col gap-1.5">
          <label className={labelCls}>
            Neighborhood (optional)
          </label>
          <input
            className={inputCls}
            placeholder="e.g. East Village"
            value={visitedHoodInput}
            onChange={(e) => setVisitedHoodInput(e.target.value)}
          />
        </div>
        <div className="mt-6 flex gap-2.5">
          <button
            type="button"
            className={secondaryBtnCls}
            onClick={() => setShowVisitedNamePrompt(false)}
          >
            Cancel
          </button>
          <button type="submit" className={primaryBtnCls}>
            Look up
          </button>
        </div>
      </form>
    </Modal>
  );
}
