import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Check } from 'lucide-react';

// ── Theme definitions ─────────────────────────────────────────────────────────
// Using inline `style` objects so Tailwind purge never strips them.
export const backgrounds = [
  {
    id: 'default',
    name: 'Void',
    emoji: '🌑',
    style: { background: '#110e12' },
    previewStyle: { background: 'linear-gradient(135deg,#1a151b 0%,#110e12 100%)' },
  },
  {
    id: 'midnight-blue',
    name: 'Midnight',
    emoji: '🌊',
    style: { background: 'linear-gradient(160deg, #060d1f 0%, #0a1628 40%, #0d0f1a 100%)' },
    previewStyle: { background: 'linear-gradient(135deg,#060d1f,#0d1f3c)' },
  },
  {
    id: 'aurora',
    name: 'Aurora',
    emoji: '🌌',
    style: {
      background: 'linear-gradient(160deg, #0d0f1f 0%, #0f1a2e 30%, #0d1a1a 60%, #0a0f0a 100%)',
    },
    previewStyle: { background: 'linear-gradient(135deg,#0d0f1f,#0a2a1a,#1a0a2a)' },
  },
  {
    id: 'ember',
    name: 'Ember',
    emoji: '🔥',
    style: { background: 'linear-gradient(160deg, #1a0a05 0%, #1f0d08 40%, #120909 100%)' },
    previewStyle: { background: 'linear-gradient(135deg,#2a1005,#1f0d08,#120505)' },
  },
  {
    id: 'galaxy',
    name: 'Galaxy',
    emoji: '✨',
    style: { background: 'linear-gradient(160deg, #0d0a1f 0%, #15102a 40%, #0d0d1a 100%)' },
    previewStyle: { background: 'linear-gradient(135deg,#0d0a1f,#15102a,#0a0a0d)' },
  },
  {
    id: 'forest',
    name: 'Forest',
    emoji: '🌿',
    style: { background: 'linear-gradient(160deg, #050e08 0%, #081409 40%, #060e08 100%)' },
    previewStyle: { background: 'linear-gradient(135deg,#050e08,#0a1f0d,#040906)' },
  },
  {
    id: 'rose-dark',
    name: 'Rose Noir',
    emoji: '🌹',
    style: { background: 'linear-gradient(160deg, #1a070e 0%, #200a12 40%, #130709 100%)' },
    previewStyle: { background: 'linear-gradient(135deg,#1a070e,#200a12,#0d0407)' },
  },
  {
    id: 'slate',
    name: 'Slate',
    emoji: '🩶',
    style: { background: 'linear-gradient(160deg, #0a0c10 0%, #0f1217 40%, #0c0e12 100%)' },
    previewStyle: { background: 'linear-gradient(135deg,#0a0c10,#141820,#0a0c10)' },
  },
  {
    id: 'grid',
    name: 'Grid',
    emoji: '⬛',
    style: {
      backgroundColor: '#0d0d0d',
      backgroundImage:
        'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
      backgroundSize: '40px 40px',
    },
    previewStyle: {
      backgroundColor: '#0d0d0d',
      backgroundImage:
        'linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)',
      backgroundSize: '20px 20px',
    },
  },
  {
    id: 'dots',
    name: 'Cosmos',
    emoji: '🔮',
    style: {
      backgroundColor: '#0a090f',
      backgroundImage: 'radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px)',
      backgroundSize: '22px 22px',
    },
    previewStyle: {
      backgroundColor: '#0a090f',
      backgroundImage: 'radial-gradient(rgba(255,255,255,0.12) 1px, transparent 1px)',
      backgroundSize: '12px 12px',
    },
  },
  {
    id: 'warm-dark',
    name: 'Walnut',
    emoji: '🪵',
    style: { background: 'linear-gradient(160deg, #120e08 0%, #1a1208 40%, #110e07 100%)' },
    previewStyle: { background: 'linear-gradient(135deg,#120e08,#1a1208,#0d0b06)' },
  },
  {
    id: 'cyber',
    name: 'Cyber',
    emoji: '⚡',
    style: {
      backgroundColor: '#060811',
      backgroundImage:
        'linear-gradient(rgba(0,180,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(0,180,255,0.025) 1px, transparent 1px)',
      backgroundSize: '50px 50px',
    },
    previewStyle: {
      backgroundColor: '#060811',
      backgroundImage:
        'linear-gradient(rgba(0,180,255,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(0,180,255,0.07) 1px, transparent 1px)',
      backgroundSize: '20px 20px',
    },
  },
];

