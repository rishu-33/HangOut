import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Download } from "lucide-react";

const Lightbox = ({ src, alt = "Image", isOpen, onClose }) => {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[300] flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.88)", backdropFilter: "blur(16px)" }}
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label="Image viewer"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            aria-label="Close image viewer"
            className="absolute top-4 right-4 p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-10"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Download button */}
          <a
            href={src}
            download
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            aria-label="Download image"
            className="absolute top-4 right-16 p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-10"
          >
            <Download className="w-5 h-5" />
          </a>

          {/* Image */}
          <motion.img
            initial={{ scale: 0.88, opacity: 0 }}
            animate={{ scale: 1,    opacity: 1 }}
            exit={{   scale: 0.88, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 26 }}
            src={src}
            alt={alt}
            onClick={(e) => e.stopPropagation()}
            className="max-w-full max-h-[88dvh] rounded-2xl object-contain shadow-2xl"
            draggable={false}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Lightbox;
