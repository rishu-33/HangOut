import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Users, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import useRoomStore from '../store/roomStore';
import toast from 'react-hot-toast';

const CreateRoomModal = ({ onClose }) => {
  const navigate = useNavigate();
  const { createRoom, loading } = useRoomStore();
  const [formData, setFormData] = useState({
    name: '',
    password: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.password.length < 4) {
      toast.error('Password must be at least 4 characters');
      return;
    }

    const result = await createRoom(formData);
    
    if (result.success) {
      toast.success(`Room created! ID: ${result.room.roomId}`);
      onClose();
      navigate(`/room/${result.room.roomId}`);
    } else {
      toast.error(result.message);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-md bg-surface border border-border rounded-2xl p-6 shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold">Create Room</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-background rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-2">Room Name</label>
              <div className="relative">
                <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary" />
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  maxLength={50}
                  className="w-full pl-11 pr-4 py-3 bg-background border border-border rounded-lg focus:outline-none focus:border-accent transition-colors text-primary placeholder:text-secondary"
                  placeholder="Friends Hangout"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Room Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary" />
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  minLength={4}
                  className="w-full pl-11 pr-4 py-3 bg-background border border-border rounded-lg focus:outline-none focus:border-accent transition-colors text-primary placeholder:text-secondary"
                  placeholder="Enter a secure password"
                />
              </div>
              <p className="text-xs text-secondary mt-2">
                Share this password with people you want to invite
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-accent hover:bg-accent-hover text-white font-medium rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create Room'}
            </button>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default CreateRoomModal;
