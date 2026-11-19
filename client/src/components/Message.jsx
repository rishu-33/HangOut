import { memo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Trash2, Smile, Download, FileText, Reply, Copy, Check } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import api, { getFileUrl } from '../utils/api';
import toast from 'react-hot-toast';
import Avatar from './Avatar';

const quickEmojis = ['❤️', '👍', '😂', '😮', '😢', '🔥'];

// ── Render message text with code blocks + @mention highlighting ──────────────
const renderContent = (text, currentUsername) => {
  if (!text) return null;

  const codeBlockRegex = /```([\s\S]*?)```/g;
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', content: text.slice(lastIndex, match.index) });
    }
    parts.push({ type: 'code', content: match[1].trim() });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push({ type: 'text', content: text.slice(lastIndex) });
  }

  if (parts.length === 0) parts.push({ type: 'text', content: text });

  return parts.map((part, i) => {
    if (part.type === 'code') {
      return <CodeBlock key={i} code={part.content} />;
    }

    const mentionRegex = /(@\w+)/g;
    const segments = part.content.split(mentionRegex);
    return (
      <span key={i} className="whitespace-pre-wrap break-words">
        {segments.map((seg, j) => {
          if (seg.startsWith('@')) {
            const isSelf = seg.slice(1).toLowerCase() === currentUsername?.toLowerCase();
            return (
              <span
                key={j}
                className={`font-semibold rounded px-0.5 ${
                  isSelf
                    ? 'bg-yellow-400/25 text-yellow-300'
                    : 'text-accent/90'
                }`}
              >
                {seg}
              </span>
            );
          }
          return seg;
        })}
      </span>
    );
  });
};

// ── Code block ────────────────────────────────────────────────────────────────
const CodeBlock = ({ code }) => {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="my-1.5 rounded-xl overflow-hidden border border-white/10 bg-[#0d0e10] text-left">
      <div className="flex items-center justify-between px-3 py-1.5 bg-white/4 border-b border-white/8">
        <span className="text-[10px] text-secondary/60 font-mono uppercase tracking-widest">code</span>
        <button onClick={copy} className="flex items-center gap-1 text-[11px] text-secondary hover:text-primary transition-colors">
          {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <pre className="px-3 py-2.5 text-[12px] leading-relaxed font-mono text-green-300 overflow-x-auto whitespace-pre">
        {code}
      </pre>
    </div>
  );
};

