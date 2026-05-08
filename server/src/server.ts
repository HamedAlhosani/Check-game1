import http from 'http';
import { Server } from 'socket.io';
import app from './app';
import { setupSocketHandlers } from './socket/socketHandler';
import { setIO } from './socket/notifications';
import { startClanWarTicker } from './services/clanWarService';

const PORT = process.env.PORT || 3001;

const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.NODE_ENV === 'production'
      ? true
      : (process.env.CLIENT_URL || 'http://localhost:5173'),
    methods: ['GET', 'POST'],
  },
});

setIO(io);
setupSocketHandlers(io);
startClanWarTicker();

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
