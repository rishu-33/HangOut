let io = null;

export const setIO = (ioInstance) => {
  io = ioInstance;
};

export const getIO = () => io;

export const userRoom = (userId) => `user:${userId}`;

export const emitToUsers = (userIds, event, payload) => {
  if (!io) return;

  const uniqueIds = [...new Set(userIds.map((id) => id?.toString()).filter(Boolean))];
  uniqueIds.forEach((id) => {
    io.to(userRoom(id)).emit(event, payload);
  });
};
