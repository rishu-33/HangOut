import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Plus, LogOut, DoorOpen, Lock, Users as UsersIcon, Trash2 } from 'lucide-react';
import useAuthStore from '../store/authStore';
import useRoomStore from '../store/roomStore';
import toast from 'react-hot-toast';
import CreateRoomModal from '../components/CreateRoomModal';
import JoinRoomModal from '../components/JoinRoomModal';
import Avatar from '../components/Avatar';
import ConfirmModal from '../components/ConfirmModal';

const Rooms = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { rooms, fetchRooms, setCurrentRoom, deleteRoom } = useRoomStore();
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => { fetchRooms(); }, [fetchRooms]);

  const handleLogout = () => { logout(); toast.success('Logged out'); navigate('/'); };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const r = await deleteRoom(deleteTarget.roomId);
    if (r.success) toast.success('Room deleted');
    else toast.error(r.message || 'Failed to delete');
    setDeleteTarget(null);
  };

  const handleRoomClick = (room) => { setCurrentRoom(room); navigate('/room/' + room.roomId); };

  const isAdmin = (room) =>
    String(room.creator?._id || room.creator) === String(user?._id) ||
    room.members?.some(m => String(m.user?._id || m.user) === String(user?._id) && m.role === 'admin');

  return (
    <div className="min-h-screen text-primary">

      {/* HEADER */}
      <header className="sticky top-0 z-30 max-w-6xl mx-auto px-4 pt-4 pb-2">
        <div className="flex items-center justify-between rounded-3xl px-4 py-2.5"
          style={{ background:'rgba(16,24,38,0.90)', border:'1px solid rgba(255,255,255,0.08)', backdropFilter:'blur(20px)' }}>
          <span className="font-display text-2xl text-white/90">Hangout</span>
          <div className="flex items-center gap-2">
            <button onClick={() => navigate('/profile')}
              className="flex items-center gap-2.5 pl-3 pr-2 py-1.5 rounded-full hover:bg-white/8 transition-colors">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-white/80">{user?.username}</p>
                <p className="text-[11px] text-accent">View profile</p>
              </div>
              <Avatar user={user} size="sm" />
            </button>
            <button onClick={handleLogout} title="Logout" aria-label="Logout"
              className="p-2.5 rounded-2xl text-white/35 hover:text-red-400 hover:bg-red-500/10 transition-colors">
              <LogOut className="w-4.5 h-4.5" />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-10">

        {/* HERO ROW */}
        <motion.div initial={{opacity:0,y:16}} animate={{opacity:1,y:0}}
          className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 mb-10">
          <div>
            <p className="text-[10px] uppercase tracking-[0.26em] text-white/30 mb-2">Private rooms</p>
            <h2 className="font-display text-4xl sm:text-5xl text-white/90 leading-tight">
              Where your<br />people are
            </h2>
          </div>
          <div className="flex flex-wrap gap-3">
            <button onClick={() => setShowCreate(true)}
              className="px-5 py-3 bg-accent hover:bg-accent-hover text-white font-semibold rounded-2xl flex items-center gap-2 transition-colors shadow-[0_6px_20px_rgba(196,107,74,0.3)]">
              <Plus className="w-5 h-5" /> Create Room
            </button>
            <button onClick={() => setShowJoin(true)}
              className="px-5 py-3 font-semibold rounded-2xl flex items-center gap-2 transition-colors"
              style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.10)' }}>
              <DoorOpen className="w-5 h-5" /> Join Room
            </button>
          </div>
        </motion.div>

        {/* ROOMS GRID */}
        {rooms.length === 0 ? (
          <motion.div initial={{opacity:0}} animate={{opacity:1}}
            className="flex flex-col items-center justify-center py-24 rounded-3xl"
            style={{ border:'1px dashed rgba(255,255,255,0.10)' }}>
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
              style={{ background:'rgba(255,255,255,0.05)' }}>
              <UsersIcon className="w-7 h-7 text-white/30" />
            </div>
            <p className="text-white/40 mb-5">No rooms yet — create or join one</p>
            <button onClick={() => setShowCreate(true)}
              className="px-5 py-2.5 bg-accent hover:bg-accent-hover text-white font-semibold rounded-xl transition-colors text-sm">
              Create your first room
            </button>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rooms.map((room, i) => (
              <motion.div key={room._id}
                initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{delay:i*0.05}}
                onClick={() => handleRoomClick(room)}
                className="group relative p-5 rounded-3xl cursor-pointer overflow-hidden"
                style={{ background:'rgba(16,24,38,0.80)', border:'1px solid rgba(255,255,255,0.08)',
                  backdropFilter:'blur(12px)', boxShadow:'0 8px 32px rgba(0,0,0,0.25)',
                  transition:'border-color 150ms ease, box-shadow 150ms ease' }}
                onMouseEnter={e=>{ e.currentTarget.style.borderColor='rgba(196,107,74,0.45)'; e.currentTarget.style.boxShadow='0 12px 40px rgba(0,0,0,0.4)'; }}
                onMouseLeave={e=>{ e.currentTarget.style.borderColor='rgba(255,255,255,0.08)'; e.currentTarget.style.boxShadow='0 8px 32px rgba(0,0,0,0.25)'; }}
              >
                <div className="flex items-start justify-between mb-5">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center font-display text-2xl text-white"
                    style={{ background:'linear-gradient(135deg,rgba(196,107,74,0.25),rgba(196,107,74,0.08))', border:'1px solid rgba(196,107,74,0.2)' }}>
                    {room.name?.[0]?.toUpperCase()}
                  </div>
                  <div className="flex items-center gap-1">
                    {isAdmin(room) && (
                      <button onClick={e=>{e.stopPropagation();setDeleteTarget(room);}}
                        title="Delete room" aria-label="Delete room"
                        className="p-2 rounded-xl text-white/25 hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                    <div className="p-2 rounded-xl" style={{background:'rgba(255,255,255,0.05)'}}>
                      <Lock className="w-3.5 h-3.5 text-white/30" />
                    </div>
                  </div>
                </div>

                <h3 className="font-display text-xl text-white/85 group-hover:text-accent transition-colors leading-tight">
                  {room.name}
                </h3>
                <p className="text-[11px] tracking-[0.14em] font-mono mt-1 text-white/30">{room.roomId}</p>

                <div className="mt-5 pt-4 flex items-center justify-between"
                  style={{ borderTop:'1px solid rgba(255,255,255,0.06)' }}>
                  <div className="flex -space-x-2">
                    {room.members?.slice(0,4).map(m => (
                      <Avatar key={m.user?._id||m.user} user={m.user} size="sm"
                        className="ring-2" style={{ringColor:'rgba(16,24,38,1)'}} />
                    ))}
                  </div>
                  <span className="text-xs text-white/30 flex items-center gap-1.5">
                    <UsersIcon className="w-3.5 h-3.5" />
                    {room.members?.length || 0} member{room.members?.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* MODALS */}
      <AnimatePresence>
        {showCreate && <CreateRoomModal onClose={() => setShowCreate(false)} />}
        {showJoin   && <JoinRoomModal   onClose={() => setShowJoin(false)} />}
      </AnimatePresence>

      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title={'Delete ' + (deleteTarget?.name || 'room') + '?'}
        message="This permanently deletes all messages, games and room data. This cannot be undone."
        confirmText="Delete Forever"
        isDanger
      />
    </div>
  );
};

export default Rooms;
