"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import type { ReactNode } from "react";

interface ModalProps {
  onClose: () => void;
  children: ReactNode;
  maxWidth?: string;
}

export default function Modal({
  onClose,
  children,
  maxWidth = "460px",
}: ModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Portaled to <body> so no transformed/animated ancestor can become the
  // containing block for this fixed overlay.
  if (typeof document === "undefined") return null;
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex animate-[tda-fade_160ms_ease-out] items-center justify-center p-4 backdrop-blur-[2px]"
      style={{ background: "rgba(8,6,5,0.8)" }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="relative max-h-[88vh] w-full animate-[tda-modal-in_220ms_cubic-bezier(0.2,0.7,0.2,1)] overflow-y-auto rounded-[4px] border border-line2 bg-oak p-5 shadow-panel sm:p-7"
        style={{ maxWidth }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* a brass printer's rule across the top edge */}
        <span
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-[2px] bg-brass/70"
        />
        {children}
      </div>
    </div>,
    document.body,
  );
}
