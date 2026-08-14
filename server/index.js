import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { setupSocket } from './socket/index.js';
import { setupAuthRoutes } from './routes/authRoutes.js';
import salesOrderRoutes from './routes/salesOrderRoutes.js';
import inventoryRoutes from './routes/inventoryRoutes.js';
import masterDataRoutes from './routes/masterDataRoutes.js';

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: "*", // Cho phép mọi kết nối trong quá trình dev
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Khởi tạo Socket.io
setupSocket(io);

// Khởi tạo Routes
app.use('/api', setupAuthRoutes(io));
app.use('/api', salesOrderRoutes);
app.use('/api', inventoryRoutes);
app.use('/api/master', masterDataRoutes);

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Backend Server đang chạy ở port ${PORT}`);
});
