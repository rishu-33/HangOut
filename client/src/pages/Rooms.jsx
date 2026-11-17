import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Plus, LogOut, DoorOpen, Lock, Users as UsersIcon, Trash2 } from 'lucide-react';
import useAuthStore from '../store/authStore';
import useRoomStore from '../store/roomStore';
import toast from 'react-hot-toast';
import CreateRoomModal from '../components/CreateRoomModal';
import JoinRoomModal from '../components/JoinRoomModal';
import Avatar from '../components/Avatar';

const Rooms = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { rooms, fetchRooms, setCurrentRoom, deleteRoom } = useRoomStore();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    navigate('/');
  };

  const handleDeleteRoom = async (e, room) => {
    e.stopPropagation();
    if (window.confirm(`Are you sure you want to permanently delete "${room.name}"? All messages and games will be lost.`)) {
      const result = await deleteRoom(room.roomId);
      if (result.success) {
        toast.success('Room deleted');
      } else {
        toast.error(result.message || 'Failed to delete room');
      }
    }
  };

  const handleRoomClick = (room) => {
    setCurrentRoom(room);
    navigate(`/room/${room.roomId}`);
  };

  return (
    <div className="min-h-screen text-primary">
      <header className="max-w-6xl mx-auto px-6 pt-6">
        <div className="flex items-center justify-between rounded-3xl border border-white/10 bg-surface/70 backdrop-blur-xl px-5 py-3">
          <h1 className="font-display text-3xl">Hangout</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/profile')}
              className="flex items-center gap-3 rounded-full pl-4 pr-1.5 py-1.5 hover:bg-background"
              title="Edit profile"
            >
              <div className="text-right">
                <p className="text-sm font-medium">{user?.username}</p>
                <p className="text-[11px] text-accent">View profile</p>
              </div>
              <Avatar user={user} />
            </button>
            <button
              onClick={handleLogout}
              className="p-2.5 rounded-2xl text-secondary hover:bg-background hover:text-primary"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 mb-10"
        >
          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] text-secondary">Private rooms</p>
            <h2 className="font-display text-4xl mt-2">Where your people are</h2>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-5 py-3 bg-accent hover:bg-accent-hover text-white font-medium rounded-2xl flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Create Room
            </button>
            <button
              onClick={() => setShowJoinModal(true)}
              className="px-5 py-3 bg-surface/80 hover:bg-surface-light border border-border font-medium rounded-2xl flex items-center gap-2"
            >
              <DoorOpen className="w-5 h-5" />
              Join Room
            </button>
          </div>
        </motion.div>

        <div>
          {rooms.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-20 rounded-3xl border border-dashed border-border"
            >
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-surface flex items-center justify-center">
                <UsersIcon className="w-8 h-8 text-secondary" />
              </div>
              <p className="text-secondary mb-6">You haven't joined any rooms yet</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="text-accent hover:text-accent-hover font-medium"
              >
                Create your first room
              </button>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {rooms.map((room, index) => (
                <motion.div
                  key={room._id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => handleRoomClick(room)}
                  className="p-5 bg-surface/80 border border-white/10 rounded-3xl hover:border-accent/50 cursor-pointer group shadow-[0_16px_40px_rgba(0,0,0,0.18)]"
                >
                  <div className="flex items-start justify-between mb-6">
                    <div className="w-12 h-12 rounded-2xl bg-accent/15 text-accent flex items-center justify-center font-display text-2xl">
                      {room.name?.[0]?.toUpperCase()}
                    </div>
                    <div className="flex items-center gap-1">
                      {(String(room.creator?._id || room.creator) === String(user?._id) ||
                        room.members?.some(m => String(m.user?._id || m.user) === String(user?._id) && m.role === 'admin')) && (
                        <button
                          onClick={(e) => handleDeleteRoom(e, room)}
                          className="p-2 hover:bg-red-500/20 text-secondary hover:text-red-400 rounded-xl"
                          title="Delete room"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                      <div className="p-2 bg-background rounded-xl">
                        <Lock className="w-4 h-4 text-secondary" />
                      </div>
                    </div>
                  </div>
                  <h3 className="font-display text-2xl group-hover:text-accent">
                    {room.name}
                  </h3>
                  <p className="text-xs tracking-[0.16em] text-secondary mt-1 font-mono">{room.roomId}</p>
                  <div className="mt-5 flex items-center justify-between">
                    <div className="flex -space-x-2">
                      {room.members?.slice(0, 4).map((member) => (
                        <Avatar
                          key={member.user?._id || member.user}
                          user={member.user}
                          size="sm"
                          className="ring-2 ring-surface"
                        />
                      ))}
                    </div>
                    <span className="text-sm text-secondary flex items-center gap-1.5">
                      <UsersIcon className="w-4 h-4" />
                      {room.members?.length || 0}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showCreateModal && (
        <CreateRoomModal onClose={() => setShowCreateModal(false)} />
      )}
      {showJoinModal && (
        <JoinRoomModal onClose={() => setShowJoinModal(false)} />
      )}
    </div>
  );
};

export default Rooms;
