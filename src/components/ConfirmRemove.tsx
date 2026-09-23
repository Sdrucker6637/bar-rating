"use client";

import { createPortal } from "react-dom";
import Modal from "./modals/Modal";
import { modalTitleCls, secondaryBtnCls } from "@/lib/ui";

/** Confirmation safeguard before removing a shared-list entry — the one
 *  place the claret destructive color is allowed to be loud. Rendered
 *  through a portal so no clipping ancestor can hide it. */
export default function ConfirmRemove({
  name,
  listName,
  onCancel,
  onConfirm,
}: {
  name: string;
  listName: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return createPortal(
    <Modal onClose={onCancel}>
      <h3 className={modalTitleCls}>Remove {name}?</h3>
      <p className="mb-0 mt-2.5 text-[0.92rem] leading-relaxed text-mist">
        Are you sure you want to remove {name} from the {listName}?
      </p>
      <div className="mt-6 flex gap-2.5">
        <button autoFocus className={secondaryBtnCls} onClick={onCancel}>
          Cancel
        </button>
        <button
          className="inline-flex h-11 flex-1 cursor-pointer items-center justify-center rounded-[3px] bg-claret px-4 font-cond text-[0.95rem] font-semibold uppercase tracking-[0.07em] text-cream transition-colors hover:bg-[#B9514A] active:translate-y-px"
          onClick={onConfirm}
        >
          Remove
        </button>
      </div>
    </Modal>,
    document.body,
  );
}
