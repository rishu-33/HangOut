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
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="absolute bottom-full right-0 mb-3 bg-surface/95 border border-white/10 rounded-3xl shadow-2xl p-4 w-80 z-50"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">Pick an emoji</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-background rounded transition-colors"
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
          className="w-full px-3 py-2 mb-3 bg-background border border-border rounded-lg text-sm focus:outline-none focus:border-accent transition-colors"
        />

        {/* Emoji Grid */}
        <div className="grid grid-cols-8 gap-2 max-h-64 overflow-y-auto">
          {emojis.map((emoji, index) => (
            <button
              key={index}
              onClick={() => {
                onSelect(emoji);
                onClose();
              }}
              className="text-2xl p-2 hover:bg-background rounded-lg transition-all hover:scale-110"
            >
              {emoji}
            </button>
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default EmojiPicker;
