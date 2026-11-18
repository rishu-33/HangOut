import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, PhoneOff, Phone, Volume2, VolumeX, X, ChevronDown, ChevronUp } from 'lucide-react';
import { getSocket } from '../utils/socket';
import useAuthStore from '../store/authStore';
import Avatar from './Avatar';
import toast from 'react-hot-toast';

// Free STUN servers for NAT traversal
const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun.cloudflare.com:3478' }
  ]
};

const sameId = (a, b) => String(a) === String(b);

const VoiceChat = ({ roomId, onClose }) => {
  const { user } = useAuthStore();
  const [inCall, setInCall] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [participants, setParticipants] = useState([]); // [{ userId, username, avatar, isMuted }]
  const [collapsed, setCollapsed] = useState(false);
  const [connecting, setConnecting] = useState(false);

  // Refs for WebRTC
  const localStreamRef = useRef(null);
  const peerConnectionsRef = useRef(new Map()); // peerId -> RTCPeerConnection
  const remoteAudioRefs = useRef(new Map()); // peerId -> HTMLAudioElement
  const pendingIceRef = useRef(new Map()); // peerId -> ICE candidates waiting for a remote description
  const inCallRef = useRef(false);
  const deafenedRef = useRef(false);

  const code = roomId?.toUpperCase();
  const codeRef = useRef(code);
  codeRef.current = code;
  const myId = user?._id ? String(user._id) : '';

  // Cleanup all peer connections
  const cleanupConnections = useCallback(() => {
    peerConnectionsRef.current.forEach((pc) => {
      pc.close();
    });
    peerConnectionsRef.current.clear();

    remoteAudioRefs.current.forEach((audio) => {
      audio.pause();
      audio.srcObject = null;
      audio.remove();
    });
    remoteAudioRefs.current.clear();
    pendingIceRef.current.clear();

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
  }, []);

  // Create a peer connection for a specific remote user
  const createPeerConnection = useCallback((peerId, peerUsername) => {
    if (peerConnectionsRef.current.has(peerId)) {
      return peerConnectionsRef.current.get(peerId);
    }

    const pc = new RTCPeerConnection(ICE_SERVERS);
    peerConnectionsRef.current.set(peerId, pc);

    // Add local tracks to the connection
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current);
      });
    }

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        const socket = getSocket();
        if (socket) {
          socket.emit('voice-ice-candidate', {
            roomId: codeRef.current,
            targetUserId: peerId,
            candidate: event.candidate
          });
        }
      }
    };

    // Handle remote audio stream
    pc.ontrack = (event) => {
      const remoteStream = event.streams[0] || new MediaStream([event.track]);

      let audio = remoteAudioRefs.current.get(peerId);
      if (!audio) {
        audio = new Audio();
        audio.autoplay = true;
        audio.setAttribute('playsinline', 'true');
        audio.style.display = 'none';
        document.body.appendChild(audio);
        remoteAudioRefs.current.set(peerId, audio);
      }
      audio.srcObject = remoteStream;
      audio.muted = deafenedRef.current;
      audio.play().catch(() => {});
    };

    // Handle connection state
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        console.warn(`Peer connection with ${peerUsername} ${pc.connectionState}`);
      }
    };

    return pc;
  }, []);

  // Join voice channel
  const joinVoice = async () => {
    try {
      setConnecting(true);

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: false
      });

      localStreamRef.current = stream;
      inCallRef.current = true;

      const socket = getSocket();
      if (!socket || !socket.connected) {
        toast.error('Not connected to server');
        stream.getTracks().forEach((t) => t.stop());
        localStreamRef.current = null;
        inCallRef.current = false;
        setConnecting(false);
        return;
      }

      // Mark ourselves in-call before the server tells anyone else,
      // so the incoming offer is not dropped by a stale render.
      socket.emit('voice-join', { roomId: code });
      setInCall(true);
      setConnecting(false);

      toast.success('Joined voice chat');
    } catch (error) {
      console.error('Failed to access microphone:', error);
      setConnecting(false);

      if (error.name === 'NotAllowedError') {
        toast.error('Microphone access denied. Please allow microphone permissions.');
      } else if (error.name === 'NotFoundError') {
        toast.error('No microphone found on this device.');
      } else {
        toast.error('Failed to join voice chat');
      }
    }
  };

  // Leave voice channel
  const leaveVoice = useCallback(() => {
    const socket = getSocket();
    if (socket) {
      socket.emit('voice-leave', { roomId: code });
    }

    inCallRef.current = false;
    cleanupConnections();
    setInCall(false);
    setIsMuted(false);
    setIsDeafened(false);
    setParticipants([]);

    toast('Left voice chat', { icon: '🔇' });
  }, [code, cleanupConnections]);

  // Toggle mute
  const toggleMute = () => {
    if (!localStreamRef.current) return;

    const audioTrack = localStreamRef.current.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = isMuted; // toggle
      setIsMuted(!isMuted);

      const socket = getSocket();
      if (socket) {
        socket.emit('voice-mute-toggle', {
          roomId: code,
          isMuted: !isMuted
        });
      }
    }
  };

  // Toggle deafen
  const toggleDeafen = () => {
    const newDeafened = !isDeafened;
    deafenedRef.current = newDeafened;
    setIsDeafened(newDeafened);

    // Mute/unmute all remote audio elements
    remoteAudioRefs.current.forEach((audio) => {
      audio.muted = newDeafened;
    });

    // Also mute mic when deafened
    if (newDeafened && !isMuted) {
      toggleMute();
    }
  };

  // Setup socket listeners for voice signaling.
  // These stay attached for the life of the panel and read the live call
  // state from refs, so an offer that arrives immediately after Join is kept.
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !myId) return;

    const shouldOffer = (otherId) => myId > String(otherId);

    const flushIce = async (peerId) => {
      const pc = peerConnectionsRef.current.get(String(peerId));
      const queued = pendingIceRef.current.get(String(peerId)) || [];
      if (!pc?.remoteDescription || queued.length === 0) return;
      pendingIceRef.current.delete(String(peerId));
      for (const candidate of queued) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.error('Failed to add queued ICE candidate:', err);
        }
      }
    };

    const offerToPeer = async (peerId, username) => {
      if (!inCallRef.current || !localStreamRef.current) return;
      if (!shouldOffer(peerId)) return;

      const pc = createPeerConnection(String(peerId), username);
      if (pc.signalingState !== 'stable' || pc.currentLocalDescription || pc.currentRemoteDescription) {
        return;
      }

      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('voice-offer', {
          roomId: codeRef.current,
          targetUserId: String(peerId),
          offer: pc.localDescription
        });
      } catch (err) {
        console.error('Failed to create offer:', err);
      }
    };

    const rememberParticipant = (person) => {
      setParticipants((prev) => {
        if (prev.some((p) => sameId(p.userId, person.userId))) return prev;
        return [...prev, { ...person, isMuted: person.isMuted || false }];
      });
    };

    const onVoiceUserJoined = ({ userId, username, avatar }) => {
      if (sameId(userId, myId)) return;
      rememberParticipant({ userId: String(userId), username, avatar, isMuted: false });
      offerToPeer(userId, username);
    };

    const onVoiceOffer = async ({ fromUserId, fromUsername, offer }) => {
      if (!inCallRef.current || !localStreamRef.current) return;

      const peerId = String(fromUserId);
      const pc = createPeerConnection(peerId, fromUsername);

      try {
        if (pc.signalingState === 'have-local-offer') {
          if (shouldOffer(peerId)) return;
          await pc.setLocalDescription({ type: 'rollback' });
        }
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        await flushIce(peerId);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socket.emit('voice-answer', {
          roomId: codeRef.current,
          targetUserId: peerId,
          answer: pc.localDescription
        });
      } catch (err) {
        console.error('Failed to handle offer:', err);
      }
    };

    const onVoiceAnswer = async ({ fromUserId, answer }) => {
      const pc = peerConnectionsRef.current.get(String(fromUserId));
      if (!pc || pc.signalingState !== 'have-local-offer') return;

      try {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
        await flushIce(fromUserId);
      } catch (err) {
        console.error('Failed to set remote description:', err);
      }
    };

    const onVoiceIceCandidate = async ({ fromUserId, candidate }) => {
      const peerId = String(fromUserId);
      const pc = peerConnectionsRef.current.get(peerId);
      if (!pc || !pc.remoteDescription) {
        const queued = pendingIceRef.current.get(peerId) || [];
        queued.push(candidate);
        pendingIceRef.current.set(peerId, queued);
        return;
      }

      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.error('Failed to add ICE candidate:', err);
      }
    };

    const onVoiceUserLeft = ({ userId }) => {
      const peerId = String(userId);
      setParticipants((prev) => prev.filter((p) => !sameId(p.userId, peerId)));

      const pc = peerConnectionsRef.current.get(peerId);
      if (pc) {
        pc.close();
        peerConnectionsRef.current.delete(peerId);
      }
      pendingIceRef.current.delete(peerId);

      const audio = remoteAudioRefs.current.get(peerId);
      if (audio) {
        audio.pause();
        audio.srcObject = null;
        audio.remove();
        remoteAudioRefs.current.delete(peerId);
      }
    };

    const onVoiceMuteToggle = ({ userId, isMuted: muted }) => {
      setParticipants((prev) =>
        prev.map((p) => (sameId(p.userId, userId) ? { ...p, isMuted: muted } : p))
      );
    };

    const onVoiceParticipants = (list) => {
      const others = (list || [])
        .filter((p) => !sameId(p.userId, myId))
        .map((p) => ({ ...p, userId: String(p.userId), isMuted: p.isMuted || false }));

      setParticipants(others);
      others.forEach((person) => offerToPeer(person.userId, person.username));
    };

    socket.on('voice-user-joined', onVoiceUserJoined);
    socket.on('voice-offer', onVoiceOffer);
    socket.on('voice-answer', onVoiceAnswer);
    socket.on('voice-ice-candidate', onVoiceIceCandidate);
    socket.on('voice-user-left', onVoiceUserLeft);
    socket.on('voice-mute-toggle', onVoiceMuteToggle);
    socket.on('voice-participants', onVoiceParticipants);

    return () => {
      socket.off('voice-user-joined', onVoiceUserJoined);
      socket.off('voice-offer', onVoiceOffer);
      socket.off('voice-answer', onVoiceAnswer);
      socket.off('voice-ice-candidate', onVoiceIceCandidate);
      socket.off('voice-user-left', onVoiceUserLeft);
      socket.off('voice-mute-toggle', onVoiceMuteToggle);
      socket.off('voice-participants', onVoiceParticipants);
    };
  }, [myId, createPeerConnection]);

  // Cleanup on unmount / room change
  useEffect(() => {
    return () => {
      if (!inCallRef.current) return;

      const socket = getSocket();
      if (socket) socket.emit('voice-leave', { roomId: code });
      inCallRef.current = false;
      cleanupConnections();
    };
  }, [code, cleanupConnections]);

  // Render the not-in-call state
  if (!inCall) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="border-t border-border bg-surface/80 backdrop-blur-sm"
      >
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
              <Phone className="w-4 h-4 text-green-400" />
            </div>
            <div>
              <p className="text-sm font-medium">Voice Chat</p>
              <p className="text-xs text-secondary">
                {participants.length > 0
                  ? `${participants.length} user${participants.length > 1 ? 's' : ''} in call`
                  : 'Click to join'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={joinVoice}
              disabled={connecting}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {connecting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Phone className="w-4 h-4" />
                  Join
                </>
              )}
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-background rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Show who's already in the call */}
        {participants.length > 0 && (
          <div className="px-4 pb-3 flex flex-wrap gap-2">
            {participants.map((p) => (
              <div
                key={p.userId}
                className="flex items-center gap-1.5 px-2 py-1 bg-background rounded-full text-xs"
              >
                <div className="w-4 h-4 rounded-full bg-green-500/30 flex items-center justify-center">
                  {p.isMuted ? (
                    <MicOff className="w-2.5 h-2.5 text-red-400" />
                  ) : (
                    <Mic className="w-2.5 h-2.5 text-green-400" />
                  )}
                </div>
                <span>{p.username}</span>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    );
  }

  // Render the in-call state
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="border-t border-border bg-surface/80 backdrop-blur-sm"
    >
      {/* Header with collapse toggle */}
      <div className="px-4 py-2 flex items-center justify-between">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center gap-2 text-sm font-medium text-green-400 hover:text-green-300 transition-colors"
        >
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          Voice Connected
          {collapsed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
        <span className="text-xs text-secondary">
          {participants.length + 1} in call
        </span>
      </div>

      {/* Participants list */}
      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-2 space-y-1 max-h-32 overflow-y-auto">
              {/* Self */}
              <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-background/50">
                <div className="relative">
                  <Avatar user={user} size="xs" />
                  <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-500 border border-surface" />
                </div>
                <span className="text-sm flex-1 truncate">{user.username}</span>
                <span className="text-xs text-secondary">(You)</span>
                {isMuted ? (
                  <MicOff className="w-3.5 h-3.5 text-red-400" />
                ) : (
                  <Mic className="w-3.5 h-3.5 text-green-400" />
                )}
              </div>

              {/* Others */}
              {participants.map((p) => (
                <div
                  key={p.userId}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-background/50"
                >
                  <div className="relative">
                    <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center text-xs font-medium">
                      {p.username?.[0]?.toUpperCase()}
                    </div>
                    <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-500 border border-surface" />
                  </div>
                  <span className="text-sm flex-1 truncate">{p.username}</span>
                  {p.isMuted ? (
                    <MicOff className="w-3.5 h-3.5 text-red-400" />
                  ) : (
                    <Mic className="w-3.5 h-3.5 text-green-400" />
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Controls */}
      <div className="px-4 py-2.5 flex items-center justify-center gap-3 border-t border-border/50">
        <button
          onClick={toggleMute}
          className={`p-2.5 rounded-full transition-all ${
            isMuted
              ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
              : 'bg-background hover:bg-surface-light text-primary'
          }`}
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </button>

        <button
          onClick={toggleDeafen}
          className={`p-2.5 rounded-full transition-all ${
            isDeafened
              ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
              : 'bg-background hover:bg-surface-light text-primary'
          }`}
          title={isDeafened ? 'Undeafen' : 'Deafen'}
        >
          {isDeafened ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
        </button>

        <button
          onClick={leaveVoice}
          className="p-2.5 rounded-full bg-red-600 hover:bg-red-700 text-white transition-all"
          title="Leave voice chat"
        >
          <PhoneOff className="w-5 h-5" />
        </button>
      </div>
    </motion.div>
  );
};

export default VoiceChat;

