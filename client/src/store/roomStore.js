import { create } from 'zustand';
import api from '../utils/api';

const useRoomStore = create((set, get) => ({
  rooms: [],
  currentRoom: null,
  loading: false,
  error: null,

  fetchRooms: async () => {
    set({ loading: true });
    try {
      const { data } = await api.get('/rooms');
      set({ rooms: data, loading: false });
    } catch (error) {
      set({ 
        error: error.response?.data?.message || 'Failed to fetch rooms',
        loading: false 
      });
    }
  },

  createRoom: async (roomData) => {
    set({ loading: true, error: null });
    try {
      const { data } = await api.post('/rooms', roomData);
      set((state) => ({ 
        rooms: [data, ...state.rooms],
        currentRoom: data,
        loading: false 
      }));
      return { success: true, room: data };
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to create room';
      set({ error: message, loading: false });
      return { success: false, message };
    }
  },

  joinRoom: async (roomData) => {
    set({ loading: true, error: null });
    try {
      const { data } = await api.post('/rooms/join', roomData);
      
      // Check if room already exists in list
      const existingRoom = get().rooms.find(r => r._id === data._id);
      
      if (!existingRoom) {
        set((state) => ({ 
          rooms: [data, ...state.rooms],
          currentRoom: data,
          loading: false 
        }));
      } else {
        set({ currentRoom: data, loading: false });
      }
      
      return { success: true, room: data };
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to join room';
      set({ error: message, loading: false });
      return { success: false, message };
    }
  },

  setCurrentRoom: (room) => {
    set({ currentRoom: room });
  },

  removeRoomLocally: (roomId) => {
    const code = roomId?.toUpperCase();
    set((state) => ({
      rooms: state.rooms.filter((room) => room.roomId?.toUpperCase() !== code),
      currentRoom: state.currentRoom?.roomId?.toUpperCase() === code
        ? null
        : state.currentRoom
    }));
  },

  leaveRoom: async (roomId) => {
    try {
      await api.delete(`/rooms/${roomId}/leave`);
      set((state) => ({
        rooms: state.rooms.filter(r => r.roomId !== roomId),
        currentRoom: state.currentRoom?.roomId === roomId ? null : state.currentRoom
      }));
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.message || 'Failed to leave room'
      };
    }
  },

  deleteRoom: async (roomId) => {
    try {
      await api.delete(`/rooms/${roomId}`);
      const code = roomId?.toUpperCase();
      set((state) => ({
        rooms: state.rooms.filter(r => r.roomId?.toUpperCase() !== code),
        currentRoom: state.currentRoom?.roomId?.toUpperCase() === code ? null : state.currentRoom
      }));
      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to delete room'
      };
    }
  },

  removeMember: async (roomId, userId) => {
    try {
      await api.delete(`/rooms/${roomId}/members/${userId}`);
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.message || 'Failed to remove member'
      };
    }
  },

  applyProfileUpdate: (userId, username, avatar) => {
    const patchUser = (person) => {
      if (!person || String(person._id) !== String(userId)) return person;
      return { ...person, username, avatar };
    };

    const patchMember = (member) => {
      const id = member.user?._id || member.user;
      if (String(id) !== String(userId)) return member;
      return { ...member, user: { ...member.user, username, avatar } };
    };

    const patchRoom = (room) => {
      if (!room) return room;
      return {
        ...room,
        creator: patchUser(room.creator),
        members: room.members?.map(patchMember)
      };
    };

    set((state) => ({
      rooms: state.rooms.map(patchRoom),
      currentRoom: patchRoom(state.currentRoom)
    }));
  },

  updateRoomMembers: (roomId, members) => {
    const code = roomId?.toUpperCase();
    set((state) => ({
      rooms: state.rooms.map(room => 
        room.roomId?.toUpperCase() === code ? { ...room, members } : room
      ),
      currentRoom: state.currentRoom?.roomId?.toUpperCase() === code 
        ? { ...state.currentRoom, members }
        : state.currentRoom
    }));
  },

  clearError: () => set({ error: null })
}));

export default useRoomStore;
