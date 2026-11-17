import { getFileUrl } from '../utils/api';

const sizes = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-16 h-16 text-xl',
  xl: 'w-28 h-28 text-3xl'
};

const Avatar = ({ user, size = 'md', src, className = '' }) => {
  const photo = src || (user?.avatar ? getFileUrl(user.avatar) : null);
  const initial = user?.username?.[0]?.toUpperCase() || '?';

  return (
    <div
      className={`${sizes[size] || sizes.md} rounded-full bg-gradient-to-br from-accent/40 to-surface-light text-primary overflow-hidden flex items-center justify-center flex-shrink-0 ring-1 ring-white/10 ${className}`}
    >
      {photo ? (
        <img src={photo} alt={user?.username || 'Profile'} className="w-full h-full object-cover" />
      ) : (
        <span className="font-medium">{initial}</span>
      )}
    </div>
  );
};

export default Avatar;
