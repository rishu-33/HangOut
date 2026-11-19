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
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
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
    <div className="my-2 rounded-xl overflow-hidden" style={{ background: "#0a0d14", border: "1px solid rgba(255,255,255,0.1)" }}>
      <div className="flex items-center justify-between px-3 py-1.5" style={{ background: "rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        <span className="font-mono uppercase tracking-widest" style={{ fontSize: "10px", color: "rgba(255,255,255,0.3)" }}>code</span>
        <button onClick={copy} className="flex items-center gap-1 transition-colors" style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)" }}>
          {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <pre className="px-3 py-2.5 font-mono text-green-300 overflow-x-auto whitespace-pre" style={{ fontSize: "12px", lineHeight: 1.6 }}>
        {code}
      </pre>
    </div>
  );
});

/* ── renderContent ────────────────────────────────────────────────────── */
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
    <span
      className="px-3 py-1 rounded-full tracking-wide"
      style={{
        background: "rgba(255,255,255,0.05)",
        border: "1px solid rgba(255,255,255,0.08)",
        fontSize: "11px",
        color: "rgba(255,255,255,0.35)",
      }}
    >
      {content}
    </span>
  </div>
));

/* ═══════════════════════════════════════════════════════════════════════
   MAIN MESSAGE — reference image style
   ═══════════════════════════════════════════════════════════════════════ */
