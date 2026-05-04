import http from 'http';
import { Server } from 'socket.io';
import app from './app';
import { setupSocketHandlers } from './socket/socketHandler';

const PORT = process.env.PORT || 3001;

const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
  },
});

setupSocketHandlers(io);

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
