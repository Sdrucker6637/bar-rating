"use client";

import { useMemo } from "react";
import { useTour } from "@/lib/tour-context";
import { knownPickers, matchKnownPicker, pickerKey } from "@/lib/crew";
import Modal from "./Modal";
import Icon from "../Icon";
import {
  chipActiveCls,
  chipCls,
  inputCls,
  labelCls,
  modalTitleCls,
  primaryBtnCls,
  secondaryBtnCls,
  segmentBtnActiveCls,
  segmentBtnCls,
  segmentWrapCls,
} from "@/lib/ui";

export default function VisitedFormModal() {
  const {
    showVisitedForm,
    setShowVisitedForm,
    visitedForm,
    setVisitedForm,
    saveVisitedForm,
    bars,
  } = useTour();

  // Everyone who's ever picked a bar — one tap to credit them again.
  const crew = useMemo(() => knownPickers(bars || []).slice(0, 8), [bars]);

  if (!showVisitedForm) return null;

  const typedKey = pickerKey(visitedForm.addedBy);
  const matched = matchKnownPicker(bars || [], visitedForm.addedBy);

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
      <h3 className={`${modalTitleCls} mb-5`}>
        {visitedForm.id ? "Rank this bar" : "Rank a bar you visited"}
      </h3>
      <form onSubmit={saveVisitedForm}>
        <div className="mb-3.5 flex flex-col gap-1.5">
          <label className={labelCls}>
            Name
          </label>
          <input
            className={inputCls}
            required
            value={visitedForm.name}
            onChange={(e) => set({ name: e.target.value })}
          />
        </div>
        <div className="grid grid-cols-2 gap-x-3 sm:grid-cols-3">
          {scoreFields.map(([label, key]) => (
            <div key={key} className="mb-3.5 flex flex-col gap-1.5">
              <label className={labelCls}>
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
        <fieldset className="mb-3.5 mt-1 rounded-[3px] border border-line2 bg-panel/60 px-3.5 pb-3.5 pt-3">
          <legend className="sr-only">Who picked this bar?</legend>
          <div className="mb-2.5 flex items-center justify-between gap-3">
            <span className={labelCls} aria-hidden="true">
              Picked by
            </span>
            <div
              role="group"
              aria-label="Who picked this bar"
              className={segmentWrapCls}
            >
              <button
                type="button"
                aria-pressed={!visitedForm.appPicked}
                onClick={() => set({ appPicked: false })}
                className={`${segmentBtnCls} ${
                  !visitedForm.appPicked ? segmentBtnActiveCls : ""
                }`}
              >
                <Icon name="users" size={13} />
                Person
              </button>
              <button
                type="button"
                aria-pressed={visitedForm.appPicked}
                onClick={() => set({ appPicked: true })}
                className={`${segmentBtnCls} ${
                  visitedForm.appPicked ? segmentBtnActiveCls : ""
                }`}
              >
                <Icon name="dice" size={13} />
                The app
              </button>
            </div>
          </div>

          {visitedForm.appPicked ? (
            <p className="m-0 font-serif text-[0.95rem] italic leading-snug text-mist">
              The app gets the credit — this one counts toward{" "}
              <span className="not-italic text-gold">The App</span> on the
              crew board.
            </p>
          ) : (
            <>
              <input
                className={inputCls}
                placeholder="Who found it? e.g. Spencer"
                aria-label="Name of who picked this bar"
                autoComplete="off"
                maxLength={40}
                value={visitedForm.addedBy}
                onChange={(e) => set({ addedBy: e.target.value })}
              />
              {crew.length > 0 && (
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {crew.map((name) => {
                    const on = typedKey === pickerKey(name);
                    return (
                      <button
                        key={name}
                        type="button"
                        aria-pressed={on}
                        onClick={() => set({ addedBy: on ? "" : name })}
                        className={`${chipCls} h-8 px-2.5 normal-case tracking-normal ${
                          on ? chipActiveCls : ""
                        }`}
                      >
                        {on && <Icon name="check" size={12} className="text-gold" />}
                        <span className="font-serif text-[0.92rem] font-normal">
                          {name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
              {typedKey && (
                <div className="mt-2 text-[0.8rem] text-mute">
                  {matched ? (
                    <>
                      Counts toward{" "}
                      <span className="text-gold">{matched}</span>&apos;s picks
                    </>
                  ) : (
                    <>New to the crew board</>
                  )}
                </div>
              )}
            </>
          )}
        </fieldset>
        <div className="mb-3.5 flex flex-col gap-1.5">
          <label className={labelCls}>
            Notes
          </label>
          <input
            className={inputCls}
            value={visitedForm.notes}
            onChange={(e) => set({ notes: e.target.value })}
          />
        </div>
        <div className="mt-6 flex gap-2.5">
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
