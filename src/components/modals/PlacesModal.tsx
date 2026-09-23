"use client";

import { useTour } from "@/lib/tour-context";
import Modal from "./Modal";
import { modalTitleCls, primaryBtnCls, secondaryBtnCls } from "@/lib/ui";
import Icon from "../Icon";

export default function PlacesModal() {
  const { placesModal, setPlacesModal, confirmPlaceSelection } = useTour();
  if (!placesModal) return null;

  const { suggestion, results, searching } = placesModal;

  return (
    <Modal onClose={() => setPlacesModal(null)}>
      <h3 className={modalTitleCls}>Confirm the location</h3>
      <p className="mb-0.5 mt-2 font-serif text-[1.05rem] italic text-cream">
        &ldquo;{suggestion.name}&rdquo;
      </p>
      {suggestion.address && (
        <p className="mb-4 mt-1 flex items-center gap-1.5 text-[0.84rem] text-mute">
          <Icon name="pin" size={12} />
          {suggestion.address}
        </p>
      )}

      {searching ? (
        <div className="animate-[tda-pulse_1.6s_ease-in-out_infinite] py-8 text-center font-serif text-[0.98rem] italic text-mute">
          Looking up on Google Places…
        </div>
      ) : results.length === 0 ? (
        <div>
          <p className="mt-4 text-[0.92rem] leading-normal text-cream">
            No matching open bar found on Google Places.
          </p>
          <p className="mb-1 text-[0.92rem] leading-normal text-mist">
            Double check the spelling, or it may be permanently closed.
          </p>
          <div className="mt-6 flex gap-2.5">
            <button
              className={secondaryBtnCls}
              onClick={() => setPlacesModal(null)}
            >
              Cancel
            </button>
            <button
              className={primaryBtnCls}
              onClick={() => confirmPlaceSelection({})}
            >
              Add anyway
            </button>
          </div>
        </div>
      ) : (
        <div>
          <div className="mb-3 mt-4 font-cond text-kicker font-semibold uppercase text-mute">
            Select the correct location
          </div>
          {results.map((r, i) => (
            <div
              key={i}
              className="mb-2 cursor-pointer rounded-[4px] border border-line2 bg-panel px-4 py-3 transition-colors duration-150 hover:border-brass/70 hover:bg-[#2A221C]"
              onClick={() => confirmPlaceSelection(r)}
            >
              <div className="font-serif text-[1.08rem] font-semibold text-cream">
                {r.name}
              </div>
              <div className="mt-1 text-[0.84rem] leading-[1.4] text-mist">
                {r.address}
              </div>
            </div>
          ))}
          <div className="mt-6 flex gap-2.5">
            <button
              className={secondaryBtnCls}
              onClick={() => setPlacesModal(null)}
            >
              Cancel
            </button>
            <button
              className={secondaryBtnCls}
              onClick={() => confirmPlaceSelection({})}
            >
              None of these — add anyway
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
