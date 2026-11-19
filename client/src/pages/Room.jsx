import {
  useEffect, useState, useRef, useCallback, useMemo, lazy, Suspense
} from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft, Send, Paperclip, Smile, Users,
  LogOut, Gamepad2, Mic, Trash2, Phone, Palette, X, Reply,
  ChevronDown, WifiOff, MoreVertical, Plus, DoorOpen, Menu, Search
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
import CreateRoomModal from "../components/CreateRoomModal";
import JoinRoomModal from "../components/JoinRoomModal";

const GamesPanel  = lazy(() => import("../components/GamesPanel"));
const VoiceChat   = lazy(() => import("../components/VoiceChat"));
const EmojiPicker = lazy(() => import("../components/EmojiPicker"));

/* ── Skeleton ──────────────────────────────────────────────────────────── */
const MessageSkeleton = () => (
  <div className="flex items-end gap-2 px-4">
    <div className="skeleton w-8 h-8 rounded-full shrink-0" />
    <div className="flex flex-col gap-1.5 flex-1 max-w-xs">
      <div className="skeleton h-3 w-24 rounded" />
      <div className="skeleton h-10 w-48 rounded-2xl" />
    </div>
  </div>
);

/* ── Day label ─────────────────────────────────────────────────────────── */
function dayLabel(iso) {
  const d = new Date(iso), now = new Date();
  if (d.toDateString() === now.toDateString()) return "Today";
  const y = new Date(now); y.setDate(now.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return "Yesterday";
  return d.toLocaleDateString([], { weekday:"long", month:"short", day:"numeric" });
}

/* ── Relative time for sidebar ─────────────────────────────────────────── */
function relTime(iso) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

/* ═══════════════════════════════════════════════════════════════════════
   ROOM PAGE
   ═══════════════════════════════════════════════════════════════════════ */
const Room = () => {
  const { roomId }  = useParams();
  const navigate    = useNavigate();
  const { user }    = useAuthStore();
  const {
    rooms, fetchRooms,
    currentRoom, setCurrentRoom,
    leaveRoom, removeRoomLocally, updateRoomMembers, deleteRoom: storeDeleteRoom,
  } = useRoomStore();

  /* ── state ── */
  const [messages,        setMessages]        = useState([]);
  const [newMessage,      setNewMessage]      = useState("");
  const [loading,         setLoading]         = useState(true);
  const [socketOk,        setSocketOk]        = useState(true);
  const [typingUsers,     setTypingUsers]     = useState(new Set());
  const [showMembers,     setShowMembers]     = useState(false);
  const [showGames,       setShowGames]       = useState(false);
  const [showVoiceChat,   setShowVoiceChat]   = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showBgSelector,  setShowBgSelector]  = useState(false);
  const [showSettings,    setShowSettings]    = useState(false);
  const [showSidebar,     setShowSidebar]     = useState(false); // mobile sidebar
  const [confirmLeave,    setConfirmLeave]    = useState(false);
  const [confirmDelete,   setConfirmDelete]   = useState(false);
  const [showCreate,      setShowCreate]      = useState(false);
  const [showJoin,        setShowJoin]        = useState(false);
  const [chatBg,          setChatBg]          = useState(() =>
    localStorage.getItem(`room-bg-${roomId}`) || "default"
  );
  const [uploading,       setUploading]       = useState(false);
  const [replyTo,         setReplyTo]         = useState(null);
  const [mentionQuery,    setMentionQuery]    = useState("");
  const [showMentions,    setShowMentions]    = useState(false);
  const [voiceCallCard,   setVoiceCallCard]   = useState(null);
  const [atBottom,        setAtBottom]        = useState(true);

  /* ── refs ── */
  const virtuosoRef      = useRef(null);
  const textareaRef      = useRef(null);
  const typingTimeoutRef = useRef(null);
  const fileInputRef     = useRef(null);

  /* ── fetch rooms list for sidebar ── */
  useEffect(() => { fetchRooms(); }, [fetchRooms]);

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

    const join        = () => { socket.emit("join-room", code); setSocketOk(true); };
    const onDisconn   = () => setSocketOk(false);
    const onReconn    = () => { setSocketOk(true); join(); };

    const patchPresence = (userId, status) => {
      const room = useRoomStore.getState().currentRoom;
      if (!room?.members) return;
      updateRoomMembers(room.roomId, room.members.map(m => {
        const id = String(m.user?._id || m.user);
        return id === String(userId) ? { ...m, user: { ...m.user, status } } : m;
      }));
    };

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
    const onTypingStart = ({ username }) => setTypingUsers(p => { const s = new Set(p); s.add(username);    return s; });
    const onTypingStop  = ({ username }) => setTypingUsers(p => { const s = new Set(p); s.delete(username); return s; });
    const onDeleted     = ({ messageId }) => setMessages(p => p.filter(m => String(m._id) !== String(messageId)));
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
    const onGameInvite = ({ inviter, gameType }) => {
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
      ), { duration: 15000, style: { background: "#0a1e30", color: "#fff", border: "1px solid rgba(255,255,255,0.1)", maxWidth: 340 } });
    };
    const onVoiceStarted = ({ userId, username, participantCount }) => {
      if (String(userId) === String(user?._id)) return;
      setVoiceCallCard({ username, participantCount: participantCount || 1, active: true });
    };
    const onVoiceUpdate = ({ participantCount }) => setVoiceCallCard(p => p ? { ...p, participantCount } : p);
    const onVoiceEnded  = () => setVoiceCallCard(p => p ? { ...p, active: false } : null);

    socket.on("connect",             join);
    socket.on("disconnect",          onDisconn);
    socket.on("reconnect",           onReconn);
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
      socket.off("disconnect",          onDisconn);
      socket.off("reconnect",           onReconn);
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

  /* ── grouped messages with day-dividers ── */
  const rows = useMemo(() => {
    const out = [];
    let lastDate = "", lastSender = "";
    for (const msg of messages) {
      const dateKey = msg.createdAt ? new Date(msg.createdAt).toDateString() : "";
      if (dateKey && dateKey !== lastDate) {
        out.push({ type: "day", id: `day-${dateKey}`, label: dayLabel(msg.createdAt) });
        lastDate = dateKey; lastSender = "";
      }
      const senderId = String(msg.sender?._id || msg.sender || "");
      const isFirst  = senderId !== lastSender;
      out.push({ type: "msg", id: msg._id, msg, isFirst });
      if (msg.type !== "system") lastSender = senderId;
    }
    return out;
  }, [messages]);

  /* ── callbacks ── */
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
    const rid = replyTo?._id, rSnap = replyTo;
    setReplyTo(null); setShowMentions(false); setNewMessage("");
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
      toast.error("Failed to send");
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
    const m = val.slice(0, cursor).match(/@(\w*)$/);
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

  const doLeave  = useCallback(async () => {
    const r = await leaveRoom(roomId);
    if (r.success) { toast.success("Left room"); navigate("/rooms"); }
  }, [leaveRoom, roomId, navigate]);

  const doDelete = useCallback(async () => {
    const r = await storeDeleteRoom(roomId);
    if (r.success) { toast.success("Room deleted"); navigate("/rooms"); }
    else toast.error(r.message || "Failed to delete");
  }, [storeDeleteRoom, roomId, navigate]);

  const scrollToBottom = useCallback(() => {
    virtuosoRef.current?.scrollToIndex({ index: "LAST", behavior: "smooth" });
  }, []);

  /* ── sidebar room click (kept for modal-triggered navigation) ── */
  const handleRoomClick = useCallback((room) => {
    setCurrentRoom(room);
    setShowSidebar(false);
    navigate("/room/" + room.roomId);
  }, [setCurrentRoom, navigate]);

  /* ── members sorted: online first ── */
  const sortedMembers = useMemo(() => {
    const members = currentRoom?.members || [];
    return [...members].sort((a, b) => {
      const ao = a.user?.status === "online" ? 0 : 1;
      const bo = b.user?.status === "online" ? 0 : 1;
      return ao - bo;
    });
  }, [currentRoom?.members]);

  /* ── loading ── */
  if (loading) return (
    <div className="room-page">
      <div className="room-sidebar">
        <div className="sidebar-header">
          <div className="skeleton h-6 w-28 rounded" />
        </div>
        <div className="flex flex-col gap-2 p-3">
          {[1,2,3,4].map(i => (
            <div key={i} className="flex items-center gap-3 p-3">
              <div className="skeleton w-12 h-12 rounded-full shrink-0" />
              <div className="flex flex-col gap-1.5 flex-1">
                <div className="skeleton h-3.5 w-28 rounded" />
                <div className="skeleton h-3 w-40 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="room-chat">
        <div className="skeleton h-[72px] shrink-0" style={{ borderRadius: 0 }} />
        <div className="flex-1 flex flex-col gap-5 p-4 overflow-hidden">
          {[1,2,3,4,5].map(i => <MessageSkeleton key={i} />)}
        </div>
        <div className="skeleton h-[70px] shrink-0 mx-4 mb-4 rounded-full" />
      </div>
    </div>
  );

  /* ═══════════════════════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════════════════════ */
  return (
    <div className="room-page">

      {/* ══════════════════════════════════════════
          LEFT SIDEBAR
          ══════════════════════════════════════════ */}
      <div className={`room-sidebar ${showSidebar ? "open" : ""}`}>

        {/* Mobile backdrop */}
        {showSidebar && (
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setShowSidebar(false)}
          />
        )}

        {/* Sidebar header */}
        <div className="sidebar-header">
          <div className="flex items-center gap-2">
            <span style={{ fontSize: "18px", fontWeight: 700, color: "rgba(255,255,255,0.9)", letterSpacing: "-0.02em" }}>
              Hangout
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setShowJoin(true)}
              className="header-icon-btn"
              title="Join room"
            >
              <DoorOpen className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowCreate(true)}
              className="header-icon-btn"
              title="Create room"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search bar */}
        <div className="px-3 pt-3 pb-2 shrink-0">
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-full"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <Search className="w-3.5 h-3.5 shrink-0" style={{ color: "rgba(255,255,255,0.3)" }} />
            <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.28)" }}>Search rooms…</span>
          </div>
        </div>

        {/* Room list */}
        <div className="flex-1 overflow-y-auto py-1">
          {rooms.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 gap-2">
              <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.3)" }}>No rooms yet</p>
              <button
                onClick={() => setShowCreate(true)}
                className="px-3 py-1.5 rounded-xl text-white text-xs font-semibold"
                style={{ background: "rgba(196,107,74,0.2)", border: "1px solid rgba(196,107,74,0.3)" }}
              >
                Create one
              </button>
            </div>
          ) : (
            rooms.map(room => {
              const isActive = room.roomId?.toUpperCase() === roomId?.toUpperCase();
              const memberCount = room.members?.length || 0;
              return (
                <div
                  key={room._id}
                  className={`room-item ${isActive ? "active" : ""}`}
                  onClick={() => handleRoomClick(room)}
                >
                  <div className="room-item-avatar">
                    {room.name?.[0]?.toUpperCase()}
                    {/* show dot if any member online */}
                    {room.members?.some(m => m.user?.status === "online") && (
                      <div className="online-dot" />
                    )}
                  </div>
                  <div className="room-item-body">
                    <div className="room-item-name">{room.name}</div>
                    <div className="room-item-preview">{memberCount} member{memberCount !== 1 ? "s" : ""} · #{room.roomId}</div>
                  </div>
                  <div className="room-item-meta">
                    {isActive && (
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ background: "var(--c-accent)" }}
                      />
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Bottom nav */}
        <div className="sidebar-bottom-nav">
          <button
            className="sidebar-nav-btn active"
            onClick={() => navigate("/rooms")}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            Chats
          </button>
          <button
            className="sidebar-nav-btn"
            onClick={() => setShowVoiceChat(v => !v)}
          >
            <Mic className="w-5 h-5" />
            Voice
          </button>
          <button
            className="sidebar-nav-btn"
            onClick={() => setShowGames(v => !v)}
          >
            <Gamepad2 className="w-5 h-5" />
            Games
          </button>
          <button
            className="sidebar-nav-btn"
            onClick={() => navigate("/profile")}
          >
            <Avatar user={user} size="xs" />
            Profile
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════════
          RIGHT CHAT PANEL
          ══════════════════════════════════════════ */}
      <div className="room-chat">

        {/* Reconnecting banner */}
        {!socketOk && (
          <div className="reconnect-banner">
            <WifiOff className="w-3.5 h-3.5" />
            Reconnecting to chat…
          </div>
        )}

        {/* ── Chat Header ── */}
        <div className="chat-header">
          {/* Mobile: hamburger */}
          <button
            className="header-icon-btn md:hidden"
            onClick={() => setShowSidebar(true)}
            aria-label="Open sidebar"
          >
            <Menu className="w-4 h-4" />
          </button>

          {/* Back (desktop) */}
          <button
            className="header-icon-btn hidden md:flex"
            onClick={() => navigate("/rooms")}
            aria-label="Back to rooms"
            title="Back to rooms"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          {/* Room avatar */}
          <div className="chat-header-avatar">
            {currentRoom?.name?.[0]?.toUpperCase()}
            <div className="online-dot" />
          </div>

          {/* Room info */}
          <div className="flex-1 min-w-0">
            <h1
              className="truncate leading-tight"
              style={{ fontSize: "15px", fontWeight: 700, color: "rgba(255,255,255,0.92)", letterSpacing: "-0.015em" }}
            >
              {currentRoom?.name}
            </h1>
            <p style={{ fontSize: "11.5px", color: "rgba(45,212,191,0.75)", lineHeight: 1, marginTop: "2px" }}>
              {currentRoom?.members?.length || 0} members · Active now
            </p>
          </div>

          {/* Action icons */}
          <div className="chat-header-actions">
            <button
              className={`header-icon-btn ${showBgSelector ? "active" : ""}`}
              onClick={() => setShowBgSelector(true)}
              title="Chat theme"
            >
              <Palette className="w-4 h-4" />
            </button>
            <button
              className={`header-icon-btn ${showGames ? "active" : ""}`}
              onClick={() => setShowGames(v => !v)}
              title="Games"
            >
              <Gamepad2 className="w-4 h-4" />
            </button>
            <button
              className={`header-icon-btn ${showVoiceChat ? "active" : ""}`}
              style={showVoiceChat ? { color: "#34d399", background: "rgba(52,211,153,0.12)" } : {}}
              onClick={() => setShowVoiceChat(v => !v)}
              title="Voice chat"
            >
              <Mic className="w-4 h-4" />
            </button>
            <button
              className={`header-icon-btn ${showMembers ? "active" : ""}`}
              onClick={() => setShowMembers(v => !v)}
              title="Members"
            >
              <Users className="w-4 h-4" />
            </button>

            {/* ⋯ Settings */}
            <div className="relative">
              <button
                className="header-icon-btn"
                onClick={() => setShowSettings(v => !v)}
                aria-label="Room settings"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
              <AnimatePresence>
                {showSettings && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.93, y: -6 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.93, y: -6 }}
                    transition={{ duration: 0.14 }}
                    className="absolute right-0 top-full mt-2 w-44 rounded-2xl overflow-hidden z-50 shadow-2xl"
                    style={{ background: "#0a1e30", border: "1px solid rgba(255,255,255,0.09)" }}
                  >
                    <button
                      onClick={() => { setShowSettings(false); setConfirmLeave(true); }}
                      className="w-full flex items-center gap-2.5 px-4 py-3 text-[13px] text-white/70 hover:bg-white/6 hover:text-white transition-colors"
                    >
                      <LogOut className="w-4 h-4" /> Leave Room
                    </button>
                    {isAdmin && (
                      <button
                        onClick={() => { setShowSettings(false); setConfirmDelete(true); }}
                        className="w-full flex items-center gap-2.5 px-4 py-3 text-[13px] text-red-400 hover:bg-red-500/10 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" /> Delete Room
                      </button>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 flex overflow-hidden gap-0">

          {/* Chat column */}
          <div className="flex-1 flex flex-col overflow-hidden min-w-0">

            {/* Messages */}
            <div
              className="flex-1 relative overflow-hidden"
              role="log"
              aria-live="polite"
              aria-label="Messages"
              style={getBgStyle(chatBg)}
            >
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center gap-3" style={{ color: "rgba(255,255,255,0.3)" }}>
                  <span style={{ fontSize: "40px" }}>💬</span>
                  <p style={{ fontSize: "14px" }}>No messages yet. Say hi!</p>
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
                        className="px-4"
                        style={{ paddingTop: row.isFirst ? "10px" : "2px", paddingBottom: "2px" }}
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
                        {typingUsers.size > 0 && (
                          <div className="flex items-center gap-2 px-6 py-2" style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)" }}>
                            <span className="flex gap-1">
                              {[0,1,2].map(i => <span key={i} className="typing-dot w-1.5 h-1.5 rounded-full" style={{ background: "var(--c-accent)" }} />)}
                            </span>
                            {Array.from(typingUsers).join(", ")} {typingUsers.size === 1 ? "is" : "are"} typing
                          </div>
                        )}
                        {voiceCallCard && (
                          <div className="mx-4 my-3 flex justify-center">
                            <div
                              className="w-full max-w-sm rounded-3xl p-4 flex flex-col gap-3"
                              style={{
                                background: voiceCallCard.active ? "rgba(5,60,45,0.8)" : "rgba(10,30,48,0.8)",
                                border: `1px solid ${voiceCallCard.active ? "rgba(52,211,153,0.3)" : "rgba(255,255,255,0.1)"}`,
                              }}
                            >
                              <div className="flex items-center gap-3">
                                <div
                                  className="w-9 h-9 rounded-full flex items-center justify-center"
                                  style={{ background: voiceCallCard.active ? "rgba(52,211,153,0.15)" : "rgba(255,255,255,0.05)" }}
                                >
                                  <Phone className="w-4 h-4" style={{ color: voiceCallCard.active ? "#34d399" : "rgba(255,255,255,0.4)" }} />
                                </div>
                                <div>
                                  <p style={{ fontSize: "13px", fontWeight: 500, color: "rgba(255,255,255,0.8)" }}>
                                    {voiceCallCard.active ? `${voiceCallCard.username} started a voice call` : "Voice call ended"}
                                  </p>
                                  {voiceCallCard.active && (
                                    <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)" }}>{voiceCallCard.participantCount} participant{voiceCallCard.participantCount > 1 ? "s" : ""}</p>
                                  )}
                                </div>
                              </div>
                              {voiceCallCard.active && (
                                <button
                                  onClick={() => setShowVoiceChat(true)}
                                  className="w-full py-2.5 rounded-2xl text-white font-semibold flex items-center justify-center gap-2"
                                  style={{ background: "#34d399", fontSize: "13px" }}
                                >
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

            {/* Voice panel strip */}
            {showVoiceChat && (
              <Suspense fallback={null}>
                <VoiceChat roomId={roomId} onClose={() => setShowVoiceChat(false)} />
              </Suspense>
            )}

            {/* ── Composer ── */}
            <div className="composer-wrap">
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
                    <Reply className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--c-accent)" }} />
                    <div className="flex-1 min-w-0" style={{ fontSize: "11px" }}>
                      <span className="font-semibold" style={{ color: "var(--c-accent)" }}>{replyTo.sender?.username}</span>
                      <span className="ml-1.5" style={{ color: "rgba(255,255,255,0.45)" }}>{replyTo.content?.slice(0, 70)}</span>
                    </div>
                    <button onClick={() => setReplyTo(null)} style={{ color: "rgba(255,255,255,0.35)" }}>
                      <X className="w-3.5 h-3.5" />
                    </button>
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
                    style={{ background: "#0a1e30", border: "1px solid rgba(255,255,255,0.09)" }}
                  >
                    {mentionSuggestions.map(u => (
                      <button key={u}
                        onMouseDown={e => { e.preventDefault(); handleMentionSelect(u); }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-white/6 text-left"
                        style={{ fontSize: "13px" }}
                      >
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                          style={{ background: "rgba(196,107,74,0.2)", color: "var(--c-accent)", fontSize: "11px", fontWeight: 700 }}
                        >
                          {u[0].toUpperCase()}
                        </div>
                        @{u}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Input row */}
              <div className="composer-row">
                {/* Attach */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="composer-icon-btn"
                  aria-label="Upload file"
                  title="Upload file"
                >
                  <Paperclip className="w-5 h-5" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFile}
                  className="hidden"
                  accept="image/*,video/*,.pdf,.doc,.docx,.txt,.gif"
                />

                {/* Input pill */}
                <form
                  onSubmit={handleSend}
                  className="composer-input-wrap flex-1"
                >
                  {/* Emoji picker (inside form for position) */}
                  {showEmojiPicker && (
                    <Suspense fallback={null}>
                      <div className="absolute bottom-full right-0 pb-2 z-30">
                        <EmojiPicker
                          onSelect={emoji => setNewMessage(p => p + emoji)}
                          onClose={() => setShowEmojiPicker(false)}
                        />
                      </div>
                    </Suspense>
                  )}

                  <textarea
                    ref={textareaRef}
                    value={newMessage}
                    onChange={e => { setNewMessage(e.target.value); handleTyping(e.target.value); }}
                    onKeyDown={e => {
                      if (e.key === "Escape") { setReplyTo(null); setShowMentions(false); }
                      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(e); }
                    }}
                    placeholder={replyTo ? `Reply to ${replyTo.sender?.username}…` : "Send a message…"}
                    rows={1}
                    aria-label="Message input"
                  />

                  {/* Emoji button */}
                  <button
                    type="button"
                    onClick={() => setShowEmojiPicker(v => !v)}
                    aria-label="Emoji"
                    className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full transition-colors"
                    style={{ color: showEmojiPicker ? "var(--c-accent)" : "rgba(255,255,255,0.35)" }}
                  >
                    <Smile className="w-4.5 h-4.5" />
                  </button>
                </form>

                {/* Send */}
                <button
                  onClick={handleSend}
                  disabled={!newMessage.trim() || uploading}
                  className="composer-send-btn"
                  aria-label="Send message"
                  title="Send message"
                >
                  <Send className="w-[18px] h-[18px]" />
                </button>
              </div>

              {uploading && (
                <p className="mt-1.5 flex items-center gap-1.5 px-1" style={{ fontSize: "11px", color: "rgba(255,255,255,0.35)" }}>
                  <span className="w-3 h-3 rounded-full border-2 border-t-accent animate-spin" style={{ borderColor: "rgba(196,107,74,0.3)", borderTopColor: "var(--c-accent)" }} />
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

      <AnimatePresence>
        {showCreate && <CreateRoomModal onClose={() => setShowCreate(false)} />}
        {showJoin   && <JoinRoomModal   onClose={() => setShowJoin(false)} />}
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
