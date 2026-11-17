import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Palette, X } from 'lucide-react';

const backgrounds = [
  {
    id: 'default',
    name: 'Default',
    class: 'bg-background',
    preview: '#0a0a0a'
  },
  {
    id: 'gradient-purple',
    name: 'Purple Dream',
    class: 'bg-gradient-to-br from-purple-900/20 via-background to-background',
    preview: 'linear-gradient(to bottom right, #581c87, #0a0a0a)'
  },
  {
    id: 'gradient-blue',
    name: 'Ocean Blue',
    class: 'bg-gradient-to-br from-blue-900/20 via-background to-background',
    preview: 'linear-gradient(to bottom right, #1e3a8a, #0a0a0a)'
  },
  {
    id: 'gradient-green',
    name: 'Forest Green',
    class: 'bg-gradient-to-br from-green-900/20 via-background to-background',
    preview: 'linear-gradient(to bottom right, #14532d, #0a0a0a)'
  },
  {
    id: 'gradient-orange',
    name: 'Sunset Orange',
    class: 'bg-gradient-to-br from-orange-900/20 via-background to-background',
    preview: 'linear-gradient(to bottom right, #7c2d12, #0a0a0a)'
  },
  {
    id: 'gradient-pink',
    name: 'Pink Bliss',
    class: 'bg-gradient-to-br from-pink-900/20 via-background to-background',
    preview: 'linear-gradient(to bottom right, #831843, #0a0a0a)'
  },
  {
    id: 'gradient-teal',
    name: 'Teal Wave',
    class: 'bg-gradient-to-br from-teal-900/20 via-background to-background',
    preview: 'linear-gradient(to bottom right, #134e4a, #0a0a0a)'
  },
  {
    id: 'gradient-rose',
    name: 'Rose Garden',
    class: 'bg-gradient-to-br from-rose-900/20 via-background to-background',
    preview: 'linear-gradient(to bottom right, #881337, #0a0a0a)'
  },
  {
    id: 'dark-grid',
    name: 'Dark Grid',
    class: 'bg-[radial-gradient(circle_at_1px_1px,_rgb(255_255_255_/_0.05)_1px,_transparent_0)] [background-size:40px_40px] bg-background',
    preview: '#0a0a0a'
  },
  {
    id: 'dots',
    name: 'Dotted',
    class: 'bg-[radial-gradient(circle,_rgb(255_255_255_/_0.05)_1px,_transparent_1px)] [background-size:20px_20px] bg-background',
    preview: '#0a0a0a'
  },
  {
    id: 'subtle-pattern',
    name: 'Subtle Pattern',
    class: 'bg-background bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:40px_40px]',
    preview: '#0a0a0a'
  },
  {
    id: 'midnight',
    name: 'Midnight',
    class: 'bg-[#050505]',
    preview: '#050505'
  }
];

const BackgroundSelector = ({ currentBackground, onChange, onClose }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-surface border border-border rounded-2xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-accent/20 rounded-lg flex items-center justify-center">
              <Palette className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Choose Background</h2>
              <p className="text-sm text-secondary">Customize your chat experience</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-background rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {backgrounds.map((bg) => (
            <motion.button
              key={bg.id}
              onClick={() => {
                onChange(bg.id);
                onClose();
              }}
              className={`relative group rounded-xl overflow-hidden border-2 transition-all ${
                currentBackground === bg.id
                  ? 'border-accent shadow-lg shadow-accent/20'
                  : 'border-border hover:border-accent/50'
              }`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {/* Preview */}
              <div 
                className="w-full h-24 relative"
                style={{ background: bg.preview }}
              >
                {/* Pattern preview for special backgrounds */}
                {bg.id === 'dark-grid' && (
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,_rgb(255_255_255_/_0.15)_1px,_transparent_0)] [background-size:40px_40px]" />
                )}
                {bg.id === 'dots' && (
                  <div className="absolute inset-0 bg-[radial-gradient(circle,_rgb(255_255_255_/_0.15)_1px,_transparent_1px)] [background-size:20px_20px]" />
                )}
                {bg.id === 'subtle-pattern' && (
                  <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808020_1px,transparent_1px),linear-gradient(to_bottom,#80808020_1px,transparent_1px)] bg-[size:40px_40px]" />
                )}
                
                {/* Selected indicator */}
                {currentBackground === bg.id && (
                  <div className="absolute inset-0 flex items-center justify-center bg-accent/20">
                    <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </div>
                )}
              </div>

              {/* Name */}
              <div className="p-3 bg-background/50 backdrop-blur-sm">
                <p className="text-sm font-medium text-center">{bg.name}</p>
              </div>
            </motion.button>
          ))}
        </div>

        <div className="mt-6 p-4 bg-background/50 rounded-lg border border-border">
          <p className="text-xs text-secondary text-center">
            💡 Tip: Background preferences are saved locally to your browser
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default BackgroundSelector;
export { backgrounds };
