import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";
import { EASE_OUT } from "./motion";
import { cn } from "../../lib/utils";

const SIZES = {
  sm: "max-w-md",
  md: "max-w-xl",
  lg: "max-w-3xl",
  xl: "max-w-5xl",
};

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: keyof typeof SIZES;
}) {
  const reduced = useReducedMotion();

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 backdrop-blur-sm sm:p-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16, ease: EASE_OUT }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) onClose();
          }}
          role="dialog"
          aria-modal="true"
        >
          <motion.div
            initial={reduced ? false : { opacity: 0, y: 12, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.99 }}
            transition={{ duration: 0.2, ease: EASE_OUT }}
            className={cn(
              "my-auto w-full overflow-hidden rounded-[2rem] bg-white shadow-[var(--shadow-float)] ring-1 ring-slate-200/60 dark:bg-card-dark dark:ring-border-dark/70",
              SIZES[size],
            )}
          >
            <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-4">
              <div className="min-w-0">
                <h2 className="font-display text-lg font-medium tracking-tight text-slate-900 dark:text-white">
                  {title}
                </h2>
                {description && (
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close dialog"
                className="focus-ring -mt-1 rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="max-h-[70vh] overflow-y-auto px-6 py-2">{children}</div>
            {footer && (
              <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-100/80 bg-surface-muted/40 px-6 py-4 dark:border-slate-800/70 dark:bg-slate-800/30">
                {footer}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
