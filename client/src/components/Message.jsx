import { memo, useCallback, useRef, useState } from "react";
import { Trash2, Smile, Download, FileText, Reply, Copy, Check } from "lucide-react";
import { motion } from "framer-motion";
import api, { getFileUrl } from "../utils/api";
import toast from "react-hot-toast";
import Avatar from "./Avatar";
import Lightbox from "./Lightbox";

/* ── helpers ──────────────────────────────────────────────────────────── */
const quickEmojis = ["❤️","👍","😂","😮","😢","🔥"];

function smartTime(iso) {
  if (!iso) return "";
  const d   = new Date(iso);
  const now = new Date();
  const diffMs  = now - d;
  const diffMin = Math.floor(diffMs / 60000);
  const diffH   = Math.floor(diffMs / 3600000);
  if (diffMin < 1)  return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffH   < 24) return `${diffH}h ago`;
  /* yesterday */
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) {
    return "Yesterday " + d.toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" });
  }
  return d.toLocaleDateString([], { month:"short", day:"numeric" }) +
         " " + d.toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" });
}

/* ── Code Block ───────────────────────────────────────────────────────── */
const CodeBlock = memo(({ code }) => {
  const [copied, setCopied] = useState(false);
  const copy = useCallback(() => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [code]);
  return (
    <div className="my-2 rounded-xl overflow-hidden border border-white/10 bg-[#0d0e10] text-left">
      <div className="flex items-center justify-between px-3 py-1.5 bg-white/[0.04] border-b border-white/[0.07]">
        <span className="text-[10px] text-white/30 font-mono uppercase tracking-widest">code</span>
        <button onClick={copy} className="flex items-center gap-1 text-[11px] text-white/40 hover:text-white/80 transition-colors">
          {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <pre className="px-3 py-2.5 text-[12px] leading-relaxed font-mono text-green-300 overflow-x-auto whitespace-pre">
        {code}
      </pre>
    </div>
  );
});

/* ── renderContent: code blocks + @mentions ──────────────────────────── */
function renderContent(text, currentUsername) {
  if (!text) return null;
  const codeRe = /```([\s\S]*?)```/g;
  const parts  = [];
  let last = 0, m;
  while ((m = codeRe.exec(text)) !== null) {
    if (m.index > last) parts.push({ t:"text", v: text.slice(last, m.index) });
    parts.push({ t:"code", v: m[1].trim() });
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push({ t:"text", v: text.slice(last) });
  if (parts.length === 0)  parts.push({ t:"text", v: text });

  return parts.map((p, i) => {
    if (p.t === "code") return <CodeBlock key={i} code={p.v} />;
    const segs = p.v.split(/(@\w+)/g);
    return (
      <span key={i} className="whitespace-pre-wrap break-words">
        {segs.map((s, j) => {
          if (s.startsWith("@")) {
            const isSelf = s.slice(1).toLowerCase() === currentUsername?.toLowerCase();
            return (
              <span key={j} className={`font-semibold rounded px-0.5 ${isSelf ? "bg-yellow-400/25 text-yellow-300" : "text-accent/90"}`}>
                {s}
              </span>
            );
          }
          return s;
        })}
      </span>
    );
  });
}

/* ── SYSTEM MESSAGE ───────────────────────────────────────────────────── */
const SystemMessage = memo(({ content }) => (
  <div className="flex justify-center py-1.5">
    <span className="px-3 py-1 rounded-full bg-white/[0.06] text-[11px] text-white/35 tracking-wide border border-white/[0.05]">
      {content}
    </span>
  </div>
));

/* ── MAIN MESSAGE ─────────────────────────────────────────────────────── */
const Message = ({
  message,
  currentUser,
  onReaction,
  onDeleted,
  onReply,
  isFirst = true,   /* first in a group → show avatar + name */
}) => {
  const isOwn       = message.sender?._id === currentUser?._id;
  const isMentioned = message.content?.includes(`@${currentUser?.username}`);
  const [showActions,  setShowActions]  = useState(false);
  const [showEmojis,   setShowEmojis]   = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const hideTimer = useRef(null);

  if (message.type === "system") return <SystemMessage content={message.content} />;

  /* ── hover timing ── */
  const revealActions  = useCallback(() => { clearTimeout(hideTimer.current); setShowActions(true); }, []);
  const scheduleHide   = useCallback(() => {
    hideTimer.current = setTimeout(() => { setShowActions(false); setShowEmojis(false); }, 220);
  }, []);

  /* ── delete ── */
  const handleDelete = useCallback(async () => {
    if (!confirm("Delete this message?")) return;
    try {
      await api.delete(`/messages/${message._id}`);
      onDeleted?.(message._id);
      toast.success("Message deleted");
    } catch { toast.error("Failed to delete"); }
  }, [message._id, onDeleted]);

  /* ── react ── */
  const handleReact = useCallback(async (emoji) => {
    const uid     = currentUser?._id;
    const exist   = message.reactions || [];
    const already = exist.some(r => r.emoji === emoji && String(r.user) === String(uid));
    const optimistic = already
      ? exist.filter(r => !(r.emoji === emoji && String(r.user) === String(uid)))
      : [...exist, { emoji, user: uid }];
    onReaction?.(message._id, optimistic);
    setShowEmojis(false);
    try {
      const { data } = await api.post(`/messages/${message._id}/react`, { emoji });
      onReaction?.(message._id, data.reactions);
    } catch {
      onReaction?.(message._id, exist);
      toast.error("Reaction failed");
    }
  }, [message._id, message.reactions, currentUser?._id, onReaction]);

  /* ── grouped reactions ── */
  const reactionMap = (message.reactions || []).reduce((a, r) => {
    a[r.emoji] = (a[r.emoji] || 0) + 1; return a;
  }, {});

  return (
    <div
      className={`flex items-end gap-2 group msg-enter ${isOwn ? "flex-row-reverse" : "flex-row"} ${message._optimistic ? "opacity-60" : ""}`}
      onMouseEnter={revealActions}
      onMouseLeave={scheduleHide}
    >
      {/* Avatar — 32 px, only on first message of group */}
      <div className="w-8 h-8 shrink-0 mb-0.5">
        {isFirst
          ? <Avatar user={message.sender} size="sm" />
          : <div className="w-8 h-8" />
        }
      </div>

      {/* Column */}
      <div className={`flex flex-col min-w-0 max-w-[75%] sm:max-w-[65%] md:max-w-[60%] ${isOwn ? "items-end" : "items-start"}`}>
        {/* Name + time — only on first message of group */}
        {isFirst && (
          <div className={`flex items-baseline gap-1.5 mb-1 px-0.5 ${isOwn ? "flex-row-reverse" : "flex-row"}`}>
            <span className="text-[12px] font-semibold leading-none truncate" style={{ color: "rgba(255,255,255,0.88)" }}>
              {message.sender?.username}
            </span>
            <span className="text-[11px] leading-none shrink-0" style={{ color: "rgba(255,255,255,0.38)" }}>
              {message._optimistic ? "sending…" : smartTime(message.createdAt)}
            </span>
          </div>
        )}

        {/* Mention strip */}
        {isMentioned && !isOwn && (
          <div className="self-stretch h-px w-6 bg-yellow-400/50 rounded-full mb-1 ml-1" />
        )}

        {/* Bubble */}
        <div className="relative">
          <div
            className={`relative text-[14.5px] leading-relaxed shadow-sm break-words ${
              isOwn
                ? "bg-accent text-white rounded-[18px] rounded-br-[4px] px-4 py-2.5"
                : `rounded-[18px] rounded-bl-[4px] px-4 py-2.5 ${
                    isMentioned
                      ? "bg-yellow-400/8 border border-yellow-400/22 text-primary"
                      : "bg-[#1a2235] border border-white/[0.08] text-primary"
                  }`
            }`}
          >
            {/* Reply preview */}
            {message.replyTo && (
              <div className={`mb-2 pb-2 border-b text-[11px] rounded-t-lg opacity-80 ${isOwn ? "border-white/20" : "border-white/10 text-white/60"}`}>
                <span className="font-semibold">↩ {message.replyTo.sender?.username}</span>
                <span className="ml-1.5 opacity-70">{message.replyTo.content?.slice(0, 55)}{message.replyTo.content?.length > 55 ? "…" : ""}</span>
              </div>
            )}

            {/* Image */}
            {message.type === "image" && message.file && (
              <img
                src={getFileUrl(message.file.url)}
                alt={message.file.filename || "image"}
                width={280}
                height={180}
                loading="lazy"
                className="max-w-full max-h-80 rounded-xl mb-1.5 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                style={{ maxWidth: "280px" }}
                onError={(e) => { e.target.style.display = "none"; }}
                onClick={() => setLightboxOpen(true)}
                title="Click to view full size"
              />
            )}

            {/* File */}
            {message.type === "file" && message.file && (
              <a
                href={getFileUrl(message.file.url)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 p-2.5 bg-black/20 rounded-xl hover:bg-black/30 transition-colors"
              >
                <FileText className="w-4 h-4 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium truncate">{message.file.filename}</p>
                  <p className="text-[11px] opacity-55">{(message.file.size / 1024).toFixed(1)} KB</p>
                </div>
                <Download className="w-3.5 h-3.5 opacity-60" />
              </a>
            )}

            {/* Text */}
            {message.content && (
              <div>{renderContent(message.content, currentUser?.username)}</div>
            )}
          </div>

          {/* Action bar on hover */}
          {showActions && (
            <motion.div
              initial={{ opacity: 0, scale: 0.88 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.08 }}
              onMouseEnter={revealActions}
              className={`absolute -top-9 ${isOwn ? "right-0" : "left-0"} flex gap-0.5 rounded-full px-1.5 py-1 z-20`}
              style={{ background: "#1a2235", border: "1px solid rgba(255,255,255,0.10)", boxShadow: "0 8px 24px rgba(0,0,0,0.4)" }}
            >
              {/* Emoji */}
              <div className="relative">
                <button
                  onClick={() => setShowEmojis(v => !v)}
                  aria-label="Add reaction"
                  className="p-1.5 rounded-full text-white/50 hover:text-white hover:bg-white/8 transition-colors"
                >
                  <Smile className="w-3.5 h-3.5" />
                </button>
                {showEmojis && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 4 }}
                    animate={{ opacity: 1, scale: 1,   y: 0 }}
                    className="absolute bottom-full left-0 pb-2 z-30"
                    onMouseEnter={revealActions}
                  >
                    <div className="flex gap-1 p-2 rounded-2xl shadow-2xl" style={{ background: "#1a2235", border: "1px solid rgba(255,255,255,0.10)" }}>
                      {quickEmojis.map(e => (
                        <button
                          key={e}
                          type="button"
                          onMouseDown={ev => ev.preventDefault()}
                          onClick={() => handleReact(e)}
                          className="text-lg p-1 rounded-lg hover:bg-white/8 transition-all hover:scale-125"
                        >
                          {e}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Reply */}
              <button
                onClick={() => onReply?.(message)}
                aria-label="Reply"
                className="p-1.5 rounded-full text-white/50 hover:text-white hover:bg-white/8 transition-colors"
              >
                <Reply className="w-3.5 h-3.5" />
              </button>

              {/* Delete (own) */}
              {isOwn && (
                <button
                  onClick={handleDelete}
                  aria-label="Delete message"
                  className="p-1.5 rounded-full text-red-400/50 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </motion.div>
          )}
        </div>

        {/* Reactions */}
        {Object.keys(reactionMap).length > 0 && (
          <div className={`flex flex-wrap gap-1 mt-1.5 ${isOwn ? "justify-end" : "justify-start"}`}>
            {Object.entries(reactionMap).map(([emoji, count]) => (
              <button
                key={emoji}
                onClick={() => handleReact(emoji)}
                className="text-[11px] px-1.5 py-0.5 rounded-full transition-colors hover:border-accent/50"
                style={{ background: "#1a2235", border: "1px solid rgba(255,255,255,0.08)" }}
              >
                {emoji}{count > 1 ? ` ${count}` : ""}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      <Lightbox
        src={message.file ? getFileUrl(message.file.url) : ""}
        alt={message.file?.filename}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
      />
    </div>
  );
};

export default memo(Message, (prev, next) =>
  prev.message === next.message &&
  prev.currentUser?._id === next.currentUser?._id &&
  prev.isFirst === next.isFirst
);