// ── Main Message component ────────────────────────────────────────────────────
const Message = ({ message, currentUser, onReaction, onDeleted, onReply }) => {
  const isOwn = message.sender?._id === currentUser?._id;
  const isMentioned = message.content?.includes(`@${currentUser?.username}`);
  const [showActions, setShowActions] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const hideTimer = useRef(null);

  const revealActions = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    setShowActions(true);
  };

  const scheduleHide = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      setShowActions(false);
      setShowEmojiPicker(false);
    }, 220);
  };

  const handleDelete = async () => {
    if (!confirm('Delete this message?')) return;
    try {
      await api.delete(`/messages/${message._id}`);
      onDeleted?.(message._id);
      toast.success('Message deleted');
    } catch {
      toast.error('Failed to delete message');
    }
  };

  const handleReact = async (emoji) => {
    const userId = currentUser?._id;
    const existing = message.reactions || [];
    const alreadyReacted = existing.some(r => r.emoji === emoji && String(r.user) === String(userId));
    const optimisticReactions = alreadyReacted
      ? existing.filter(r => !(r.emoji === emoji && String(r.user) === String(userId)))
      : [...existing, { emoji, user: userId }];

    onReaction?.(message._id, optimisticReactions);
    setShowEmojiPicker(false);

    try {
      const { data } = await api.post(`/messages/${message._id}/react`, { emoji });
      onReaction?.(message._id, data.reactions);
    } catch {
      onReaction?.(message._id, existing);
      toast.error('Failed to add reaction');
    }
  };

  // ── System message ──────────────────────────────────────────────────────────
  if (message.type === 'system') {
    return (
      <div className="flex justify-center py-1">
        <span className="px-3 py-1 rounded-full bg-white/5 text-[11px] text-secondary/60 tracking-wide">
          {message.content}
        </span>
      </div>
    );
  }

  // ── Bubble row ──────────────────────────────────────────────────────────────
  return (
    <div
      className={`flex items-end gap-2 ${isOwn ? 'flex-row-reverse' : 'flex-row'} group ${message._optimistic ? 'opacity-70' : ''}`}
      onMouseEnter={revealActions}
      onMouseLeave={scheduleHide}
    >
      {/* Avatar — always visible for sizing consistency */}
      <div className="w-7 h-7 shrink-0 mb-0.5">
        <Avatar user={message.sender} size="xs" />
      </div>

      {/* Bubble column — inline width, not full */}
      <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} max-w-[70%] sm:max-w-[60%] min-w-0`}>

        {/* Name + time row */}
        <div className={`flex items-baseline gap-1.5 mb-1 px-0.5 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
          <span className="text-[11.5px] font-semibold text-primary/75 leading-none truncate">
            {message.sender?.username}
          </span>
          <span className="text-[10px] text-secondary/40 leading-none whitespace-nowrap shrink-0">
            {message._optimistic
              ? <span className="animate-pulse">sending…</span>
              : formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
          </span>
        </div>

        {/* Mention indicator strip */}
        {isMentioned && !isOwn && (
          <div className="self-stretch h-0.5 w-6 bg-yellow-400/60 rounded-full mb-1 ml-1" />
        )}

        {/* The bubble itself */}
        <div className="relative">
          <div
            className={`relative px-3.5 py-2.5 text-[13.5px] leading-relaxed shadow-sm break-words ${
              isOwn
                ? 'bg-accent text-white rounded-2xl rounded-br-[4px]'
                : `bg-[#1c1d20] border text-primary rounded-2xl rounded-bl-[4px] ${
                    isMentioned ? 'border-yellow-400/25 bg-yellow-400/4' : 'border-white/[0.07]'
                  }`
            }`}
          >
            {/* Reply preview */}
            {message.replyTo && (
              <div
                className={`mb-2 pb-2 border-b text-[11px] rounded-t-lg opacity-80 ${
                  isOwn ? 'border-white/20' : 'border-white/10 text-secondary'
                }`}
              >
                <span className="font-semibold">↩ {message.replyTo.sender?.username}</span>
                <span className="ml-1.5 opacity-70">
                  {message.replyTo.content?.slice(0, 55)}{message.replyTo.content?.length > 55 ? '…' : ''}
                </span>
              </div>
            )}

            {/* Image */}
            {message.type === 'image' && message.file && (
              <img
                src={getFileUrl(message.file.url)}
                alt={message.file.filename}
                className="max-w-full max-h-64 rounded-xl mb-1.5 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                style={{ maxWidth: '280px' }}
                onError={(e) => { e.target.style.display = 'none'; }}
                onClick={() => window.open(getFileUrl(message.file.url), '_blank')}
                title="Click to view full size"
              />
            )}

            {/* File */}
            {message.type === 'file' && message.file && (
              <a
                href={getFileUrl(message.file.url)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 p-2.5 bg-black/15 rounded-xl hover:bg-black/25 transition-colors"
              >
                <FileText className="w-4 h-4 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium truncate">{message.file.filename}</p>
                  <p className="text-[11px] opacity-60">{(message.file.size / 1024).toFixed(1)} KB</p>
                </div>
                <Download className="w-3.5 h-3.5 opacity-70" />
              </a>
            )}

            {/* Text */}
            {message.content && (
              <div className="text-[13.5px] leading-relaxed">
                {renderContent(message.content, currentUser?.username)}
              </div>
            )}
          </div>

          {/* Hover action bar */}
          {showActions && (
            <motion.div
              initial={{ opacity: 0, scale: 0.88 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.08 }}
              onMouseEnter={revealActions}
              className={`absolute -top-9 ${isOwn ? 'right-0' : 'left-0'} flex gap-0.5 bg-[#1c1d20]/98 border border-white/10 rounded-full px-1.5 py-1 shadow-2xl z-10 backdrop-blur-md`}
            >
              {/* Emoji */}
              <div className="relative">
                <button
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="p-1.5 hover:bg-white/8 rounded-full transition-colors text-secondary hover:text-primary"
                  title="React"
                >
                  <Smile className="w-3.5 h-3.5" />
                </button>
                {showEmojiPicker && (
                  <div
                    className="absolute bottom-full left-0 z-30 pb-2"
                    onMouseEnter={revealActions}
                  >
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9, y: 4 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      className="bg-[#1c1d20] border border-white/10 rounded-2xl p-2 shadow-2xl flex gap-1"
                    >
                      {quickEmojis.map((e) => (
                        <button
                          key={e}
                          type="button"
                          onMouseDown={(ev) => ev.preventDefault()}
                          onClick={() => { handleReact(e); setShowEmojiPicker(false); }}
                          className="text-lg p-1 hover:bg-white/8 rounded-lg transition-all hover:scale-125"
                        >
                          {e}
                        </button>
                      ))}
                    </motion.div>
                  </div>
                )}
              </div>

              {/* Reply */}
              <button
                onClick={() => onReply?.(message)}
                className="p-1.5 hover:bg-white/8 rounded-full transition-colors text-secondary hover:text-primary"
                title="Reply"
              >
                <Reply className="w-3.5 h-3.5" />
              </button>

              {/* Delete (own only) */}
              {isOwn && (
                <button
                  onClick={handleDelete}
                  className="p-1.5 hover:bg-red-500/15 rounded-full transition-colors text-red-400/60 hover:text-red-400"
                  title="Delete"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </motion.div>
          )}
        </div>

        {/* Reactions */}
        {message.reactions?.length > 0 && (
          <div className={`flex flex-wrap gap-1 mt-1.5 ${isOwn ? 'justify-end' : 'justify-start'}`}>
            {Object.entries(
              message.reactions.reduce((acc, r) => { acc[r.emoji] = (acc[r.emoji] || 0) + 1; return acc; }, {})
            ).map(([emoji, count]) => (
              <button
                key={emoji}
                onClick={() => handleReact(emoji)}
                className="text-[11px] px-1.5 py-0.5 bg-[#1c1d20] border border-white/8 rounded-full hover:border-accent/50 transition-colors"
              >
                {emoji}{count > 1 ? ` ${count}` : ''}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default memo(Message, (prev, next) => (
  prev.message === next.message &&
  prev.currentUser?._id === next.currentUser?._id
));
