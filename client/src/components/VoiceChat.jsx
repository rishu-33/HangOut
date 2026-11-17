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
    { urls: 'stun:stun2.l.google.com:19302' }
  ]
};

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
  const inCallRef = useRef(false);

  const code = roomId?.toUpperCase();

  // Cleanup all peer connections
  const cleanupConnections = useCallback(() => {
    peerConnectionsRef.current.forEach((pc) => {
      pc.close();
    });
    peerConnectionsRef.current.clear();

    remoteAudioRefs.current.forEach((audio) => {
      audio.pause();
      audio.srcObject = null;
    });
    remoteAudioRefs.current.clear();

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
            roomId: code,
            targetUserId: peerId,
            candidate: event.candidate
          });
        }
      }
    };

    // Handle remote audio stream
    pc.ontrack = (event) => {
      const [remoteStream] = event.streams;
      let audio = remoteAudioRefs.current.get(peerId);
      if (!audio) {
        audio = new Audio();
        audio.autoplay = true;
        remoteAudioRefs.current.set(peerId, audio);
      }
      audio.srcObject = remoteStream;
      audio.muted = isDeafened;
    };

    // Handle connection state
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        console.warn(`Peer connection with ${peerUsername} ${pc.connectionState}`);
      }
    };

    return pc;
  }, [code, isDeafened]);

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

      const socket = getSocket();
      if (!socket) {
        toast.error('Not connected to server');
        stream.getTracks().forEach((t) => t.stop());
        setConnecting(false);
        return;
      }

      // Join the voice channel
      socket.emit('voice-join', { roomId: code });
      inCallRef.current = true;
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

  // Setup socket listeners for voice signaling
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    // When another user joins voice
    const onVoiceUserJoined = async ({ userId, username, avatar }) => {
      if (userId === user._id) return;

      setParticipants((prev) => {
        if (prev.some((p) => p.userId === userId)) return prev;
        return [...prev, { userId, username, avatar, isMuted: false }];
      });

      // If we're in the call, create offer for the new user
      if (inCall && localStreamRef.current) {
        const pc = createPeerConnection(userId, username);

        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);

          socket.emit('voice-offer', {
            roomId: code,
            targetUserId: userId,
            offer: pc.localDescription
          });
        } catch (err) {
          console.error('Failed to create offer:', err);
        }
      }
    };

    // When we receive an offer from another user
    const onVoiceOffer = async ({ fromUserId, fromUsername, offer }) => {
      if (!inCall || !localStreamRef.current) return;

      const pc = createPeerConnection(fromUserId, fromUsername);

      try {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socket.emit('voice-answer', {
          roomId: code,
          targetUserId: fromUserId,
          answer: pc.localDescription
        });
      } catch (err) {
        console.error('Failed to handle offer:', err);
      }
    };

    // When we receive an answer
    const onVoiceAnswer = async ({ fromUserId, answer }) => {
      const pc = peerConnectionsRef.current.get(fromUserId);
      if (!pc) return;

      try {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
      } catch (err) {
        console.error('Failed to set remote description:', err);
      }
    };

    // When we receive an ICE candidate
    const onVoiceIceCandidate = async ({ fromUserId, candidate }) => {
      const pc = peerConnectionsRef.current.get(fromUserId);
      if (!pc) return;

      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.error('Failed to add ICE candidate:', err);
      }
    };

    // When a user leaves voice
    const onVoiceUserLeft = ({ userId, username }) => {
      setParticipants((prev) => prev.filter((p) => p.userId !== userId));

      // Clean up their peer connection
      const pc = peerConnectionsRef.current.get(userId);
      if (pc) {
        pc.close();
        peerConnectionsRef.current.delete(userId);
      }

      const audio = remoteAudioRefs.current.get(userId);
      if (audio) {
        audio.pause();
        audio.srcObject = null;
        remoteAudioRefs.current.delete(userId);
      }
    };

    // When a user toggles mute
    const onVoiceMuteToggle = ({ userId, isMuted: muted }) => {
      setParticipants((prev) =>
        prev.map((p) => (p.userId === userId ? { ...p, isMuted: muted } : p))
      );
    };

    // Current voice participants (received when joining)
    const onVoiceParticipants = (list) => {
      setParticipants(
        list
          .filter((p) => p.userId !== user._id)
          .map((p) => ({ ...p, isMuted: p.isMuted || false }))
      );
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
  }, [inCall, code, user._id, createPeerConnection]);

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