// ── Helper to get a background's style by id ──────────────────────────────────
export function getBgStyle(id) {
  return backgrounds.find((b) => b.id === id)?.style || backgrounds[0].style;
}

// ── BackgroundSelector modal ──────────────────────────────────────────────────
const BackgroundSelector = ({ currentBackground, onChange, onClose }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(12px)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.93, opacity: 0, y: 12 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.93, opacity: 0, y: 12 }}
        transition={{ type: 'spring', stiffness: 320, damping: 28 }}
        className="w-full max-w-lg max-h-[82vh] overflow-hidden rounded-2xl flex flex-col"
        style={{
          background: 'rgba(20,16,22,0.97)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(196,107,74,0.15)', border: '1px solid rgba(196,107,74,0.25)' }}
            >
              <Sparkles className="w-4 h-4" style={{ color: '#c46b4a' }} />
            </div>
            <div>
              <p className="text-[13px] font-semibold text-white/90 leading-tight">Chat Theme</p>
              <p className="text-[11px] text-white/35 leading-tight mt-0.5">Pick your vibe</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-white/40 hover:text-white/80 transition-colors"
            style={{ background: 'rgba(255,255,255,0.05)' }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Grid */}
        <div className="overflow-y-auto p-4" style={{ scrollbarWidth: 'thin' }}>
          <div className="grid grid-cols-3 gap-3">
            {backgrounds.map((bg) => {
              const isActive = currentBackground === bg.id;
              return (
                <motion.button
                  key={bg.id}
                  onClick={() => { onChange(bg.id); onClose(); }}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="relative rounded-xl overflow-hidden text-left group"
                  style={{
                    border: isActive
                      ? '2px solid rgba(196,107,74,0.8)'
                      : '2px solid rgba(255,255,255,0.07)',
                    boxShadow: isActive ? '0 0 16px rgba(196,107,74,0.25)' : 'none',
                  }}
                >
                  {/* Preview swatch */}
                  <div
                    className="w-full h-20 relative"
                    style={bg.previewStyle}
                  >
                    {/* Fake chat bubbles inside preview */}
                    <div className="absolute bottom-2 left-2 right-2 flex flex-col gap-1">
                      <div
                        className="self-start rounded-lg px-2 py-0.5"
                        style={{ background: 'rgba(255,255,255,0.12)', width: '55%', height: '8px' }}
                      />
                      <div
                        className="self-end rounded-lg"
                        style={{ background: 'rgba(196,107,74,0.5)', width: '40%', height: '8px' }}
                      />
                    </div>

                    {/* Active checkmark */}
                    {isActive && (
                      <div
                        className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center"
                        style={{ background: '#c46b4a' }}
                      >
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </div>

                  {/* Label */}
                  <div
                    className="px-2.5 py-2 flex items-center gap-1.5"
                    style={{ background: 'rgba(0,0,0,0.5)' }}
                  >
                    <span className="text-[11px]">{bg.emoji}</span>
                    <span className="text-[11px] font-medium text-white/75 truncate">{bg.name}</span>
                  </div>
                </motion.button>
              );
            })}
          </div>

          <p className="text-center text-[10.5px] mt-4 pb-1" style={{ color: 'rgba(255,255,255,0.2)' }}>
            Saved to your browser — unique per room
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default BackgroundSelector;
