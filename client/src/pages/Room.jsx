import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, Send, Paperclip, Smile, Users, 
  LogOut, Gamepad2, Mic, Trash2, Phone, Palette, X, Reply
} from 'lucide-react';
import useAuthStore from '../store/authStore';
import useRoomStore from '../store/roomStore';
import { getSocket } from '../utils/socket';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';
import Message from '../components/Message';
import MembersSidebar from '../components/MembersSidebar';
import GamesPanel from '../components/GamesPanel';
import EmojiPicker from '../components/EmojiPicker';
import Avatar from '../components/Avatar';
import VoiceChat from '../components/VoiceChat';
import BackgroundSelector, { backgrounds, getBgStyle } from '../components/BackgroundSelector';

// ── Reusable header icon button ───────────────────────────────────────────────
const HeaderIconBtn = ({
  children, onClick, active, title,
  activeColor = '#c46b4a',
  activeBg = 'rgba(196,107,74,0.14)',
}) => (
  <button
    onClick={onClick}
    title={title}
    className="flex items-center justify-center w-8 h-8 rounded-xl transition-all"
    style={
      active
        ? { background: activeBg, color: activeColor, boxShadow: `0 0 10px ${activeBg}` }
        : { color: 'rgba(255,255,255,0.38)' }
    }
    onMouseEnter={e => {
      if (!active) {
        e.currentTarget.style.background = 'rgba(255,255,255,0.07)';
        e.currentTarget.style.color = 'rgba(255,255,255,0.85)';
      }
    }}
    onMouseLeave={e => {
      if (!active) {
        e.currentTarget.style.background = 'transparent';
        e.currentTarget.style.color = 'rgba(255,255,255,0.38)';
      }
    }}
  >
    {children}
  </button>
);

