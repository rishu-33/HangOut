import { memo, useCallback, useRef, useState } from "react";
import { Trash2, Smile, Download, FileText, Reply, Copy, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import api, { getFileUrl } from "../utils/api";
import toast from "react-hot-toast";
import Avatar from "./Avatar";
import Lightbox from "./Lightbox";

const quickEmojis = ["❤️","👍","😂","😮","😢","🔥","🎉","👏"];

function smartTime(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/* ── Code Block ── */
const CodeBlock = memo(({ code }) => {
  const [copied, setCopied] = useState(false);
  const copy = useCallback(() => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [code]);
  return (
    <div className="my-2 rounded-xl overflow-hidden" style={{ background: "#0a0d14", border: "1px solid rgba(255,255,255,0.1)" }}>
      <div className="flex items-center justify-between px-4 py-2" style={{ background: "rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        <span className="font-mono uppercase tracking-widest" style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)" }}>code</span>
        <button onClick={copy} className="flex items-center gap-1.5 transition-colors" style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)" }}>
          {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <pre className="px-4 py-3 font-mono text-green-300 overflow-x-auto whitespace-pre" style={{ fontSize: "13px", lineHeight: 1.7 }}>
        {code}
      </pre>
    </div>
  );
});

/* ── renderContent ── */
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
              <span key={j} className={`font-semibold rounded px-1 ${isSelf ? "bg-yellow-400/25 text-yellow-300" : "text-blue-300"}`}>
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

/* ── SYSTEM MESSAGE ── */
const SystemMessage = memo(({ content }) => (
  <div className="flex justify-center py-2">
    <span
      className="px-4 py-1.5 rounded-full"
      style={{
        background: "rgba(255,255,255,0.05)",
        border: "1px solid rgba(255,255,255,0.08)",
        fontSize: "12px",
        color: "rgba(255,255,255,0.4)",
        letterSpacing: "0.02em",
      }}
    >
      {content}
    </span>
  </div>
));

/* ── MAIN MESSAGE ── */
const Message = ({ message, currentUser, onReaction, onDeleted, onReply, isFirst = true }) => {
  const isOwn       = message.sender?._id === currentUser?._id;
  const isMentioned = message.content?.includes(`@${currentUser?.username}`);
  const [showActions,  setShowActions]  = useState(false);
  const [showEmojis,   setShowEmojis]   = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const hideTimer = useRef(null);

  if (message.type === "system") return <SystemMessage content={message.content} />;

  const revealActions = useCallback(() => { clearTimeout(hideTimer.current); setShowActions(true); }, []);
  const scheduleHide  = useCallback(() => {
    hideTimer.current = setTimeout(() => { setShowActions(false); setShowEmojis(false); }, 300);
  }, []);

  const handleDelete = useCallback(async () => {
    if (!confirm("Delete this message?")) return;
    try {
      await api.delete(`/messages/${message._id}`);
      onDeleted?.(message._id);
      toast.success("Deleted");
    } catch { toast.error("Failed to delete"); }
  }, [message._id, onDeleted]);

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

  const reactionMap = (message.reactions || []).reduce((a, r) => {
    a[r.emoji] = (a[r.emoji] || 0) + 1; return a;
  }, {});

  /* ── Bubble styles ── */
  const ownBubble = {
    background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
    color: "#fff",
    borderRadius: "20px 20px 4px 20px",
    boxShadow: "0 4px 20px rgba(37,99,235,0.35)",
  };

  const otherBubble = {
    background: isMentioned ? "rgba(250,220,80,0.1)" : "rgba(255,255,255,0.07)",
    border: isMentioned ? "1px solid rgba(250,220,80,0.3)" : "1px solid rgba(255,255,255,0.1)",
    color: "rgba(255,255,255,0.93)",
    borderRadius: "20px 20px 20px 4px",
    boxShadow: "0 2px 10px rgba(0,0,0,0.25)",
  };

  const bubbleStyle = isOwn ? ownBubble : otherBubble;

  return (
    <div
      className={`flex items-end gap-3 msg-enter ${isOwn ? "flex-row-reverse" : "flex-row"} ${message._optimistic ? "opacity-60" : ""}`}
      style={{ padding: "2px 0" }}
    >
      {/* Avatar — bigger, 40px */}
      <div style={{ width: 40, height: 40, flexShrink: 0, marginBottom: 2 }}>
        {isFirst
          ? <Avatar user={message.sender} size="md" />
          : <div style={{ width: 40 }} />
        }
      </div>

      {/* Column */}
      <div
        className="flex flex-col min-w-0"
        style={{ alignItems: isOwn ? "flex-end" : "flex-start", maxWidth: "min(70%, 520px)" }}
      >
        {/* Name + time */}
        {isFirst && (
          <div
            className="flex items-baseline gap-2 mb-1.5 px-1"
            style={{ flexDirection: isOwn ? "row-reverse" : "row" }}
          >
            <span style={{ fontSize: "13.5px", fontWeight: 700, color: "rgba(255,255,255,0.85)" }}>
              {message.sender?.username}
            </span>
            <span style={{ fontSize: "11.5px", color: "rgba(255,255,255,0.35)", flexShrink: 0 }}>
              {message._optimistic ? <span className="animate-pulse">sending…</span> : smartTime(message.createdAt)}
            </span>
          </div>
        )}

        {/* Bubble */}
        <div
          className="relative"
          style={{ maxWidth: "100%" }}
          onMouseEnter={revealActions}
          onMouseLeave={scheduleHide}
        >
          <div
            style={{
              ...bubbleStyle,
              padding: "12px 16px",
              fontSize: "15.5px",
              lineHeight: 1.55,
              wordBreak: "break-word",
              overflowWrap: "anywhere",
            }}
          >
            {/* Reply preview */}
            {message.replyTo && (
              <div
                style={{
                  marginBottom: 10,
                  paddingLeft: 10,
                  borderLeft: `3px solid ${isOwn ? "rgba(255,255,255,0.4)" : "rgba(100,180,255,0.5)"}`,
                  fontSize: "13px",
                  opacity: 0.75,
                  lineHeight: 1.4,
                }}
              >
                <span style={{ fontWeight: 700, display: "block" }}>↩ {message.replyTo.sender?.username}</span>
                <span style={{ opacity: 0.8 }}>
                  {message.replyTo.content?.slice(0, 70)}{message.replyTo.content?.length > 70 ? "…" : ""}
                </span>
              </div>
            )}

            {/* Image */}
            {message.type === "image" && message.file && (
              <img
                src={getFileUrl(message.file.url)}
                alt={message.file.filename || "image"}
                loading="lazy"
                className="rounded-2xl mb-2 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                style={{ maxWidth: "320px", maxHeight: "280px", display: "block" }}
                onError={e => { e.target.style.display = "none"; }}
                onClick={() => setLightboxOpen(true)}
              />
            )}

            {/* File */}
            {message.type === "file" && message.file && (
              <a
                href={getFileUrl(message.file.url)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-black/15 transition-colors"
                style={{ background: "rgba(0,0,0,0.15)", minWidth: "200px" }}
              >
                <FileText className="w-5 h-5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate" style={{ fontSize: "14px" }}>{message.file.filename}</p>
                  <p style={{ fontSize: "12px", opacity: 0.55 }}>{(message.file.size / 1024).toFixed(1)} KB</p>
                </div>
                <Download className="w-4 h-4" style={{ opacity: 0.6 }} />
              </a>
            )}

            {/* Text */}
            {message.content && (
              <div>{renderContent(message.content, currentUser?.username)}</div>
            )}

            {/* Time on non-first bubbles */}
            {!isFirst && (
              <span style={{
                display: "block",
                textAlign: isOwn ? "right" : "left",
                fontSize: "11px",
                marginTop: 5,
                opacity: 0.45,
              }}>
                {message._optimistic ? "…" : smartTime(message.createdAt)}
              </span>
            )}
          </div>

          {/* Action bar on hover */}
          <AnimatePresence>
            {showActions && (
              <motion.div
                initial={{ opacity: 0, scale: 0.85, y: 4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.85, y: 4 }}
                transition={{ duration: 0.1 }}
                onMouseEnter={revealActions}
                className={`absolute -top-10 ${isOwn ? "right-0" : "left-0"} flex gap-1 rounded-2xl px-2 py-1.5 z-20`}
                style={{
                  background: "rgba(15,25,45,0.95)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
                  backdropFilter: "blur(12px)",
                }}
              >
                {/* Emoji picker trigger */}
                <div className="relative">
                  <button
                    onClick={() => setShowEmojis(v => !v)}
                    aria-label="Add reaction"
                    className="w-8 h-8 flex items-center justify-center rounded-xl transition-all hover:bg-white/10"
                    style={{ color: "rgba(255,255,255,0.6)" }}
                  >
                    <Smile className="w-4 h-4" />
                  </button>
                  <AnimatePresence>
                    {showEmojis && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 4 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 4 }}
                        className="absolute bottom-full mb-2 z-30"
                        style={{ left: isOwn ? "auto" : 0, right: isOwn ? 0 : "auto" }}
                        onMouseEnter={revealActions}
                      >
                        <div
                          className="flex gap-1 p-2 rounded-2xl shadow-2xl"
                          style={{
                            background: "rgba(15,25,45,0.98)",
                            border: "1px solid rgba(255,255,255,0.12)",
                            backdropFilter: "blur(12px)",
                          }}
                        >
                          {quickEmojis.map(e => (
                            <button
                              key={e}
                              type="button"
                              onMouseDown={ev => ev.preventDefault()}
                              onClick={() => handleReact(e)}
                              className="text-xl w-9 h-9 flex items-center justify-center rounded-xl hover:bg-white/10 transition-all hover:scale-125"
                            >
                              {e}
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Reply */}
                <button
                  onClick={() => onReply?.(message)}
                  aria-label="Reply"
                  className="w-8 h-8 flex items-center justify-center rounded-xl transition-all hover:bg-white/10"
                  style={{ color: "rgba(255,255,255,0.6)" }}
                >
                  <Reply className="w-4 h-4" />
                </button>

                {/* Delete */}
                {isOwn && (
                  <button
                    onClick={handleDelete}
                    aria-label="Delete"
                    className="w-8 h-8 flex items-center justify-center rounded-xl transition-all hover:bg-red-500/15"
                    style={{ color: "rgba(239,68,68,0.6)" }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Reactions */}
        {Object.keys(reactionMap).length > 0 && (
          <div
            className="flex flex-wrap gap-1 mt-2"
            style={{ justifyContent: isOwn ? "flex-end" : "flex-start" }}
          >
            {Object.entries(reactionMap).map(([emoji, count]) => (
              <button
                key={emoji}
                onClick={() => handleReact(emoji)}
                className="rounded-full transition-all hover:scale-110"
                style={{
                  fontSize: "13px",
                  padding: "3px 10px",
                  background: "rgba(255,255,255,0.07)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  color: "rgba(255,255,255,0.8)",
                }}
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
