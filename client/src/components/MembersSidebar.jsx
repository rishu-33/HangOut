import { useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Crown, Copy, Check } from "lucide-react";
import { useState } from "react";
import Avatar from "./Avatar";
import toast from "react-hot-toast";

const MembersSidebar = ({ room, onClose }) => {
  const [copied, setCopied] = useState(false);

  /* Esc to close */
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const handleCopy = useCallback(() => {
    if (!room?.roomId) return;
    navigator.clipboard.writeText(room.roomId);
    setCopied(true);
    toast.success("Room code copied!");
    setTimeout(() => setCopied(false), 2000);
  }, [room?.roomId]);

  const allMembers = room?.members || [];
  const online  = allMembers.filter(m => m.user?.status === "online");
  const offline = allMembers.filter(m => m.user?.status !== "online");

  return (
    <>
      {/* Mobile backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="md:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
        onClick={onClose}
      />

      {/* Panel */}
      <motion.aside
        initial={{ x: 32, opacity: 0 }}
        animate={{ x:  0, opacity: 1 }}
        exit={{   x: 32, opacity: 0 }}
        transition={{ type: "spring", stiffness: 340, damping: 32 }}
        aria-label="Room members"
        className="
          fixed md:static inset-y-0 right-0 z-50
          w-[300px] md:w-[280px]
          md:m-3 md:ml-0 md:rounded-3xl
          flex flex-col
          shadow-[0_24px_80px_rgba(0,0,0,0.5)]
          overflow-hidden
        "
        style={{
          background: "#10192a",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-3 flex items-start justify-between border-b border-white/[0.06]">
          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] text-white/35">In this room</p>
            <h2 className="font-display text-xl mt-0.5 text-white/90">Members</h2>
            <p className="text-xs text-white/40 mt-0.5">
              {online.length} online · {allMembers.length} total
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close members panel"
            className="p-2 rounded-full text-white/35 hover:text-white/80 hover:bg-white/8 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
          {/* Online */}
          {online.length > 0 && (
            <>
              <p className="px-2 pb-1 text-[10px] uppercase tracking-[0.18em] text-white/30">
                Online — {online.length}
              </p>
              {online.map(m => <MemberRow key={m.user?._id || m.user} member={m} isOnline />)}
            </>
          )}

          {/* Divider */}
          {online.length > 0 && offline.length > 0 && (
            <div className="h-px mx-2 my-2 bg-white/[0.06]" />
          )}

          {/* Offline */}
          {offline.length > 0 && (
            <>
              <p className="px-2 pb-1 text-[10px] uppercase tracking-[0.18em] text-white/30">
                Away — {offline.length}
              </p>
              {offline.map(m => <MemberRow key={m.user?._id || m.user} member={m} isOnline={false} />)}
            </>
          )}
        </div>

        {/* Room code footer */}
        <div
          className="m-3 mt-0 rounded-2xl px-4 py-3"
          style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.07)" }}
        >
          <p className="text-[10px] uppercase tracking-[0.18em] text-white/35">Room code</p>
          <div className="flex items-center justify-between mt-1">
            <p className="font-mono text-sm tracking-[0.14em] text-white/80">{room?.roomId}</p>
            <button
              onClick={handleCopy}
              aria-label={copied ? "Copied!" : "Copy room code"}
              className="flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-lg transition-colors"
              style={{
                background: copied ? "rgba(52,211,153,0.15)" : "rgba(255,255,255,0.08)",
                color: copied ? "#34d399" : "rgba(255,255,255,0.55)",
              }}
            >
              {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
          <p className="mt-2 text-[11px] text-white/30">Hosted by {room?.creator?.username}</p>
        </div>
      </motion.aside>
    </>
  );
};

const MemberRow = ({ member, isOnline }) => (
  <div className="flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-white/[0.04] transition-colors">
    <div className="relative shrink-0">
      <Avatar user={member.user} size="sm" />
      <span
        className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2"
        style={{
          background: isOnline ? "#34d399" : "#52525b",
          borderColor: "#10192a",
        }}
      />
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-1.5">
        <p className="text-[13px] font-medium truncate text-white/85">{member.user?.username}</p>
        {member.role === "admin" && (
          <Crown className="w-3 h-3 text-amber-300 shrink-0" title="Admin" />
        )}
      </div>
      <p className={`text-[11px] ${isOnline ? "text-green-400/80" : "text-white/35"}`}>
        {isOnline ? "Online now" : "Away"}
      </p>
    </div>
  </div>
);

export default MembersSidebar;