const Room = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const {
    currentRoom,
    setCurrentRoom,
    leaveRoom,
    removeRoomLocally,
    updateRoomMembers
  } = useRoomStore();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [showMembers, setShowMembers] = useState(false);
  const [showGames, setShowGames] = useState(false);
  const [showVoiceChat, setShowVoiceChat] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showBackgroundSelector, setShowBackgroundSelector] = useState(false);
  const [chatBackground, setChatBackground] = useState(() => {
    // Load saved background from localStorage
    return localStorage.getItem(`room-bg-${roomId}`) || 'default';
  });
  const [uploading, setUploading] = useState(false);
  const [voiceCallCard, setVoiceCallCard] = useState(null); // { username, participantCount, active }
  const [replyTo, setReplyTo] = useState(null); // message being replied to
  const [mentionQuery, setMentionQuery] = useState(''); // current @query
  const [showMentions, setShowMentions] = useState(false);
  const textareaRef = useRef(null);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setMessages([]);

    const loadRoomData = async () => {
      try {
        const { data: roomData } = await api.get(`/rooms/${roomId}`);
        if (cancelled) return;
        setCurrentRoom(roomData);

        const { data: messagesData } = await api.get(`/messages/${roomId}`);
        if (cancelled) return;
        setMessages(messagesData.messages);
      } catch (error) {
        if (cancelled) return;
        toast.error('Failed to load room');
        navigate('/rooms');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadRoomData();
    return () => {
      cancelled = true;
    };
  }, [roomId, setCurrentRoom, navigate]);

  useEffect(() => {
    const socket = getSocket();
    const code = roomId?.toUpperCase();
    if (!socket || !code) {
      console.warn('⚠️ Socket not available');
      return;
    }

    const join = () => {
      socket.emit('join-room', code);
    };

    const onProfileUpdated = ({ userId, username, avatar }) => {
      const patchSender = (sender) => {
        if (!sender || String(sender._id) !== String(userId)) return sender;
        return { ...sender, username, avatar };
      };

      setMessages(prev => prev.map(msg => ({
        ...msg,
        sender: patchSender(msg.sender),
        replyTo: msg.replyTo
          ? { ...msg.replyTo, sender: patchSender(msg.replyTo.sender) }
          : msg.replyTo
      })));
    };

    setupSocketListeners(socket);
    socket.on('profile-updated', onProfileUpdated);
    socket.on('connect', join);
    if (socket.connected) join();

    // Game invite listener — works even when GamesPanel is closed
    const onGameInvite = ({ game, inviter, gameType }) => {
      toast(
        (t) => (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '18px' }}>🎮</span>
              <span style={{ fontWeight: 600 }}>{inviter.username}</span>
              <span style={{ fontSize: '14px' }}>started a game!</span>
            </div>
            <p style={{ fontSize: '14px', color: '#9ca3af', margin: 0 }}>
              Join a game of <strong style={{ color: '#e5e7eb' }}>{gameType}</strong>
            </p>
            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
              <button
                onClick={() => {
                  setShowGames(true);
                  toast.dismiss(t.id);
                }}
                style={{
                  padding: '6px 12px',
                  background: '#3b82f6',
                  color: '#fff',
                  fontSize: '13px',
                  fontWeight: 500,
                  borderRadius: '8px',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                Open Games
              </button>
              <button
                onClick={() => toast.dismiss(t.id)}
                style={{
                  padding: '6px 12px',
                  background: '#374151',
                  color: '#fff',
                  fontSize: '13px',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                Dismiss
              </button>
            </div>
          </div>
        ),
        {
          duration: 15000,
          style: {
            background: '#1a1b1e',
            color: '#fff',
            border: '1px solid #2a2b2e',
            padding: '16px',
            maxWidth: '360px'
          }
        }
      );
    };

    const onRoomDeleted = ({ roomId: deletedRoomId, deletedBy }) => {
      if (deletedRoomId?.toUpperCase() === code) {
        toast.error(`This room was deleted by ${deletedBy || 'the admin'}`);
        navigate('/rooms');
      }
    };

    const onRoomAccessRevoked = ({ roomId: revokedRoomId }) => {
      if (revokedRoomId?.toUpperCase() === code) {
        removeRoomLocally(code);
        toast.error('You were removed from this room');
        navigate('/rooms');
      }
    };

    socket.on('game-invite', onGameInvite);
    socket.on('room-deleted', onRoomDeleted);
    socket.on('room-access-revoked', onRoomAccessRevoked);

    // ── Online status: patch member statuses from the live socket room list ──
    const onRoomUsers = (onlineUserIds) => {
      const room = useRoomStore.getState().currentRoom;
      if (!room?.members) return;

      const onlineSet = new Set(onlineUserIds.map(String));
      const members = room.members.map((member) => {
        const id = String(member.user?._id || member.user);
        const status = onlineSet.has(id) ? 'online' : 'offline';
        return { ...member, user: { ...member.user, status } };
      });

      updateRoomMembers(room.roomId, members);
    };

    socket.on('room-users', onRoomUsers);

    // ── Voice call notifications (WhatsApp-style) ──
    const onVoiceCallStarted = ({ userId, username, participantCount }) => {
      // Don't show card for yourself
      if (String(userId) === String(user?._id)) return;

      setVoiceCallCard({ username, participantCount: participantCount || 1, active: true });

      // Also show a toast notification
      toast(
        (t) => (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '18px' }}>📞</span>
              <span style={{ fontWeight: 600 }}>{username}</span>
              <span style={{ fontSize: '14px' }}>started a voice call</span>
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
              <button
                onClick={() => {
                  setShowVoiceChat(true);
                  toast.dismiss(t.id);
                }}
                style={{
                  padding: '6px 12px',
                  background: '#22c55e',
                  color: '#fff',
                  fontSize: '13px',
                  fontWeight: 500,
                  borderRadius: '8px',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                Join Voice Chat
              </button>
              <button
                onClick={() => toast.dismiss(t.id)}
                style={{
                  padding: '6px 12px',
                  background: '#374151',
                  color: '#fff',
                  fontSize: '13px',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                Dismiss
              </button>
            </div>
          </div>
        ),
        {
          duration: 30000,
          style: {
            background: '#1a1b1e',
            color: '#fff',
            border: '1px solid #22c55e40',
            padding: '16px',
            maxWidth: '360px'
          }
        }
      );
    };

    const onVoiceCallUpdate = ({ participantCount }) => {
      setVoiceCallCard((prev) => prev ? { ...prev, participantCount } : prev);
    };

    const onVoiceCallEnded = () => {
      setVoiceCallCard((prev) => prev ? { ...prev, active: false } : null);
    };

    socket.on('voice-call-started', onVoiceCallStarted);
    socket.on('voice-call-update', onVoiceCallUpdate);
    socket.on('voice-call-ended', onVoiceCallEnded);

    return () => {
      socket.off('connect', join);
      socket.off('profile-updated', onProfileUpdated);
      socket.off('game-invite', onGameInvite);
      socket.off('room-deleted', onRoomDeleted);
      socket.off('room-access-revoked', onRoomAccessRevoked);
      socket.off('room-users', onRoomUsers);
      socket.off('voice-call-started', onVoiceCallStarted);
      socket.off('voice-call-update', onVoiceCallUpdate);
      socket.off('voice-call-ended', onVoiceCallEnded);
      socket.emit('leave-room', code);
      socket.off('new-message');
      socket.off('user-joined');
      socket.off('user-left');
      socket.off('user-typing');
      socket.off('user-stop-typing');
      socket.off('message-deleted');
      socket.off('reaction-added');
    };
  }, [roomId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const setupSocketListeners = (socket) => {
    if (!socket) return;

    // New message received
    socket.on('new-message', (message) => {
      setMessages(prev => {
        if (prev.some(m => String(m._id) === String(message._id))) return prev;

        const senderId = message.sender?._id || message.sender;
        const tempIndex = prev.findIndex((m) => {
          if (!m._optimistic) return false;
          if (String(m.sender?._id || m.sender) !== String(senderId)) return false;
          if (m.type === 'text' || !m.type) return m.content === message.content;
          return m.type === message.type;
        });
        if (tempIndex === -1) return [...prev, message];

        const next = prev.slice();
        next[tempIndex] = message;
        return next;
      });
    });

    const setPresence = (userId, status) => {
      const room = useRoomStore.getState().currentRoom;
      if (!room?.members) return;

      const members = room.members.map((member) => {
        const id = member.user?._id || member.user;
        if (String(id) !== String(userId)) return member;
        return { ...member, user: { ...member.user, status } };
      });

      updateRoomMembers(room.roomId, members);
    };

    socket.on('user-joined', async ({ userId, username }) => {
      toast(`${username} joined the room`, { icon: '👋' });

      const room = useRoomStore.getState().currentRoom;
      const alreadyMember = room?.members?.some(
        (member) => String(member.user?._id || member.user) === String(userId)
      );

      if (!alreadyMember) {
        try {
          const { data } = await api.get(`/rooms/${roomId}`);
          setCurrentRoom(data);
        } catch (error) {
          console.error('Failed to refresh room members', error);
        }
        return;
      }

      setPresence(userId, 'online');
    });

    socket.on('user-left', ({ userId, username }) => {
      toast(`${username} left the room`, { icon: '👋' });
      setPresence(userId, 'offline');
    });

    // Typing indicators
    socket.on('user-typing', ({ userId, username }) => {
      setTypingUsers(prev => {
        const newSet = new Set(prev);
        newSet.add(username);
        return newSet;
      });
    });

    socket.on('user-stop-typing', ({ userId, username }) => {
      setTypingUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(username);
        return newSet;
      });
    });

    // Message deleted - using functional update to avoid stale closure
    socket.on('message-deleted', ({ messageId }) => {
      setMessages(prev => prev.filter(m => String(m._id) !== String(messageId)));
    });

    socket.on('reaction-added', ({ messageId, reactions }) => {
      setMessages(prev => prev.map(msg => (
        String(msg._id) === String(messageId) ? { ...msg, reactions } : msg
      )));
    });
  };

  const handleReaction = (messageId, reactions) => {
    setMessages(prev => prev.map(msg => (
      String(msg._id) === String(messageId) ? { ...msg, reactions } : msg
    )));
  };

  const handleDeleted = (messageId) => {
    setMessages(prev => prev.filter(m => String(m._id) !== String(messageId)));
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    const text = newMessage.trim();
    if (!text) return;

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }

    const replyId = replyTo?._id;
    const replySnapshot = replyTo;
    setReplyTo(null);
    setShowMentions(false);
    setNewMessage('');

    const socket = getSocket();
    if (socket) socket.emit('typing-stop', roomId);

    // ── Optimistic message: show immediately with a temp ID ──────────
    const tempId = `temp-${Date.now()}`;
    const optimistic = {
      _id: tempId,
      content: text,
      sender: user,
      createdAt: new Date().toISOString(),
      type: 'text',
      reactions: [],
      replyTo: replySnapshot
        ? { _id: replyId, content: replySnapshot.content, sender: replySnapshot.sender }
        : null,
      _optimistic: true
    };
    setMessages(prev => [...prev, optimistic]);

    try {
      const { data } = await api.post(`/messages/${roomId}`, {
        content: text,
        ...(replyId ? { replyTo: replyId } : {})
      });

      setMessages(prev => {
        if (prev.some(m => String(m._id) === String(data._id))) {
          return prev.filter(m => m._id !== tempId);
        }
        return prev.map(m => m._id === tempId ? data : m);
      });

    } catch (error) {
      // Remove failed optimistic bubble and restore input
      setMessages(prev => prev.filter(m => m._id !== tempId));
      setNewMessage(text);
      toast.error('Failed to send message');
    }
  };

  const handleTyping = (val) => {
    const socket = getSocket();
    if (socket) {
      if (!typingTimeoutRef.current) socket.emit('typing-start', roomId);
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('typing-stop', roomId);
        typingTimeoutRef.current = null;
      }, 1000);
    }

    // @mention autocomplete detection
    const cursor = textareaRef.current?.selectionStart ?? val.length;
    const textUpToCursor = val.slice(0, cursor);
    const mentionMatch = textUpToCursor.match(/@(\w*)$/);
    if (mentionMatch) {
      setMentionQuery(mentionMatch[1].toLowerCase());
      setShowMentions(true);
    } else {
      setShowMentions(false);
      setMentionQuery('');
    }
  };

  const handleMentionSelect = (username) => {
    const cursor = textareaRef.current?.selectionStart ?? newMessage.length;
    const before = newMessage.slice(0, cursor);
    const after = newMessage.slice(cursor);
    const replaced = before.replace(/@\w*$/, `@${username} `);
    setNewMessage(replaced + after);
    setShowMentions(false);
    setMentionQuery('');
    textareaRef.current?.focus();
  };

  // Members whose username starts with the mention query
  const mentionSuggestions = mentionQuery !== undefined
    ? (currentRoom?.members || [])
        .map(m => m.user?.username)
        .filter(u => u && u.toLowerCase().startsWith(mentionQuery) && u !== user?.username)
        .slice(0, 5)
    : [];

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      return;
    }

    const tempId = `temp-file-${Date.now()}`;
    const previewUrl = file.type.startsWith('image/') ? URL.createObjectURL(file) : '';
    setMessages(prev => [...prev, {
      _id: tempId,
      _optimistic: true,
      content: '',
      sender: user,
      createdAt: new Date().toISOString(),
      type: file.type.startsWith('image/') ? 'image' : 'file',
      reactions: [],
      file: {
        url: previewUrl,
        filename: file.name,
        mimetype: file.type,
        size: file.size
      }
    }]);

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const { data } = await api.post(`/messages/${roomId}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setMessages(prev => {
        if (prev.some(m => String(m._id) === String(data._id))) {
          return prev.filter(m => m._id !== tempId);
        }
        return prev.map(m => (m._id === tempId ? data : m));
      });

      toast.success('File uploaded');
    } catch (error) {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setMessages(prev => prev.filter(m => m._id !== tempId));
      console.error('Upload error:', error);
      toast.error(error.response?.data?.message || 'Failed to upload file. Please check Cloudinary configuration.');
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleLeaveRoom = async () => {
    if (confirm('Are you sure you want to leave this room?')) {
      const result = await leaveRoom(roomId);
      if (result.success) {
        toast.success('Left room');
        navigate('/rooms');
      }
    }
  };

  const handleBackgroundChange = (backgroundId) => {
    setChatBackground(backgroundId);
    // Save to localStorage for persistence
    localStorage.setItem(`room-bg-${roomId}`, backgroundId);
    toast.success('Background updated', { icon: '🎨' });
  };

  const isCreatorOrAdmin =
    Boolean(user?._id) && (
      String(currentRoom?.creator?._id || currentRoom?.creator) === String(user._id) ||
      currentRoom?.members?.some(
        (m) => String(m.user?._id || m.user) === String(user._id) && m.role === 'admin'
      )
    );

  const handleDeleteRoom = async () => {
    if (window.confirm(`Are you sure you want to permanently delete "${currentRoom?.name}"? All messages and games will be deleted.`)) {
      const result = await useRoomStore.getState().deleteRoom(roomId);
      if (result.success) {
        toast.success('Room deleted successfully');
        navigate('/rooms');
      } else {
        toast.error(result.message || 'Failed to delete room');
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-background text-primary flex flex-col">

      {/* ── Header ─────────────────────────────────────────────────── */}
      <header
        className="shrink-0 relative z-10"
        style={{
          background: 'rgba(17,14,18,0.88)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderBottom: '1px solid rgba(255,255,255,0.055)',
          boxShadow: '0 1px 0 rgba(255,255,255,0.03), 0 4px 24px rgba(0,0,0,0.3)',
        }}
      >
        {/* Animated accent glow strip at very top */}
        <div
          className="absolute inset-x-0 top-0 h-px"
          style={{
            background: 'linear-gradient(90deg, transparent 0%, rgba(196,107,74,0.5) 40%, rgba(196,107,74,0.7) 50%, rgba(196,107,74,0.5) 60%, transparent 100%)',
          }}
        />

        <div className="flex items-center gap-2.5 px-4 h-[58px]">

          {/* Back */}
          <button
            onClick={() => navigate('/rooms')}
            className="shrink-0 flex items-center justify-center w-8 h-8 rounded-xl transition-all"
            style={{ color: 'rgba(255,255,255,0.4)' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.color = 'rgba(255,255,255,0.9)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; }}
            title="Back to rooms"
          >
            <ArrowLeft className="w-[15px] h-[15px]" />
          </button>

          {/* Room identity */}
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            {/* Room avatar with glow */}
            <div className="relative shrink-0">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-[15px] select-none"
                style={{
                  background: 'linear-gradient(135deg, rgba(196,107,74,0.35) 0%, rgba(196,107,74,0.15) 100%)',
                  border: '1px solid rgba(196,107,74,0.3)',
                  color: '#c46b4a',
                  boxShadow: '0 0 14px rgba(196,107,74,0.2)',
                  letterSpacing: '-0.02em',
                }}
              >
                {currentRoom?.name?.[0]?.toUpperCase()}
              </div>
              {/* Online indicator */}
              <div
                className="absolute -bottom-0.5 -right-0.5 w-[9px] h-[9px] rounded-full"
                style={{
                  background: '#4ade80',
                  border: '2px solid rgba(17,14,18,1)',
                  boxShadow: '0 0 6px rgba(74,222,128,0.6)',
                }}
              />
            </div>

            <div className="min-w-0">
              <h1
                className="truncate leading-tight"
                style={{ fontSize: '14px', fontWeight: 600, color: 'rgba(247,241,234,0.92)', letterSpacing: '-0.015em' }}
              >
                {currentRoom?.name}
              </h1>
              <p style={{ fontSize: '10.5px', color: 'rgba(255,255,255,0.3)', lineHeight: 1, marginTop: '2px' }}>
                {currentRoom?.members?.length || 0} members
              </p>
            </div>
          </div>

          {/* Icon buttons */}
          <div className="flex items-center gap-0.5 shrink-0">
            {/* Profile avatar */}
            <button
              onClick={() => navigate('/profile')}
              className="flex items-center justify-center w-8 h-8 rounded-xl transition-all"
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
              title="Profile"
            >
              <Avatar user={user} size="xs" />
            </button>

            {/* Theme */}
            <HeaderIconBtn
              onClick={() => setShowBackgroundSelector(true)}
              title="Chat theme"
              active={false}
            >
              <Palette className="w-[15px] h-[15px]" />
            </HeaderIconBtn>

            {/* Games */}
            <HeaderIconBtn
              onClick={() => setShowGames(!showGames)}
              active={showGames}
              title="Games"
            >
              <Gamepad2 className="w-[15px] h-[15px]" />
            </HeaderIconBtn>

            {/* Voice */}
            <HeaderIconBtn
              onClick={() => setShowVoiceChat(true)}
              active={showVoiceChat}
              activeColor="#4ade80"
              activeBg="rgba(74,222,128,0.12)"
              title="Voice chat"
            >
              <Mic className="w-[15px] h-[15px]" />
            </HeaderIconBtn>

            {/* Members */}
            <HeaderIconBtn
              onClick={() => setShowMembers(!showMembers)}
              active={showMembers}
              title="Members"
            >
              <Users className="w-[15px] h-[15px]" />
            </HeaderIconBtn>

            {/* Divider */}
            <div className="w-px h-[18px] mx-1" style={{ background: 'rgba(255,255,255,0.08)' }} />

            {/* Leave */}
            <button
              onClick={handleLeaveRoom}
              className="flex items-center justify-center w-8 h-8 rounded-xl transition-all"
              style={{ color: 'rgba(255,255,255,0.35)' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; e.currentTarget.style.color = 'rgba(239,68,68,0.9)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.35)'; }}
              title="Leave room"
            >
              <LogOut className="w-[15px] h-[15px]" />
            </button>

            {isCreatorOrAdmin && (
              <button
                onClick={handleDeleteRoom}
                className="flex items-center justify-center w-8 h-8 rounded-xl transition-all"
                style={{ color: 'rgba(255,255,255,0.35)' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; e.currentTarget.style.color = 'rgba(239,68,68,0.9)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.35)'; }}
                title="Delete room"
              >
                <Trash2 className="w-[15px] h-[15px]" />
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 overflow-y-auto">
            <div className="px-3 sm:px-5 py-4 space-y-2 min-h-full" style={getBgStyle(chatBackground)}>
            {messages.map((message) => (
              <Message
                key={message._id}
                message={message}
                currentUser={user}
                onReaction={handleReaction}
                onDeleted={handleDeleted}
                onReply={(msg) => {
                  setReplyTo(msg);
                  textareaRef.current?.focus();
                }}
              />
            ))}

            {voiceCallCard && (
              <div className="flex justify-center my-3">
                <div
                  className={`w-full max-w-sm rounded-3xl p-4 flex flex-col gap-3 border ${
                    voiceCallCard.active
                      ? 'bg-emerald-950/80 border-emerald-400/30'
                      : 'bg-surface border-border'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${voiceCallCard.active ? 'bg-emerald-400/15' : 'bg-background'}`}>
                      <Phone className={`w-4 h-4 ${voiceCallCard.active ? 'text-emerald-300' : 'text-secondary'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">
                        {voiceCallCard.active
                          ? `${voiceCallCard.username} started a voice call`
                          : 'Voice call ended'}
                      </p>
                      <p className="text-xs text-secondary mt-0.5">
                        {voiceCallCard.active
                          ? `${voiceCallCard.participantCount} participant${voiceCallCard.participantCount > 1 ? 's' : ''} · Tap to join`
                          : 'The call has ended'}
                      </p>
                    </div>
                  </div>
                  {voiceCallCard.active && (
                    <button
                      onClick={() => setShowVoiceChat(true)}
                      className="w-full py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-medium flex items-center justify-center gap-2"
                    >
                      <Phone className="w-4 h-4" />
                      Join Voice Chat
                    </button>
                  )}
                </div>
              </div>
            )}
            
            {typingUsers.size > 0 && (
              <div className="flex items-center gap-2 text-sm text-secondary px-2">
                <span className="flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent" style={{ animation: 'typingBounce 1s infinite' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-accent" style={{ animation: 'typingBounce 1s infinite 0.15s' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-accent" style={{ animation: 'typingBounce 1s infinite 0.3s' }} />
                </span>
                {Array.from(typingUsers).join(', ')} {typingUsers.size === 1 ? 'is' : 'are'} typing
              </div>
            )}
            
            <div ref={messagesEndRef} />
            </div>
          </div>

          {showVoiceChat && (
            <VoiceChat
              roomId={roomId}
              onClose={() => setShowVoiceChat(false)}
            />
          )}

          <div className="px-4 pb-4 pt-2 border-t border-white/[0.05] bg-surface/30 backdrop-blur-sm">

            {/* Reply preview bar */}
            <AnimatePresence>
              {replyTo && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  className="flex items-center gap-2 mb-2 px-3 py-2 rounded-xl bg-accent/10 border border-accent/20"
                >
                  <Reply className="w-3.5 h-3.5 text-accent shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-[11px] text-accent font-semibold">{replyTo.sender?.username}</span>
                    <span className="text-[11px] text-secondary ml-1.5">{replyTo.content?.slice(0, 70)}</span>
                  </div>
                  <button onClick={() => setReplyTo(null)} className="text-secondary hover:text-primary transition-colors shrink-0">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* @mention autocomplete dropdown */}
            <AnimatePresence>
              {showMentions && mentionSuggestions.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                  className="mb-2 rounded-xl bg-surface border border-white/10 shadow-xl overflow-hidden"
                >
                  {mentionSuggestions.map(username => (
                    <button
                      key={username}
                      onMouseDown={(e) => { e.preventDefault(); handleMentionSelect(username); }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-white/6 transition-colors text-left"
                    >
                      <div className="w-6 h-6 rounded-full bg-accent/20 text-accent text-[11px] font-bold flex items-center justify-center shrink-0">
                        {username[0].toUpperCase()}
                      </div>
                      <span className="text-[13px] font-medium">@{username}</span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleSendMessage} className="flex items-end gap-2 rounded-2xl border border-white/8 bg-surface/80 backdrop-blur-xl p-2 shadow-lg">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="p-2 rounded-xl text-secondary hover:text-primary hover:bg-white/6 disabled:opacity-50 transition-colors shrink-0"
                title="Upload file"
              >
                <Paperclip className="w-4.5 h-4.5" />
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                className="hidden"
                accept="image/*,video/*,.pdf,.doc,.docx,.txt"
              />

              <div className="flex-1 relative">
                <textarea
                  ref={textareaRef}
                  value={newMessage}
                  onChange={(e) => {
                    setNewMessage(e.target.value);
                    handleTyping(e.target.value);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') { setReplyTo(null); setShowMentions(false); }
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage(e);
                    }
                  }}
                  placeholder={replyTo ? `Reply to ${replyTo.sender?.username}…` : 'Message… (``` for code, @ to mention)'}
                  rows={1}
                  className="w-full px-3 py-2 bg-transparent resize-none focus:outline-none text-primary placeholder:text-secondary/60 text-[14px] leading-relaxed"
                />
                {showEmojiPicker && (
                  <EmojiPicker
                    onSelect={(emoji) => setNewMessage(prev => prev + emoji)}
                    onClose={() => setShowEmojiPicker(false)}
                  />
                )}
              </div>

              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className={`p-2 rounded-xl transition-colors shrink-0 ${showEmojiPicker ? 'bg-accent/20 text-accent' : 'text-secondary hover:text-primary hover:bg-white/6'}`}
              >
                <Smile className="w-4.5 h-4.5" />
              </button>

              <button
                type="submit"
                disabled={!newMessage.trim() || uploading}
                className="p-2 bg-accent hover:bg-accent-hover text-white rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
              >
                <Send className="w-4.5 h-4.5" />
              </button>
            </form>

            {uploading && (
              <div className="mt-2 text-[12px] text-secondary flex items-center gap-2 px-1">
                <div className="w-3 h-3 border-2 border-accent/30 border-t-accent rounded-full animate-spin"></div>
                Uploading...
              </div>
            )}
          </div>
        </div>

        {showMembers && (
          <MembersSidebar 
            room={currentRoom} 
            onClose={() => setShowMembers(false)} 
          />
        )}
        {showGames && (
          <GamesPanel 
            roomId={roomId} 
            onClose={() => setShowGames(false)} 
          />
        )}
      </div>

      {/* Background Selector Modal */}
      <AnimatePresence>
        {showBackgroundSelector && (
          <BackgroundSelector
            currentBackground={chatBackground}
            onChange={handleBackgroundChange}
            onClose={() => setShowBackgroundSelector(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default Room;
