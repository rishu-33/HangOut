import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, X } from "lucide-react";

/**
 * Reusable confirmation modal.
 * Props:
 *   isOpen, onClose, onConfirm,
 *   title, message,
 *   confirmText = "Confirm", cancelText = "Cancel",
 *   isDanger = false
 */
const ConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirm",
  cancelText  = "Cancel",
  isDanger    = false,
}) => {
  const cancelRef = useRef(null);

  /* Keyboard: Escape closes; Tab stays trapped inside */
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    /* focus cancel button on open */
    setTimeout(() => cancelRef.current?.focus(), 50);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-title"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.93, y: 16 }}
            animate={{ opacity: 1, scale: 1,    y: 0  }}
            exit={{   opacity: 0, scale: 0.93, y: 16  }}
            transition={{ type: "spring", stiffness: 340, damping: 28 }}
            className="relative w-full max-w-sm rounded-2xl shadow-xl overflow-hidden"
            style={{
              background: "#151c28",
              border: "1px solid rgba(255,255,255,0.09)",
            }}
          >
            {/* Header */}
            <div className="flex items-start gap-3 p-5 pb-3">
              {isDanger && (
                <div className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center bg-red-500/15 mt-0.5">
                  <AlertTriangle className="w-4.5 h-4.5 text-red-400" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h2
                  id="confirm-title"
                  className="text-base font-semibold text-white/90 leading-snug"
                >
                  {title}
                </h2>
                {message && (
                  <p className="mt-1.5 text-[13px] leading-relaxed text-white/50">
                    {message}
                  </p>
                )}
              </div>
              <button
                onClick={onClose}
                aria-label="Close"
                className="shrink-0 p-1.5 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/8 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Actions */}
            <div className="flex gap-2 justify-end px-5 pb-5 pt-2">
              <button
                ref={cancelRef}
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-sm font-medium text-white/60 hover:text-white/90 hover:bg-white/8 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/40"
              >
                {cancelText}
              </button>
              <button
                onClick={() => { onConfirm(); onClose(); }}
                className={`px-4 py-2 rounded-xl text-sm font-semibold text-white transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 ${
                  isDanger
                    ? "bg-red-500 hover:bg-red-600 focus-visible:outline-red-500"
                    : "bg-accent hover:bg-accent-hover focus-visible:outline-accent"
                }`}
              >
                {confirmText}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ConfirmModal;
