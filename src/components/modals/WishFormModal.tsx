"use client";

import { useTour } from "@/lib/tour-context";
import Modal from "./Modal";
import { inputCls } from "@/lib/ui";

export default function WishFormModal() {
  const { showWishForm, setShowWishForm, wishForm, setWishForm, saveWishForm } =
    useTour();

  if (!showWishForm) return null;

  return (
    <Modal onClose={() => setShowWishForm(false)}>
      <h3 className="mt-0 font-serif font-medium text-cream">Add to wishlist</h3>
      <form onSubmit={saveWishForm}>
        <div className="mb-2.5 flex flex-col gap-1">
          <label className="font-mono text-[0.68rem] uppercase tracking-[0.05em] text-mute">
            Name
          </label>
          <input
            className={inputCls}
            required
            value={wishForm.name}
            onChange={(e) => setWishForm({ ...wishForm, name: e.target.value })}
          />
        </div>
        <div className="mb-2.5 flex flex-col gap-1">
          <label className="font-mono text-[0.68rem] uppercase tracking-[0.05em] text-mute">
            Neighborhood (optional)
          </label>
          <input
            className={inputCls}
            value={wishForm.neighborhood}
            onChange={(e) =>
              setWishForm({ ...wishForm, neighborhood: e.target.value })
            }
          />
        </div>
        <div className="mb-2.5 flex flex-col gap-1">
          <label className="font-mono text-[0.68rem] uppercase tracking-[0.05em] text-mute">
            Notes
          </label>
          <input
            className={inputCls}
            value={wishForm.notes}
            onChange={(e) => setWishForm({ ...wishForm, notes: e.target.value })}
          />
        </div>
        <div className="mt-4 flex gap-2.5">
          <button
            type="button"
            className="flex-1 cursor-pointer rounded-[5px] border border-line2 bg-transparent px-3 py-2.5 font-mono text-mist"
            onClick={() => setShowWishForm(false)}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="flex-1 cursor-pointer rounded-[5px] border-none bg-brass px-3 py-2.5 font-mono font-semibold text-deep"
          >
            Add to wishlist
          </button>
        </div>
      </form>
    </Modal>
  );
}
