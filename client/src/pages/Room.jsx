import {
  useEffect, useState, useRef, useCallback, useMemo, lazy, Suspense
} from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft, Send, Paperclip, Smile, Users,
  LogOut, Gamepad2, Mic, Trash2, Phone, Palette, X, Reply,
  ChevronDown, Wifi, WifiOff, MoreVertical
} from "lucide-react";
import { Virtuoso } from "react-virtuoso";
import useAuthStore from "../store/authStore";
import useRoomStore from "../store/roomStore";
import { getSocket } from "../utils/socket";
import api from "../utils/api";
import toast from "react-hot-toast";
import Message from "../components/Message";
import MembersSidebar from "../components/MembersSidebar";
import Avatar from "../components/Avatar";
import ConfirmModal from "../components/ConfirmModal";
import BackgroundSelector, { getBgStyle } from "../components/BackgroundSelector";

/* Code-split heavy panels */
const GamesPanel   = lazy(() => import("../components/GamesPanel"));
const VoiceChat    = lazy(() => import("../components/VoiceChat"));
const EmojiPicker  = lazy(() => import("../components/EmojiPicker"));

/* ── Skeleton ─────────────────────────────────────────────────────────── */
const MessageSkeleton = () => (
  <div className="flex items-end gap-2 px-4">
    <div className="skeleton w-8 h-8 rounded-full shrink-0" />
    <div className="flex flex-col gap-1.5 flex-1 max-w-xs">
      <div className="skeleton h-3 w-24 rounded" />
      <div className="skeleton h-10 w-48 rounded-2xl" />
    </div>
  </div>
);

