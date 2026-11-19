import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

const emojis = [
  '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂',
  '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩',
  '😘', '😗', '😚', '😙', '😋', '😛', '😜', '🤪',
  '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨',
  '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥',
  '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕',
  '🤢', '🤮', '🤧', '🥵', '🥶', '🥴', '😵', '🤯',
  '🤠', '🥳', '😎', '🤓', '🧐', '😕', '😟', '🙁',
  '☹️', '😮', '😯', '😲', '😳', '🥺', '😦', '😧',
  '😨', '😰', '😥', '😢', '😭', '😱', '😖', '😣',
  '😞', '😓', '😩', '😫', '🥱', '😤', '😡', '😠',
  '🤬', '😈', '👿', '💀', '☠️', '💩', '🤡', '👹',
  '👺', '👻', '👽', '👾', '🤖', '😺', '😸', '😹',
  '😻', '😼', '😽', '🙀', '😿', '😾', '❤️', '🧡',
  '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔',
  '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝',
  '👍', '👎', '👊', '✊', '🤛', '🤜', '🤞', '✌️',
  '🤟', '🤘', '👌', '🤏', '👈', '👉', '👆', '👇',
  '☝️', '✋', '🤚', '🖐️', '🖖', '👋', '🤙', '💪',
  '🦾', '🖕', '✍️', '🙏', '🦶', '🦵', '👄', '💋',
  '🔥', '✨', '🌟', '⭐', '💫', '💥', '💢', '💯',
  '🎉', '🎊', '🎈', '🎁', '🏆', '🥇', '🥈', '🥉'
];

const EmojiPicker = ({ onSelect, onClose }) => {
  const [search, setSearch] = useState('');

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 10 }}
      transition={{ duration: 0.15 }}
      className="absolute bottom-full right-0 mb-2 rounded-2xl shadow-2xl p-3 w-80 z-[999]"
      style={{
        background: '#0f1826',
        border: '1px solid rgba(255,255,255,0.09)',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-white/80">Pick an emoji</h3>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-white/40 hover:text-white/80 hover:bg-white/8 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Search */}
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search emojis..."
        className="w-full px-3 py-2 mb-2 rounded-lg text-sm text-white/80 placeholder:text-white/30 focus:outline-none transition-colors"
        style={{
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
        onFocus={(e) => e.target.style.borderColor = '#c46b4a'}
        onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
      />

      {/* Emoji Grid */}
      <div 
        className="grid grid-cols-8 gap-1 overflow-y-auto"
        style={{
          maxHeight: '240px',
          scrollbarWidth: 'thin',
        }}
      >
        {emojis
          .filter(emoji => !search || emoji.includes(search))
          .map((emoji, index) => (
            <button
              key={index}
              onClick={() => {
                onSelect(emoji);
              }}
              className="text-2xl p-2 rounded-lg transition-all hover:bg-white/8 hover:scale-110"
              type="button"
            >
              {emoji}
            </button>
          ))}
      </div>
    </motion.div>
  );
};

export default EmojiPicker;
