import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Hash, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import useRoomStore from '../store/roomStore';
import toast from 'react-hot-toast';

const JoinRoomModal = ({ onClose }) => {
  const navigate = useNavigate();
  const { joinRoom, loading } = useRoomStore();
  const [formData, setFormData] = useState({
    roomId: '',
    password: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const result = await joinRoom(formData);
    
    if (result.success) {
      toast.success('Joined room successfully!');
      onClose();
      navigate(`/room/${result.room.roomId}`);
    } else {
      toast.error(result.message);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-md bg-surface border border-border rounded-2xl p-6 shadow-2xl"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold">Join Room</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-background rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-2">Room ID</label>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary" />
                <input
                  type="text"
                  value={formData.roomId}
                  onChange={(e) => setFormData({ ...formData, roomId: e.target.value.toUpperCase() })}
                  required
                  maxLength={8}
                  className="w-full pl-11 pr-4 py-3 bg-background border border-border rounded-lg focus:outline-none focus:border-accent transition-colors text-primary placeholder:text-secondary uppercase"
                  placeholder="ABC12345"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary" />
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  className="w-full pl-11 pr-4 py-3 bg-background border border-border rounded-lg focus:outline-none focus:border-accent transition-colors text-primary placeholder:text-secondary"
                  placeholder="Enter room password"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-accent hover:bg-accent-hover text-white font-medium rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Joining...' : 'Join Room'}
            </button>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default JoinRoomModal;
