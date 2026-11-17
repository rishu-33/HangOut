import { create } from 'zustand';
import api from '../utils/api';
import { initializeSocket, disconnectSocket } from '../utils/socket';
import useRoomStore from './roomStore';

const readStoredUser = () => {
  const storedUser = localStorage.getItem('user');
  if (!storedUser) return null;

  try {
    return JSON.parse(storedUser);
  } catch (error) {
    console.warn('Stored user data is invalid and has been cleared.', error);
    localStorage.removeItem('user');
    return null;
  }
};

const useAuthStore = create((set, get) => ({
  user: readStoredUser(),
  token: localStorage.getItem('token') || null,
  isAuthenticated: !!localStorage.getItem('token'),
  loading: false,
  error: null,

  register: async (credentials) => {
    set({ loading: true, error: null });
    try {
      const { data } = await api.post('/auth/register', credentials);
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data));
      initializeSocket(data.token);
      set({ 
        user: data, 
        token: data.token, 
        isAuthenticated: true, 
        loading: false 
      });
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Registration failed';
      set({ error: message, loading: false });
      return { success: false, message };
    }
  },

  login: async (credentials) => {
    set({ loading: true, error: null });
    try {
      const { data } = await api.post('/auth/login', credentials);
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data));
      initializeSocket(data.token);
      set({ 
        user: data, 
        token: data.token, 
        isAuthenticated: true, 
        loading: false 
      });
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Login failed';
      set({ error: message, loading: false });
      return { success: false, message };
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    disconnectSocket();
    set({ 
      user: null, 
      token: null, 
      isAuthenticated: false 
    });
  },

  setUser: (user) => {
    const nextUser = { ...get().user, ...user, token: get().token };
    localStorage.setItem('user', JSON.stringify(nextUser));
    set({ user: nextUser });
  },

  updateProfile: async ({ username, avatarFile, removeAvatar }) => {
    try {
      const formData = new FormData();
      if (username != null) formData.append('username', username);
      if (avatarFile) formData.append('avatar', avatarFile);
      if (removeAvatar) formData.append('removeAvatar', 'true');

      const { data } = await api.put('/auth/profile', formData);

      const nextUser = { ...get().user, ...data, token: get().token };
      localStorage.setItem('user', JSON.stringify(nextUser));
      set({ user: nextUser });
      useRoomStore.getState().applyProfileUpdate(data._id, data.username, data.avatar);
      return { success: true, user: nextUser };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to update profile'
      };
    }
  },

  clearError: () => set({ error: null })
}));

const storedToken = localStorage.getItem('token');
if (storedToken) {
  initializeSocket(storedToken);
}

export default useAuthStore;
