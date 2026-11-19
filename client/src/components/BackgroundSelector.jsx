import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Check } from 'lucide-react';

// ── Enhanced Theme definitions with modern gradients ──────────────────────────
export const backgrounds = [
  {
    id: 'default',
    name: 'Void',
    emoji: '🌑',
    style: { background: '#0a0e14' },
    previewStyle: { background: 'linear-gradient(135deg,#0a0e14 0%,#1a1520 100%)' },
  },
  {
    id: 'midnight-ocean',
    name: 'Midnight Ocean',
    emoji: '🌊',
    style: { 
      background: 'linear-gradient(160deg, #0a1628 0%, #1a2f45 30%, #0f1f35 70%, #08121f 100%)',
      backgroundAttachment: 'fixed'
    },
    previewStyle: { background: 'linear-gradient(135deg,#0a1628,#1a2f45,#0f1f35)' },
  },
  {
    id: 'aurora-borealis',
    name: 'Aurora',
    emoji: '🌌',
    style: {
      background: 'linear-gradient(160deg, #0d1f2f 0%, #1a2d45 20%, #2a3f5f 40%, #1a2535 70%, #0a1520 100%)',
      backgroundAttachment: 'fixed'
    },
    previewStyle: { background: 'linear-gradient(135deg,#0d1f2f,#2a3f5f,#1a2535)' },
  },
  {
    id: 'purple-haze',
    name: 'Purple Haze',
    emoji: '💜',
    style: { 
      background: 'linear-gradient(160deg, #1a0f2e 0%, #2d1b4e 30%, #1f1535 70%, #0f0a1a 100%)',
      backgroundAttachment: 'fixed'
    },
    previewStyle: { background: 'linear-gradient(135deg,#1a0f2e,#2d1b4e,#1f1535)' },
  },
  {
    id: 'emerald-forest',
    name: 'Forest',
    emoji: '🌲',
    style: { 
      background: 'linear-gradient(160deg, #0a1f0f 0%, #1a3525 30%, #0f2518 70%, #05120a 100%)',
      backgroundAttachment: 'fixed'
    },
    previewStyle: { background: 'linear-gradient(135deg,#0a1f0f,#1a3525,#0f2518)' },
  },
  {
    id: 'sunset-blaze',
    name: 'Sunset',
    emoji: '🌅',
    style: { 
      background: 'linear-gradient(160deg, #2a1510 0%, #451f15 30%, #2f1812 70%, #1a0f08 100%)',
      backgroundAttachment: 'fixed'
    },
    previewStyle: { background: 'linear-gradient(135deg,#2a1510,#451f15,#2f1812)' },
  },
  {
    id: 'cosmic-nebula',
    name: 'Nebula',
    emoji: '✨',
    style: { 
      background: 'linear-gradient(160deg, #1f0a2e 0%, #3f1a5f 30%, #2a1545 70%, #15082a 100%)',
      backgroundAttachment: 'fixed'
    },
    previewStyle: { background: 'linear-gradient(135deg,#1f0a2e,#3f1a5f,#2a1545)' },
  },
  {
    id: 'arctic-frost',
    name: 'Arctic',
    emoji: '❄️',
    style: { 
      background: 'linear-gradient(160deg, #0f1f2f 0%, #1a3545 30%, #0f2535 70%, #0a1520 100%)',
      backgroundAttachment: 'fixed'
    },
    previewStyle: { background: 'linear-gradient(135deg,#0f1f2f,#1a3545,#0f2535)' },
  },
];

export function getBgStyle(id) {
  return backgrounds.find(b => b.id === id)?.style || backgrounds[0].style;
}

// ── BackgroundSelector modal ──────────────────────────────────────────────────
const BackgroundSelector = ({ currentBackground, onChange, onClose }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(12px)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        className="w-full max-w-2xl max-h-[85vh] overflow-hidden rounded-3xl flex flex-col"
        style={{
          background: 'linear-gradient(135deg, rgba(20,25,40,0.98) 0%, rgba(15,18,30,0.99) 100%)',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.8)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.08]">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center"
              style={{ 
                background: 'linear-gradient(135deg, rgba(100,180,255,0.2), rgba(80,150,220,0.3))',
                border: '1px solid rgba(100,180,255,0.3)',
                boxShadow: '0 4px 12px rgba(100,180,255,0.2)'
              }}
            >
              <Sparkles className="w-5 h-5" style={{ color: '#6495ed' }} />
            </div>
            <div>
              <p className="text-base font-bold text-white/95 leading-tight">Chat Theme</p>
              <p className="text-xs text-white/40 leading-tight mt-0.5">Choose your vibe</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2.5 rounded-xl text-white/40 hover:text-white/90 hover:bg-white/8 transition-all"
            style={{ background: 'rgba(255,255,255,0.03)' }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Grid */}
        <div className="overflow-y-auto p-5" style={{ scrollbarWidth: 'thin' }}>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {backgrounds.map((bg) => {
              const isActive = currentBackground === bg.id;
              return (
                <motion.button
                  key={bg.id}
                  onClick={() => { onChange(bg.id); }}
                  whileHover={{ scale: 1.03, y: -4 }}
                  whileTap={{ scale: 0.98 }}
                  className="relative rounded-2xl overflow-hidden text-left group"
                  style={{
                    border: isActive
                      ? '2.5px solid rgba(100,180,255,0.8)'
                      : '2px solid rgba(255,255,255,0.1)',
                    boxShadow: isActive 
                      ? '0 8px 32px rgba(100,180,255,0.3), 0 0 0 4px rgba(100,180,255,0.1)' 
                      : '0 4px 12px rgba(0,0,0,0.3)',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  }}
                >
                  {/* Preview swatch */}
                  <div
                    className="w-full h-32 relative overflow-hidden"
                    style={bg.previewStyle}
                  >
                    {/* Animated gradient overlay */}
                    <div 
                      className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                      style={{ 
                        background: 'radial-gradient(circle at center, rgba(255,255,255,0.1) 0%, transparent 70%)'
                      }}
                    />
                    
                    {/* Fake chat bubbles */}
                    <div className="absolute inset-0 p-3 flex flex-col justify-end gap-2">
                      <div className="w-24 h-6 rounded-full opacity-40" style={{ background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(4px)' }} />
                      <div className="w-32 h-6 rounded-full opacity-50 self-end" style={{ background: 'rgba(100,180,255,0.3)', backdropFilter: 'blur(4px)' }} />
                    </div>

                    {/* Active check */}
                    {isActive && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center"
                        style={{ background: 'rgba(100,180,255,0.95)', boxShadow: '0 4px 12px rgba(100,180,255,0.5)' }}
                      >
                        <Check className="w-5 h-5 text-white" strokeWidth={3} />
                      </motion.div>
                    )}
                  </div>

                  {/* Label */}
                  <div className="px-3 py-3 bg-black/20 backdrop-blur-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{bg.emoji}</span>
                      <span className={`text-sm font-semibold ${isActive ? 'text-white' : 'text-white/70'} group-hover:text-white transition-colors`}>
                        {bg.name}
                      </span>
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default BackgroundSelector;
