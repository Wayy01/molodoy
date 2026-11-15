"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

/**
 * Native <dialog> (focus trap, Esc, inert background for free).
 * Bottom sheet on phones, centered panel from `sm` up.
 */
export function Dialog({
  open,
  onClose,
  title,
  children,
  footer,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className={cn(
        "m-0 mt-auto max-h-[92dvh] w-full max-w-none overflow-hidden rounded-t-3xl border border-line bg-surface p-0 text-fg shadow-card",
        "backdrop:bg-black/60 backdrop:backdrop-blur-sm",
        "sm:m-auto sm:max-w-lg sm:rounded-2xl",
        "open:animate-[dialog-in_220ms_cubic-bezier(0.16,1,0.3,1)]",
        className,
      )}
    >
      <div className="flex max-h-[92dvh] flex-col">
        {title ? (
          <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-4">
            <h2 className="text-base font-semibold">{title}</h2>
            <button type="button" onClick={onClose} className="-mr-2 rounded-full p-2 text-muted hover:bg-surface-2 hover:text-fg" aria-label="Close">
              <X size={18} />
            </button>
          </div>
        ) : null}
        <div className="overflow-y-auto px-5 py-5">{children}</div>
        {footer ? <div className="flex justify-end gap-2 border-t border-line px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">{footer}</div> : null}
      </div>
    </dialog>
  );
}
