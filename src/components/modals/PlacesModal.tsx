"use client";

import { useTour } from "@/lib/tour-context";
import Modal from "./Modal";

export default function PlacesModal() {
  const { placesModal, setPlacesModal, confirmPlaceSelection } = useTour();
  if (!placesModal) return null;

  const { suggestion, results, searching } = placesModal;

  return (
    <Modal onClose={() => setPlacesModal(null)}>
      <h3 className="mt-0 font-serif font-medium text-cream">
        Confirm the location
      </h3>
      <p
        className="mb-0.5 font-mono text-[0.8rem]"
        style={{ color: "#C9A876" }}
      >
        &ldquo;{suggestion.name}&rdquo;
      </p>
      {suggestion.address && (
        <p className="mb-4 font-mono text-[0.7rem] text-mute">
          📍 {suggestion.address}
        </p>
      )}

      {searching ? (
        <div className="py-6 text-center font-mono text-[0.8rem] text-mute">
          Looking up on Google Places…
        </div>
      ) : results.length === 0 ? (
        <div>
          <p className="text-[0.85rem] leading-normal text-cream">
            No matching open bar found on Google Places.
          </p>
          <p className="mb-1 text-[0.85rem] leading-normal text-cream">
            Double check the spelling, or it may be permanently closed.
          </p>
          <div className="mt-4 flex gap-2.5">
            <button
              className="flex-1 cursor-pointer rounded-[5px] border border-line2 bg-transparent px-3 py-2.5 font-mono text-mist"
              onClick={() => setPlacesModal(null)}
            >
              Cancel
            </button>
            <button
              className="flex-1 cursor-pointer rounded-[5px] border-none bg-brass px-3 py-2.5 font-mono font-semibold text-deep"
              onClick={() => confirmPlaceSelection({})}
            >
              Add anyway
            </button>
          </div>
        </div>
      ) : (
        <div>
          <div className="mb-3.5 font-mono text-[0.68rem] uppercase tracking-[0.08em] text-cream">
            Select the correct location
          </div>
          {results.map((r, i) => (
            <div
              key={i}
              className="mb-2 cursor-pointer rounded-lg border border-line2 bg-ink px-4 py-3 transition-colors duration-150 hover:border-brass hover:bg-panelHover"
              onClick={() => confirmPlaceSelection(r)}
            >
              <div className="font-serif text-base font-medium text-cream">
                {r.name}
              </div>
              <div className="mt-1 font-mono text-[0.72rem] leading-[1.4] text-mist">
                {r.address}
              </div>
            </div>
          ))}
          <div className="mt-5 flex gap-2.5">
            <button
              className="flex-1 cursor-pointer rounded-[5px] border border-line2 bg-transparent px-3 py-2.5 font-mono text-mist"
              onClick={() => setPlacesModal(null)}
            >
              Cancel
            </button>
            <button
              className="flex-1 cursor-pointer rounded-[5px] border border-line2 bg-transparent px-3 py-2.5 font-mono text-mist"
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
