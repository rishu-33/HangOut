import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Hash, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import useRoomStore from '../store/roomStore';
import toast from 'react-hot-toast';

// ✅ Field component OUTSIDE to prevent re-creation on every render
const Field = ({ icon: Icon, label, ...props }) => (
  <div>
    <label className="block text-xs font-medium text-white/45 uppercase tracking-wide mb-1.5">{label}</label>
    <div className="relative">
      <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25 pointer-events-none" />
      <input {...props}
        className="w-full pl-10 pr-4 py-3 rounded-xl text-[14px] text-white/80 placeholder:text-white/22 focus:outline-none transition-all"
        style={{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.09)'}}
        onFocus={e=>{e.target.style.borderColor='#c46b4a';e.target.style.background='rgba(255,255,255,0.07)';}}
        onBlur={e=>{e.target.style.borderColor='rgba(255,255,255,0.09)';e.target.style.background='rgba(255,255,255,0.05)';}}
      />
    </div>
  </div>
);

const JoinRoomModal = ({ onClose }) => {
  const navigate = useNavigate();
  const { joinRoom, loading } = useRoomStore();
  const [form, setForm] = useState({ roomId:'', password:'' });
  const set = k => e => setForm(f=>({...f,[k]: k==='roomId'?e.target.value.toUpperCase():e.target.value}));

  const onSubmit = async e => {
    e.preventDefault();
    const r = await joinRoom(form);
    if (r.success) { toast.success('Joined!'); onClose(); navigate('/room/'+r.room.roomId); }
    else toast.error(r.message);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
          onClick={onClose} className="absolute inset-0 backdrop-blur-sm"
          style={{background:'rgba(0,0,0,0.65)'}} />
        <motion.div initial={{opacity:0,scale:0.94,y:16}} animate={{opacity:1,scale:1,y:0}} exit={{opacity:0,scale:0.94,y:16}}
          transition={{type:'spring',stiffness:340,damping:28}}
          className="relative w-full max-w-md rounded-2xl p-6 shadow-2xl"
          style={{background:'#0f1826',border:'1px solid rgba(255,255,255,0.09)'}}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-white/88">Join Room</h2>
            <button onClick={onClose} aria-label="Close"
              className="p-2 rounded-xl text-white/35 hover:text-white/70 hover:bg-white/8 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          <form onSubmit={onSubmit} className="space-y-4">
            <Field icon={Hash} label="Room ID"  type="text"     value={form.roomId}   onChange={set('roomId')}   placeholder="ABC12345"           required maxLength={8} />
            <Field icon={Lock} label="Password" type="password" value={form.password} onChange={set('password')} placeholder="Enter room password" required />
            <button type="submit" disabled={loading}
              className="w-full mt-2 py-3 bg-accent hover:bg-accent-hover text-white font-semibold rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_6px_18px_rgba(196,107,74,0.28)]">
              {loading ? 'Joining…' : 'Join Room'}
            </button>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default JoinRoomModal;