/* ── Day divider ──────────────────────────────────────────────────────── */
function dayLabel(iso) {
  const d   = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return "Today";
  const y = new Date(now); y.setDate(now.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return "Yesterday";
  return d.toLocaleDateString([], { weekday:"long", month:"short", day:"numeric" });
}

/* ── Pill nav button ──────────────────────────────────────────────────── */
const NavBtn = ({ icon: Icon, label, onClick, active, tone = "default" }) => (
  <button
    type="button"
    onClick={onClick}
    title={label}
    aria-label={label}
    aria-pressed={active}
    className={`flex items-center gap-1.5 h-9 px-2.5 sm:px-3 rounded-full text-[12px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
      active
        ? tone === "green"
          ? "bg-emerald-500 text-white shadow-[0_6px_18px_rgba(52,211,153,0.3)]"
          : "bg-accent text-white shadow-[0_6px_18px_rgba(196,107,74,0.3)]"
        : "text-white/50 hover:text-white/90 hover:bg-white/8"
    }`}
  >
    <Icon className="w-4 h-4" />
    <span className="hidden lg:inline">{label}</span>
  </button>
);

/* ── Room page ────────────────────────────────────────────────────────── */
const Room = () => {
  const { roomId } = useParams();
  const navigate   = useNavigate();
  const { user }   = useAuthStore();
  const { currentRoom, setCurrentRoom, leaveRoom, removeRoomLocally, updateRoomMembers } = useRoomStore();

  /* ── state ── */
  const [messages,       setMessages]       = useState([]);
  const [newMessage,     setNewMessage]     = useState("");
  const [loading,        setLoading]        = useState(true);
  const [socketOk,       setSocketOk]       = useState(true);
  const [typingUsers,    setTypingUsers]     = useState(new Set());
  const [showMembers,    setShowMembers]     = useState(false);
  const [showGames,      setShowGames]       = useState(false);
  const [showVoiceChat,  setShowVoiceChat]   = useState(false);
  const [showEmojiPicker,setShowEmojiPicker] = useState(false);
  const [showBgSelector, setShowBgSelector]  = useState(false);
  const [showSettings,   setShowSettings]    = useState(false);
  const [confirmLeave,   setConfirmLeave]    = useState(false);
  const [confirmDelete,  setConfirmDelete]   = useState(false);
  const [chatBg,         setChatBg]          = useState(() =>
    localStorage.getItem(`room-bg-${roomId}`) || "default"
  );
  const [uploading,      setUploading]      = useState(false);
  const [replyTo,        setReplyTo]        = useState(null);
  const [mentionQuery,   setMentionQuery]   = useState("");
  const [showMentions,   setShowMentions]   = useState(false);
  const [voiceCallCard,  setVoiceCallCard]  = useState(null);
  const [atBottom,       setAtBottom]       = useState(true);

  /* ── refs ── */
  const virtuosoRef      = useRef(null);
  const textareaRef      = useRef(null);
  const typingTimeoutRef = useRef(null);
  const fileInputRef     = useRef(null);

  /* ── load room + messages ── */
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setMessages([]);
    (async () => {
      try {
        const [{ data: roomData }, { data: msgsData }] = await Promise.all([
          api.get(`/rooms/${roomId}`),
          api.get(`/messages/${roomId}`),
        ]);
        if (cancelled) return;
        setCurrentRoom(roomData);
        setMessages(msgsData.messages);
      } catch {
        if (cancelled) return;
        toast.error("Failed to load room");
        navigate("/rooms");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [roomId, setCurrentRoom, navigate]);

  /* ── socket ── */
  useEffect(() => {
    const socket = getSocket();
    const code   = roomId?.toUpperCase();
    if (!socket || !code) return;

    const join = () => {
      socket.emit("join-room", code);
      setSocketOk(true);
    };
    const onDisconnect = () => setSocketOk(false);
    const onReconnect  = () => { setSocketOk(true); join(); };

    /* helpers */
    const patchPresence = (userId, status) => {
      const room = useRoomStore.getState().currentRoom;
      if (!room?.members) return;
      updateRoomMembers(room.roomId, room.members.map(m => {
        const id = String(m.user?._id || m.user);
        return id === String(userId) ? { ...m, user: { ...m.user, status } } : m;
      }));
    };

    /* listeners */
    const onNewMessage = (msg) => setMessages(prev => {
      if (prev.some(m => String(m._id) === String(msg._id))) return prev;
      const idx = prev.findIndex(m =>
        m._optimistic &&
        String(m.sender?._id || m.sender) === String(msg.sender?._id || msg.sender) &&
        (m.type === "text" ? m.content === msg.content : m.type === msg.type)
      );
      if (idx === -1) return [...prev, msg];
      const next = [...prev]; next[idx] = msg; return next;
    });

    const onUserJoined = async ({ userId, username }) => {
      toast(`${username} joined`, { icon: "👋" });
      const room = useRoomStore.getState().currentRoom;
      if (!room?.members?.some(m => String(m.user?._id || m.user) === String(userId))) {
        try { const { data } = await api.get(`/rooms/${roomId}`); setCurrentRoom(data); } catch {}
      } else { patchPresence(userId, "online"); }
    };
    const onUserLeft    = ({ userId, username }) => { toast(`${username} left`, { icon: "👋" }); patchPresence(userId, "offline"); };
    const onTypingStart = ({ username })          => setTypingUsers(p => { const s = new Set(p); s.add(username);    return s; });
    const onTypingStop  = ({ username })          => setTypingUsers(p => { const s = new Set(p); s.delete(username); return s; });
    const onDeleted     = ({ messageId })         => setMessages(p => p.filter(m => String(m._id) !== String(messageId)));
    const onReaction    = ({ messageId, reactions }) => setMessages(p => p.map(m => String(m._id) === String(messageId) ? { ...m, reactions } : m));
    const onRoomUsers   = (ids) => {
      const room = useRoomStore.getState().currentRoom;
      if (!room?.members) return;
      const set = new Set(ids.map(String));
      updateRoomMembers(room.roomId, room.members.map(m => ({
        ...m, user: { ...m.user, status: set.has(String(m.user?._id || m.user)) ? "online" : "offline" }
      })));
    };
    const onProfileUpdated = ({ userId, username, avatar }) => {
      const patch = s => s && String(s._id) === String(userId) ? { ...s, username, avatar } : s;
      setMessages(p => p.map(m => ({ ...m, sender: patch(m.sender), replyTo: m.replyTo ? { ...m.replyTo, sender: patch(m.replyTo.sender) } : m.replyTo })));
    };
    const onRoomDeleted = ({ roomId: rid, deletedBy }) => {
      if (rid?.toUpperCase() === code) { toast.error(`Room deleted by ${deletedBy || "admin"}`); navigate("/rooms"); }
    };
    const onRoomRevoked = ({ roomId: rid }) => {
      if (rid?.toUpperCase() === code) { removeRoomLocally(code); toast.error("You were removed"); navigate("/rooms"); }
    };
    const onGameInvite = ({ game, inviter, gameType }) => {
      setGames && null; // panels handle internally
      toast(t => (
        <div className="flex flex-col gap-2">
          <p className="font-semibold">🎮 {inviter.username} started <strong>{gameType}</strong></p>
          <div className="flex gap-2">
            <button onClick={() => { setShowGames(true); toast.dismiss(t.id); }}
              className="px-3 py-1.5 bg-blue-500 text-white text-xs rounded-lg">Open Games</button>
            <button onClick={() => toast.dismiss(t.id)}
              className="px-3 py-1.5 bg-white/10 text-white text-xs rounded-lg">Dismiss</button>
          </div>
        </div>
      ), { duration: 15000, style: { background: "#1a2235", color: "#fff", border: "1px solid rgba(255,255,255,0.1)", maxWidth: 340 } });
    };
    const onVoiceStarted = ({ userId, username, participantCount }) => {
      if (String(userId) === String(user?._id)) return;
      setVoiceCallCard({ username, participantCount: participantCount || 1, active: true });
    };
    const onVoiceUpdate = ({ participantCount }) => setVoiceCallCard(p => p ? { ...p, participantCount } : p);
    const onVoiceEnded  = ()                      => setVoiceCallCard(p => p ? { ...p, active: false } : null);

    socket.on("connect",             join);
    socket.on("disconnect",          onDisconnect);
    socket.on("reconnect",           onReconnect);
    socket.on("new-message",         onNewMessage);
    socket.on("user-joined",         onUserJoined);
    socket.on("user-left",           onUserLeft);
    socket.on("user-typing",         onTypingStart);
    socket.on("user-stop-typing",    onTypingStop);
    socket.on("message-deleted",     onDeleted);
    socket.on("reaction-added",      onReaction);
    socket.on("room-users",          onRoomUsers);
    socket.on("profile-updated",     onProfileUpdated);
    socket.on("room-deleted",        onRoomDeleted);
    socket.on("room-access-revoked", onRoomRevoked);
    socket.on("game-invite",         onGameInvite);
    socket.on("voice-call-started",  onVoiceStarted);
    socket.on("voice-call-update",   onVoiceUpdate);
    socket.on("voice-call-ended",    onVoiceEnded);
    if (socket.connected) join();

    return () => {
      socket.off("connect",             join);
      socket.off("disconnect",          onDisconnect);
      socket.off("reconnect",           onReconnect);
      socket.off("new-message",         onNewMessage);
      socket.off("user-joined",         onUserJoined);
      socket.off("user-left",           onUserLeft);
      socket.off("user-typing",         onTypingStart);
      socket.off("user-stop-typing",    onTypingStop);
      socket.off("message-deleted",     onDeleted);
      socket.off("reaction-added",      onReaction);
      socket.off("room-users",          onRoomUsers);
      socket.off("profile-updated",     onProfileUpdated);
      socket.off("room-deleted",        onRoomDeleted);
      socket.off("room-access-revoked", onRoomRevoked);
      socket.off("game-invite",         onGameInvite);
      socket.off("voice-call-started",  onVoiceStarted);
      socket.off("voice-call-update",   onVoiceUpdate);
      socket.off("voice-call-ended",    onVoiceEnded);
      socket.emit("leave-room", code);
    };
  }, [roomId]);

  /* ── derived: grouped messages with day-dividers ── */
  const rows = useMemo(() => {
    const out = [];
    let lastDate = "";
    let lastSender = "";
    for (const msg of messages) {
      /* day divider */
      const dateKey = msg.createdAt ? new Date(msg.createdAt).toDateString() : "";
      if (dateKey && dateKey !== lastDate) {
        out.push({ type: "day", id: `day-${dateKey}`, label: dayLabel(msg.createdAt) });
        lastDate   = dateKey;
        lastSender = "";           /* reset grouping after divider */
      }
      /* message */
      const senderId = String(msg.sender?._id || msg.sender || "");
      const isFirst  = senderId !== lastSender;
      out.push({ type: "msg", id: msg._id, msg, isFirst });
      if (msg.type !== "system") lastSender = senderId;
    }
    return out;
  }, [messages]);

  /* callbacks to avoid re-renders in Message */
  const handleReaction = useCallback((id, reactions) =>
    setMessages(p => p.map(m => String(m._id) === String(id) ? { ...m, reactions } : m)), []);
  const handleDeleted  = useCallback((id) =>
    setMessages(p => p.filter(m => String(m._id) !== String(id))), []);
  const handleReply    = useCallback((msg) => {
    setReplyTo(msg); textareaRef.current?.focus();
  }, []);

  /* ── send ── */
  const handleSend = useCallback(async (e) => {
    e.preventDefault();
    const text = newMessage.trim();
    if (!text) return;
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = null;
    getSocket()?.emit("typing-stop", roomId);

    const rid      = replyTo?._id;
    const rSnap    = replyTo;
    setReplyTo(null);
    setShowMentions(false);
    setNewMessage("");

    const tempId = `temp-${Date.now()}`;
    setMessages(p => [...p, {
      _id: tempId, content: text, sender: user,
      createdAt: new Date().toISOString(), type: "text", reactions: [],
      replyTo: rSnap ? { _id: rid, content: rSnap.content, sender: rSnap.sender } : null,
      _optimistic: true,
    }]);

    try {
      const { data } = await api.post(`/messages/${roomId}`, { content: text, ...(rid ? { replyTo: rid } : {}) });
      setMessages(p => {
        if (p.some(m => String(m._id) === String(data._id))) return p.filter(m => m._id !== tempId);
        return p.map(m => m._id === tempId ? data : m);
      });
    } catch {
      setMessages(p => p.filter(m => m._id !== tempId));
      setNewMessage(text);
      toast.error("Failed to send message — tap to retry");
    }
  }, [newMessage, replyTo, roomId, user]);

  /* ── typing ── */
  const handleTyping = useCallback((val) => {
    const socket = getSocket();
    if (socket) {
      if (!typingTimeoutRef.current) socket.emit("typing-start", roomId);
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit("typing-stop", roomId);
        typingTimeoutRef.current = null;
      }, 1200);
    }
    const cursor = textareaRef.current?.selectionStart ?? val.length;
    const m      = val.slice(0, cursor).match(/@(\w*)$/);
    if (m) { setMentionQuery(m[1].toLowerCase()); setShowMentions(true); }
    else   { setShowMentions(false); setMentionQuery(""); }
  }, [roomId]);

  /* ── file upload ── */
  const handleFile = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast.error("Max 10 MB"); return; }

    const tempId     = `temp-file-${Date.now()}`;
    const previewUrl = file.type.startsWith("image/") ? URL.createObjectURL(file) : "";
    setMessages(p => [...p, {
      _id: tempId, _optimistic: true, content: "", sender: user,
      createdAt: new Date().toISOString(),
      type: file.type.startsWith("image/") ? "image" : "file",
      reactions: [],
      file: { url: previewUrl, filename: file.name, mimetype: file.type, size: file.size },
    }]);

    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const { data } = await api.post(`/messages/${roomId}/upload`, fd, { headers: { "Content-Type": "multipart/form-data" } });
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setMessages(p => {
        if (p.some(m => String(m._id) === String(data._id))) return p.filter(m => m._id !== tempId);
        return p.map(m => m._id === tempId ? data : m);
      });
      toast.success("Uploaded!");
    } catch (err) {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setMessages(p => p.filter(m => m._id !== tempId));
      toast.error(err.response?.data?.message || "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [roomId, user]);

  /* ── mention suggestions ── */
  const mentionSuggestions = useMemo(() =>
    (currentRoom?.members || [])
      .map(m => m.user?.username)
      .filter(u => u && u.toLowerCase().startsWith(mentionQuery) && u !== user?.username)
      .slice(0, 5),
    [currentRoom?.members, mentionQuery, user?.username]
  );
  const handleMentionSelect = useCallback((username) => {
    const cur  = textareaRef.current?.selectionStart ?? newMessage.length;
    const repl = newMessage.slice(0, cur).replace(/@\w*$/, `@${username} `);
    setNewMessage(repl + newMessage.slice(cur));
    setShowMentions(false);
    textareaRef.current?.focus();
  }, [newMessage]);

  /* ── background ── */
  const handleBgChange = useCallback((id) => {
    setChatBg(id);
    localStorage.setItem(`room-bg-${roomId}`, id);
    toast.success("Theme updated 🎨");
  }, [roomId]);

  /* ── room actions ── */
  const isAdmin = Boolean(user?._id) && (
    String(currentRoom?.creator?._id || currentRoom?.creator) === String(user._id) ||
    currentRoom?.members?.some(m => String(m.user?._id || m.user) === String(user._id) && m.role === "admin")
  );

  const doLeave = useCallback(async () => {
    const r = await leaveRoom(roomId);
    if (r.success) { toast.success("Left room"); navigate("/rooms"); }
  }, [leaveRoom, roomId, navigate]);

  const doDelete = useCallback(async () => {
    const r = await useRoomStore.getState().deleteRoom(roomId);
    if (r.success) { toast.success("Room deleted"); navigate("/rooms"); }
    else toast.error(r.message || "Failed to delete");
  }, [roomId, navigate]);

  /* ── scroll to bottom ── */
  const scrollToBottom = useCallback(() => {
    virtuosoRef.current?.scrollToIndex({ index: "LAST", behavior: "smooth" });
  }, []);

  /* ── loading skeleton ── */
  if (loading) {
    return (
      <div className="room-page flex flex-col" style={{ background: "linear-gradient(180deg,#0b1a2e,#081321)" }}>
        <div className="h-16 mx-3 mt-3 rounded-3xl skeleton" />
        <div className="flex-1 flex flex-col gap-5 p-4 overflow-hidden">
          {[1,2,3,4,5].map(i => <MessageSkeleton key={i} />)}
        </div>
        <div className="h-14 mx-4 mb-4 rounded-2xl skeleton" />
      </div>
    );
  }

  return (
    <div className="room-page flex flex-col text-primary" style={{ background: "linear-gradient(180deg,#0b1a2e,#081321)" }}>

      {/* ── Reconnecting banner ── */}
      {!socketOk && (
        <div className="reconnect-banner">
          <WifiOff className="w-3.5 h-3.5" />
          Reconnecting to chat…
        </div>
      )}

      {/* ══════════ HEADER ══════════ */}
      <header className="shrink-0 px-3 pt-3">
        <div
          className="flex items-center gap-2 rounded-[1.6rem] px-3 py-2.5"
          style={{
            background: "rgba(16,25,42,0.85)",
            border: "1px solid rgba(255,255,255,0.08)",
            backdropFilter: "blur(20px)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
          }}
        >
          {/* Back */}
          <button
            onClick={() => navigate("/rooms")}
            aria-label="Back to rooms"
            title="Back to rooms"
            className="shrink-0 w-9 h-9 flex items-center justify-center rounded-2xl text-white/50 hover:text-white/90 hover:bg-white/8 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          {/* Room identity */}
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <div className="relative shrink-0">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center font-display text-lg text-white shadow-[0_6px_20px_rgba(196,107,74,0.3)]"
                style={{ background: "linear-gradient(135deg,#c46b4a,#8d3d28)" }}>
                {currentRoom?.name?.[0]?.toUpperCase()}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 bg-green-400"
                style={{ borderColor: "#10192a" }} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.22em] text-white/35">Room</p>
              <h1 className="font-display text-[1.2rem] leading-none truncate text-white/90">
                {currentRoom?.name}
              </h1>
              <p className="text-[11px] text-white/35 mt-0.5">
                {currentRoom?.members?.length || 0} members
              </p>
            </div>
          </div>

          {/* Nav pills */}
          <div className="flex items-center gap-0.5 rounded-full p-1" style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <NavBtn icon={Palette}   label="Theme"  onClick={() => setShowBgSelector(true)}  active={false} />
            <NavBtn icon={Gamepad2}  label="Games"  onClick={() => setShowGames(v => !v)}     active={showGames} />
            <NavBtn icon={Mic}       label="Voice"  onClick={() => setShowVoiceChat(v => !v)} active={showVoiceChat} tone="green" />
            <NavBtn icon={Users}     label="People" onClick={() => setShowMembers(v => !v)}   active={showMembers} />
          </div>

          {/* Profile button */}
          <button
            onClick={() => navigate("/profile")}
            title="Your profile"
            aria-label="Your profile"
            className="hidden sm:flex items-center gap-2 h-9 pl-1 pr-3 rounded-full hover:bg-white/8 transition-colors"
          >
            <Avatar user={user} size="sm" />
            <span className="text-[12px] font-medium max-w-[80px] truncate text-white/70">{user?.username}</span>
          </button>

          {/* ⋯ Settings dropdown */}
          <div className="relative shrink-0">
            <button
              onClick={() => setShowSettings(v => !v)}
              aria-label="Room settings"
              title="Room settings"
              className="w-9 h-9 flex items-center justify-center rounded-2xl text-white/40 hover:text-white/80 hover:bg-white/8 transition-colors"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
            <AnimatePresence>
              {showSettings && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.93, y: -6 }}
                  animate={{ opacity: 1, scale: 1,    y: 0  }}
                  exit={{   opacity: 0, scale: 0.93, y: -6  }}
                  transition={{ duration: 0.14 }}
                  className="absolute right-0 top-full mt-2 w-44 rounded-2xl overflow-hidden z-50 shadow-2xl"
                  style={{ background: "#10192a", border: "1px solid rgba(255,255,255,0.09)" }}
                >
                  <button
                    onClick={() => { setShowSettings(false); setConfirmLeave(true); }}
                    className="w-full flex items-center gap-2.5 px-4 py-3 text-[13px] text-white/70 hover:bg-white/6 hover:text-white transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Leave Room
                  </button>
                  {isAdmin && (
                    <button
                      onClick={() => { setShowSettings(false); setConfirmDelete(true); }}
                      className="w-full flex items-center gap-2.5 px-4 py-3 text-[13px] text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete Room
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      {/* ══════════ BODY ══════════ */}
      <div className="flex-1 flex overflow-hidden mt-2 mx-3 mb-3 gap-3">

        {/* Chat column */}
        <div
          className="flex-1 flex flex-col rounded-3xl overflow-hidden min-w-0"
          style={{ background: "rgba(10,18,30,0.6)", border: "1px solid rgba(255,255,255,0.07)", backdropFilter: "blur(12px)" }}
        >
          {/* Messages */}
          <div className="flex-1 relative overflow-hidden" role="log" aria-live="polite" aria-label="Messages" style={getBgStyle(chatBg)}>
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center gap-3 text-white/30 text-sm">
                <span className="text-4xl">💬</span>
                <p>No messages yet. Say hi!</p>
              </div>
            ) : (
              <Virtuoso
                ref={virtuosoRef}
                data={rows}
                followOutput="smooth"
                atBottomStateChange={setAtBottom}
                style={{ height: "100%" }}
                itemContent={(_, row) => {
                  if (row.type === "day") return (
                    <div key={row.id} className="day-divider px-6 py-2">
                      <span>{row.label}</span>
                    </div>
                  );
                  return (
                    <div
                      key={row.id}
                      className="px-4 py-[2px]"
                      style={{ paddingTop: row.isFirst ? "10px" : "2px" }}
                    >
                      <Message
                        message={row.msg}
                        currentUser={user}
                        isFirst={row.isFirst}
                        onReaction={handleReaction}
                        onDeleted={handleDeleted}
                        onReply={handleReply}
                      />
                    </div>
                  );
                }}
                components={{
                  Footer: () => (
                    <div>
                      {/* Typing indicator */}
                      {typingUsers.size > 0 && (
                        <div className="flex items-center gap-2 px-6 py-2 text-[12px] text-white/40">
                          <span className="flex gap-1">
                            {[0,1,2].map(i => <span key={i} className={`typing-dot w-1.5 h-1.5 rounded-full bg-accent/60`} />)}
                          </span>
                          {Array.from(typingUsers).join(", ")} {typingUsers.size === 1 ? "is" : "are"} typing
                        </div>
                      )}
                      {/* Voice call card */}
                      {voiceCallCard && (
                        <div className="mx-4 my-3 flex justify-center">
                          <div className={`w-full max-w-sm rounded-3xl p-4 flex flex-col gap-3 border ${voiceCallCard.active ? "bg-emerald-950/80 border-emerald-400/30" : "border-white/10"}`} style={{ background: voiceCallCard.active ? undefined : "rgba(16,25,42,0.8)" }}>
                            <div className="flex items-center gap-3">
                              <div className={`w-9 h-9 rounded-full flex items-center justify-center ${voiceCallCard.active ? "bg-emerald-400/15" : "bg-white/5"}`}>
                                <Phone className={`w-4 h-4 ${voiceCallCard.active ? "text-emerald-300" : "text-white/40"}`} />
                              </div>
                              <div>
                                <p className="text-[13px] font-medium text-white/80">
                                  {voiceCallCard.active ? `${voiceCallCard.username} started a voice call` : "Voice call ended"}
                                </p>
                                {voiceCallCard.active && (
                                  <p className="text-[11px] text-white/40">{voiceCallCard.participantCount} participant{voiceCallCard.participantCount > 1 ? "s" : ""}</p>
                                )}
                              </div>
                            </div>
                            {voiceCallCard.active && (
                              <button onClick={() => setShowVoiceChat(true)}
                                className="w-full py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-white text-[13px] font-semibold flex items-center justify-center gap-2">
                                <Phone className="w-3.5 h-3.5" /> Join Voice Chat
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                      <div style={{ height: 8 }} />
                    </div>
                  ),
                }}
              />
            )}

            {/* Jump to latest */}
            {!atBottom && (
              <motion.button
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                onClick={scrollToBottom}
                className="jump-btn"
              >
                <ChevronDown className="w-3.5 h-3.5" />
                Jump to latest
              </motion.button>
            )}
          </div>

          {/* Voice panel (inline strip) */}
          {showVoiceChat && (
            <Suspense fallback={null}>
              <VoiceChat roomId={roomId} onClose={() => setShowVoiceChat(false)} />
            </Suspense>
          )}

          {/* ── Input area ── */}
          <div
            className="shrink-0 px-3 pb-3 pt-2"
            style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
          >
            {/* Reply bar */}
            <AnimatePresence>
              {replyTo && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  className="flex items-center gap-2 mb-2 px-3 py-2 rounded-xl"
                  style={{ background: "rgba(196,107,74,0.1)", border: "1px solid rgba(196,107,74,0.2)" }}
                >
                  <Reply className="w-3.5 h-3.5 text-accent shrink-0" />
                  <div className="flex-1 min-w-0 text-[11px]">
                    <span className="font-semibold text-accent">{replyTo.sender?.username}</span>
                    <span className="ml-1.5 text-white/45">{replyTo.content?.slice(0, 70)}</span>
                  </div>
                  <button onClick={() => setReplyTo(null)} className="text-white/35 hover:text-white/70"><X className="w-3.5 h-3.5" /></button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Mention dropdown */}
            <AnimatePresence>
              {showMentions && mentionSuggestions.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                  className="mb-2 rounded-xl overflow-hidden"
                  style={{ background: "#10192a", border: "1px solid rgba(255,255,255,0.09)" }}
                >
                  {mentionSuggestions.map(u => (
                    <button key={u}
                      onMouseDown={e => { e.preventDefault(); handleMentionSelect(u); }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-white/6 text-left text-[13px]"
                    >
                      <div className="w-6 h-6 rounded-full bg-accent/20 text-accent text-[11px] font-bold flex items-center justify-center shrink-0">
                        {u[0].toUpperCase()}
                      </div>
                      @{u}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Input row */}
            <form onSubmit={handleSend}
              className="flex items-end gap-2 rounded-2xl p-2"
              style={{ background: "rgba(16,25,42,0.8)", border: "1px solid rgba(255,255,255,0.08)", backdropFilter: "blur(12px)" }}
            >
              {/* Attach */}
              <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading}
                aria-label="Upload file" title="Upload file"
                className="p-2 rounded-xl text-white/40 hover:text-white/80 hover:bg-white/8 disabled:opacity-30 transition-colors shrink-0">
                <Paperclip className="w-4.5 h-4.5" />
              </button>
              <input ref={fileInputRef} type="file" onChange={handleFile} className="hidden"
                accept="image/*,video/*,.pdf,.doc,.docx,.txt,.gif" />

              {/* Textarea */}
              <div className="flex-1 relative">
                <textarea
                  ref={textareaRef}
                  value={newMessage}
                  onChange={e => { setNewMessage(e.target.value); handleTyping(e.target.value); }}
                  onKeyDown={e => {
                    if (e.key === "Escape") { setReplyTo(null); setShowMentions(false); }
                    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(e); }
                  }}
                  placeholder={replyTo ? `Reply to ${replyTo.sender?.username}…` : "Message… (``` code, @ mention, Shift+Enter new line)"}
                  rows={1}
                  aria-label="Message input"
                  className="auto-grow w-full px-3 py-2 bg-transparent text-primary text-[14px] leading-relaxed focus:outline-none placeholder:text-white/25"
                />
                {/* Emoji picker */}
                {showEmojiPicker && (
                  <Suspense fallback={null}>
                    <EmojiPicker
                      onSelect={emoji => setNewMessage(p => p + emoji)}
                      onClose={() => setShowEmojiPicker(false)}
                    />
                  </Suspense>
                )}
              </div>

              {/* Emoji toggle */}
              <button type="button" onClick={() => setShowEmojiPicker(v => !v)}
                aria-label="Emoji picker" title="Emoji picker"
                className={`p-2 rounded-xl transition-colors shrink-0 ${showEmojiPicker ? "bg-accent/20 text-accent" : "text-white/40 hover:text-white/80 hover:bg-white/8"}`}>
                <Smile className="w-4.5 h-4.5" />
              </button>

              {/* Send */}
              <button type="submit"
                disabled={!newMessage.trim() || uploading}
                aria-label="Send message"
                title="Send message"
                className="p-2 rounded-xl bg-accent hover:bg-accent-hover text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors shrink-0">
                <Send className="w-4.5 h-4.5" />
              </button>
            </form>

            {uploading && (
              <p className="mt-1.5 text-[11px] text-white/35 flex items-center gap-1.5 px-1">
                <span className="w-3 h-3 rounded-full border-2 border-accent/30 border-t-accent animate-spin" />
                Uploading…
              </p>
            )}
          </div>
        </div>

        {/* Members panel */}
        <AnimatePresence>
          {showMembers && (
            <MembersSidebar room={currentRoom} onClose={() => setShowMembers(false)} />
          )}
        </AnimatePresence>

        {/* Games panel */}
        <AnimatePresence>
          {showGames && (
            <Suspense fallback={<div className="w-80 rounded-3xl skeleton" />}>
              <GamesPanel roomId={roomId} onClose={() => setShowGames(false)} />
            </Suspense>
          )}
        </AnimatePresence>
      </div>

      {/* ── Modals ── */}
      <AnimatePresence>
        {showBgSelector && (
          <BackgroundSelector
            currentBackground={chatBg}
            onChange={handleBgChange}
            onClose={() => setShowBgSelector(false)}
          />
        )}
      </AnimatePresence>

      <ConfirmModal
        isOpen={confirmLeave}
        onClose={() => setConfirmLeave(false)}
        onConfirm={doLeave}
        title="Leave Room?"
        message={`You will no longer see messages from "${currentRoom?.name}". You can rejoin with the room code.`}
        confirmText="Leave"
        cancelText="Stay"
      />
      <ConfirmModal
        isOpen={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={doDelete}
        title={`Delete "${currentRoom?.name}"?`}
        message="This permanently deletes all messages, games, and room data. This action cannot be undone."
        confirmText="Delete Forever"
        isDanger
      />
    </div>
  );
};

export default Room;

