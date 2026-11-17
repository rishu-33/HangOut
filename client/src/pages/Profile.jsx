import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import useAuthStore from '../store/authStore';
import api from '../utils/api';
import Avatar from '../components/Avatar';

const Profile = () => {
  const navigate = useNavigate();
  const { user, updateProfile } = useAuthStore();
  const fileInputRef = useRef(null);
  const initialName = useRef(user?.username || '');
  const [username, setUsername] = useState(user?.username || '');
  const [avatarFile, setAvatarFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    api.get('/auth/me')
      .then(({ data }) => {
        if (cancelled) return;
        useAuthStore.getState().setUser(data);
        setUsername((current) => (
          current === initialName.current ? (data.username || '') : current
        ));
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const handleFile = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Profile picture must be under 5MB');
      return;
    }

    if (preview) URL.revokeObjectURL(preview);
    setAvatarFile(file);
    setPreview(URL.createObjectURL(file));
    setRemoveAvatar(false);
    event.target.value = '';
  };

  const handleRemovePhoto = () => {
    if (preview) URL.revokeObjectURL(preview);
    setAvatarFile(null);
    setPreview(null);
    setRemoveAvatar(true);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const nextName = username.trim();

    if (nextName.length < 3 || nextName.length > 30) {
      toast.error('Username must be 3–30 characters');
      return;
    }

    setSaving(true);
    const result = await updateProfile({
      username: nextName,
      avatarFile,
      removeAvatar: removeAvatar && !avatarFile
    });
    setSaving(false);

    if (!result.success) {
      toast.error(result.message);
      return;
    }

    setUsername(result.user.username);
    setAvatarFile(null);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setRemoveAvatar(false);
    toast.success('Profile updated');
  };

  const shownAvatar = removeAvatar && !preview ? null : user?.avatar;

  return (
    <div className="min-h-screen text-primary">
      <header className="max-w-lg mx-auto px-6 pt-6">
        <div className="flex items-center gap-3 rounded-3xl border border-white/10 bg-surface/70 backdrop-blur-xl px-3 py-3">
          <button
            onClick={() => navigate('/rooms')}
            className="p-2.5 rounded-2xl text-secondary hover:bg-background hover:text-primary"
            title="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-secondary">Account</p>
            <h1 className="font-display text-2xl leading-none mt-1">Your profile</h1>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-6 py-8">
        <form onSubmit={handleSubmit} className="bg-surface/85 border border-white/10 rounded-[2rem] p-6 sm:p-8 shadow-[0_24px_70px_rgba(0,0,0,0.25)]">
          <div className="flex flex-col items-center mb-8">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="relative group"
              title="Change profile picture"
            >
              <Avatar
                user={{ ...user, username, avatar: shownAvatar }}
                src={preview}
                size="xl"
              />
              <span className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Camera className="w-6 h-6 text-white" />
              </span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              onChange={handleFile}
              className="hidden"
            />
            <p className="mt-4 font-display text-3xl">{username.trim() || 'Your name'}</p>
            <p className="text-sm text-secondary">{user?.email}</p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 text-sm bg-background border border-border rounded-lg hover:border-accent transition-colors"
              >
                Change photo
              </button>
              {(preview || (user?.avatar && !removeAvatar)) && (
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="px-3 py-1.5 text-sm text-red-400 border border-border rounded-lg hover:bg-background transition-colors flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Remove
                </button>
              )}
            </div>
          </div>

          <label className="block text-sm font-medium mb-2">Name</label>
          <input
            type="text"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            minLength={3}
            maxLength={30}
            required
            className="w-full px-4 py-3 bg-background border border-border rounded-2xl focus:outline-none focus:border-accent"
            placeholder="Your name"
          />
          <p className="mt-2 text-xs text-secondary">This name shows on your messages and in room member lists.</p>

          <label className="block text-sm font-medium mt-5 mb-2">Email</label>
          <input
            type="email"
            value={user?.email || ''}
            disabled
            className="w-full px-4 py-3 bg-background border border-border rounded-2xl text-secondary cursor-not-allowed"
          />

          <button
            type="submit"
            disabled={saving}
            className="mt-6 w-full py-3 bg-accent hover:bg-accent-hover text-white font-medium rounded-2xl disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save profile'}
          </button>
        </form>
      </main>
    </div>
  );
};

export default Profile;