const Message = ({
  message,
  currentUser,
  onReaction,
  onDeleted,
  onReply,
  isFirst = true,
}) => {
  const isOwn       = message.sender?._id === currentUser?._id;
  const isMentioned = message.content?.includes(`@${currentUser?.username}`);
  const [showActions,  setShowActions]  = useState(false);
  const [showEmojis,   setShowEmojis]   = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const hideTimer = useRef(null);

  if (message.type === "system") return <SystemMessage content={message.content} />;

  const revealActions = useCallback(() => { clearTimeout(hideTimer.current); setShowActions(true); }, []);
  const scheduleHide  = useCallback(() => {
    hideTimer.current = setTimeout(() => { setShowActions(false); setShowEmojis(false); }, 220);
  }, []);

  const handleDelete = useCallback(async () => {
    if (!confirm("Delete this message?")) return;
    try {
      await api.delete(`/messages/${message._id}`);
      onDeleted?.(message._id);
      toast.success("Message deleted");
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

  /* ── Bubble styles (reference image) ── */
  // Received: white/light-grey bg, dark text — like reference left side
  // Sent: dark teal-toned, white text — like reference right side
  const bubbleStyle = isOwn
    ? {
        background: "linear-gradient(135deg, #1e3a4a 0%, #162c3a 100%)",
        color: "rgba(255,255,255,0.92)",
        borderRadius: "20px 20px 4px 20px",
        boxShadow: "0 2px 12px rgba(0,0,0,0.3)",
      }
    : {
        background: isMentioned
          ? "rgba(250,230,100,0.08)"
          : "rgba(220,230,240,0.11)",
        border: isMentioned
          ? "1px solid rgba(250,230,100,0.2)"
          : "1px solid rgba(255,255,255,0.09)",
        color: "rgba(255,255,255,0.90)",
        borderRadius: "20px 20px 20px 4px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
      };

  return (
    <div
      className={`flex items-end gap-2 group msg-enter ${isOwn ? "flex-row-reverse" : "flex-row"} ${message._optimistic ? "opacity-60" : ""}`}
      onMouseEnter={revealActions}
      onMouseLeave={scheduleHide}
    >
      {/* Avatar — 36px, only first in group */}
      <div style={{ width: 36, height: 36, flexShrink: 0, marginBottom: 2 }}>
        {isFirst
          ? <Avatar user={message.sender} size="sm" />
          : <div style={{ width: 36 }} />
        }
      </div>

      {/* Column */}
      <div
        className="flex flex-col min-w-0"
        style={{
          alignItems: isOwn ? "flex-end" : "flex-start",
          maxWidth: "min(72%, 440px)",
        }}
      >
        {/* Name + time — first in group only */}
        {isFirst && (
          <div
            className="flex items-baseline gap-1.5 mb-1 px-0.5"
            style={{ flexDirection: isOwn ? "row-reverse" : "row" }}
          >
            <span style={{ fontSize: "12px", fontWeight: 600, color: "rgba(255,255,255,0.75)", lineHeight: 1 }}>
              {message.sender?.username}
            </span>
            <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)", lineHeight: 1, flexShrink: 0 }}>
              {message._optimistic ? <span className="animate-pulse">sending…</span> : smartTime(message.createdAt)}
            </span>
          </div>
        )}

        {/* Mention strip */}
        {isMentioned && !isOwn && (
          <div
            style={{ width: 24, height: 2, background: "rgba(250,230,100,0.5)", borderRadius: 2, marginBottom: 4, marginLeft: 2 }}
          />
        )}

        {/* Bubble */}
        <div className="relative" style={{ maxWidth: "100%" }}>
          <div
            style={{
              ...bubbleStyle,
              padding: "10px 14px",
              fontSize: "14.5px",
              lineHeight: 1.5,
              wordBreak: "break-word",
              overflowWrap: "anywhere",
            }}
          >
            {/* Reply preview */}
            {message.replyTo && (
              <div
                style={{
                  marginBottom: 8,
                  paddingBottom: 8,
                  borderBottom: `1px solid ${isOwn ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.1)"}`,
                  fontSize: "11px",
                  opacity: 0.75,
                }}
              >
                <span style={{ fontWeight: 600 }}>↩ {message.replyTo.sender?.username}</span>
                <span style={{ marginLeft: 6, opacity: 0.7 }}>
                  {message.replyTo.content?.slice(0, 55)}{message.replyTo.content?.length > 55 ? "…" : ""}
                </span>
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
                className="rounded-xl mb-1.5 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                style={{ maxWidth: "280px", maxHeight: "240px", display: "block" }}
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
                className="flex items-center gap-2 p-2.5 rounded-xl hover:bg-black/15 transition-colors"
                style={{ background: "rgba(0,0,0,0.12)" }}
              >
                <FileText className="w-4 h-4 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate" style={{ fontSize: "13px" }}>{message.file.filename}</p>
                  <p style={{ fontSize: "11px", opacity: 0.55 }}>{(message.file.size / 1024).toFixed(1)} KB</p>
                </div>
                <Download className="w-3.5 h-3.5" style={{ opacity: 0.6 }} />
              </a>
            )}

            {/* Text */}
            {message.content && (
              <div>{renderContent(message.content, currentUser?.username)}</div>
            )}

            {/* Timestamp on non-first bubbles (subtle, bottom-right) */}
            {!isFirst && (
              <span
                style={{
                  display: "block",
                  textAlign: isOwn ? "right" : "left",
                  fontSize: "10px",
                  marginTop: 4,
                  opacity: 0.4,
                  letterSpacing: "0.01em",
                }}
              >
                {message._optimistic ? "…" : smartTime(message.createdAt)}
              </span>
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
              style={{
                background: "#0a1e30",
                border: "1px solid rgba(255,255,255,0.1)",
                boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
              }}
            >
              {/* Emoji */}
              <div className="relative">
                <button
                  onClick={() => setShowEmojis(v => !v)}
                  aria-label="Add reaction"
                  className="p-1.5 rounded-full transition-colors"
                  style={{ color: "rgba(255,255,255,0.5)" }}
                  onMouseEnter={e => { e.currentTarget.style.color = "white"; e.currentTarget.style.background = "rgba(255,255,255,0.08)"; }}
                  onMouseLeave={e => { e.currentTarget.style.color = "rgba(255,255,255,0.5)"; e.currentTarget.style.background = "transparent"; }}
                >
                  <Smile className="w-3.5 h-3.5" />
                </button>
                {showEmojis && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    className="absolute bottom-full left-0 pb-2 z-30"
                    onMouseEnter={revealActions}
                  >
                    <div
                      className="flex gap-1 p-2 rounded-2xl shadow-2xl"
                      style={{ background: "#0a1e30", border: "1px solid rgba(255,255,255,0.10)" }}
                    >
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
                className="p-1.5 rounded-full transition-colors"
                style={{ color: "rgba(255,255,255,0.5)" }}
                onMouseEnter={e => { e.currentTarget.style.color = "white"; e.currentTarget.style.background = "rgba(255,255,255,0.08)"; }}
                onMouseLeave={e => { e.currentTarget.style.color = "rgba(255,255,255,0.5)"; e.currentTarget.style.background = "transparent"; }}
              >
                <Reply className="w-3.5 h-3.5" />
              </button>

              {/* Delete (own) */}
              {isOwn && (
                <button
                  onClick={handleDelete}
                  aria-label="Delete message"
                  className="p-1.5 rounded-full transition-colors"
                  style={{ color: "rgba(239,68,68,0.5)" }}
                  onMouseEnter={e => { e.currentTarget.style.color = "#ef4444"; e.currentTarget.style.background = "rgba(239,68,68,0.1)"; }}
                  onMouseLeave={e => { e.currentTarget.style.color = "rgba(239,68,68,0.5)"; e.currentTarget.style.background = "transparent"; }}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </motion.div>
          )}
        </div>

        {/* Reactions */}
        {Object.keys(reactionMap).length > 0 && (
          <div
            className="flex flex-wrap gap-1 mt-1.5"
            style={{ justifyContent: isOwn ? "flex-end" : "flex-start" }}
          >
            {Object.entries(reactionMap).map(([emoji, count]) => (
              <button
                key={emoji}
                onClick={() => handleReact(emoji)}
                className="rounded-full transition-colors"
                style={{
                  fontSize: "11px",
                  padding: "2px 7px",
                  background: "#0a1e30",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(196,107,74,0.5)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; }}
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
