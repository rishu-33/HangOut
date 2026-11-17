import { motion } from 'framer-motion';
import { X, Crown } from 'lucide-react';
import Avatar from './Avatar';

const MembersSidebar = ({ room, onClose }) => {
  const members = [...(room?.members || [])].sort((a, b) => {
    const rank = (member) => (member.user?.status === 'online' ? 0 : 1);
    return rank(a) - rank(b);
  });
  const onlineCount = members.filter((member) => member.user?.status === 'online').length;

  return (
    <motion.aside
      initial={{ x: 28, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 28, opacity: 0 }}
      className="w-[320px] m-3 ml-0 rounded-3xl border border-white/10 bg-surface/90 backdrop-blur-xl flex flex-col shadow-[0_24px_80px_rgba(0,0,0,0.35)] overflow-hidden"
    >
      <div className="px-5 pt-5 pb-4 flex items-start justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-secondary">In this room</p>
          <h2 className="font-display text-2xl mt-1">Members</h2>
          <p className="text-xs text-secondary mt-1">
            {onlineCount} online · {members.length} total
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-full hover:bg-background text-secondary hover:text-primary"
          title="Close members"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1">
        {members.map((member) => {
          const online = member.user?.status === 'online';
          return (
            <div
              key={member.user?._id || member.user}
              className="flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-white/5"
            >
              <div className="relative">
                <Avatar user={member.user} />
                <span
                  className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-surface ${
                    online ? 'bg-emerald-400' : 'bg-zinc-500'
                  }`}
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-medium truncate">{member.user?.username}</p>
                  {member.role === 'admin' && (
                    <Crown className="w-3.5 h-3.5 text-amber-300" title="Admin" />
                  )}
                </div>
                <p className={`text-xs ${online ? 'text-emerald-300/90' : 'text-secondary'}`}>
                  {online ? 'Online now' : 'Away'}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="m-3 mt-0 rounded-2xl bg-background/70 border border-border px-4 py-3 text-sm">
        <p className="text-[11px] uppercase tracking-[0.18em] text-secondary">Room code</p>
        <p className="mt-1 font-mono text-base tracking-[0.18em]">{room?.roomId}</p>
        <p className="mt-2 text-xs text-secondary">Hosted by {room?.creator?.username}</p>
      </div>
    </motion.aside>
  );
};

export default MembersSidebar;
