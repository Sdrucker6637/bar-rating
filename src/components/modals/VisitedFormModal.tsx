"use client";

import { useTour } from "@/lib/tour-context";
import Modal from "./Modal";
import { inputCls, primaryBtnCls, secondaryBtnCls } from "@/lib/ui";

export default function VisitedFormModal() {
  const {
    showVisitedForm,
    setShowVisitedForm,
    visitedForm,
    setVisitedForm,
    saveVisitedForm,
  } = useTour();

  if (!showVisitedForm) return null;

  const set = (patch: Partial<typeof visitedForm>) =>
    setVisitedForm({ ...visitedForm, ...patch });

  const scoreFields: Array<[string, keyof typeof visitedForm]> = [
    ["Vibe (0-10)", "vibe"],
    ["Value (0-10)", "value"],
    ["Service (0-10)", "service"],
    ["Food (0-10)", "food"],
    ["Drinks (0-10)", "drinks"],
    ["Bathroom bonus", "bathroomBonus"],
  ];

  return (
    <Modal onClose={() => setShowVisitedForm(false)}>
      <h3 className="mt-0 font-serif font-medium text-cream">
        {visitedForm.id ? "Rank this bar" : "Rank a bar you visited"}
      </h3>
      <form onSubmit={saveVisitedForm}>
        <div className="mb-2.5 flex flex-col gap-1">
          <label className="font-mono text-[0.68rem] uppercase tracking-[0.05em] text-mute">
            Name
          </label>
          <input
            className={inputCls}
            required
            value={visitedForm.name}
            onChange={(e) => set({ name: e.target.value })}
          />
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          {scoreFields.map(([label, key]) => (
            <div key={key} className="mb-2.5 flex flex-col gap-1">
              <label className="font-mono text-[0.68rem] uppercase tracking-[0.05em] text-mute">
                {label}
              </label>
              <input
                className={inputCls}
                type="number"
                step="0.5"
                min="0"
                max="10"
                value={visitedForm[key] as string}
                onChange={(e) => set({ [key]: e.target.value })}
              />
            </div>
          ))}
        </div>
        <div className="mb-2.5 flex flex-col gap-1">
          <label className="font-mono text-[0.68rem] uppercase tracking-[0.05em] text-mute">
            Notes
          </label>
          <input
            className={inputCls}
            value={visitedForm.notes}
            onChange={(e) => set({ notes: e.target.value })}
          />
        </div>
        <div className="mt-4 flex gap-2.5">
          <button
            type="button"
            className={secondaryBtnCls}
            onClick={() => setShowVisitedForm(false)}
          >
            Cancel
          </button>
          <button type="submit" className={primaryBtnCls}>
            {visitedForm.id ? "Save ranking" : "Add to leaderboard"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
