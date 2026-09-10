// Lưu danh sách kết nối: username (email) -> socketId
export const activeSockets = new Map();

export const setupSocket = (io) => {
  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);
    
    socket.on('register', (username) => {
      console.log(`Registering socket ${socket.id} for username ${username}`);
      activeSockets.set(username, socket.id);
    });

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
      for (const [username, socketId] of activeSockets.entries()) {
        if (socketId === socket.id) {
           activeSockets.delete(username);
           break;
        }
      }
    });
  });
};
