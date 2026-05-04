import { Server } from 'socket.io';
import { AuthenticatedSocket } from '../middleware/authMiddleware';
import { roomManager } from '../rooms/RoomManager';
import { DominoEngine } from '../game/domino/DominoEngine';
import { DominoBotPlayer } from '../game/domino/DominoBotPlayer';
import { recordGameResult } from '../services/firestoreService';
import { SOCKET_EVENTS } from '@check-game/shared';

export function scheduleDominoBotTurns(io: Server, roomId: string, engine: DominoEngine): void {
  const bots = roomManager.getDominoBots(roomId);
  if (!bots.length) return;

  const poll = setInterval(() => {
    const state = engine.getPublicState();

    if (state.phase === 'GAME_OVER') {
      clearInterval(poll);
      for (const p of state.players) {
        if (!p.uid.startsWith('bot-')) {
          recordGameResult(p.uid, false, 'domino').catch(() => null);
        }
      }
      return;
    }

    for (const bot of bots) {
      const me = state.players.find(p => p.uid === bot.uid);
      if (!me || me.isEliminated || !me.isTurn) continue;
      if (state.phase !== 'PLAYING') continue;

      const hand = engine.getPrivateHand(bot.uid);
      const action = bot.decideAction(state, hand);
      const delay = 1000 + Math.random() * 1200;

      setTimeout(() => {
        if (action.type === 'PLAY' && action.tileId && action.end) {
          engine.onPlayTile(bot.uid, action.tileId, action.end);
        } else if (action.type === 'DRAW') {
          engine.onDrawTile(bot.uid);
        } else if (action.type === 'PASS') {
          engine.onPass(bot.uid);
        }
      }, delay);
    }
  }, 600);
}

export function registerDominoEvents(io: Server, socket: AuthenticatedSocket): void {
  socket.on(SOCKET_EVENTS.DOMINO_PLAY_TILE, (payload: { gameId: string; tileId: string; end: 'left' | 'right' }) => {
    if (!socket.uid) return;
    const engine = roomManager.getGame(payload.gameId) as DominoEngine;
    engine?.onPlayTile(socket.uid, payload.tileId, payload.end);
  });

  socket.on(SOCKET_EVENTS.DOMINO_DRAW_TILE, (payload: { gameId: string }) => {
    if (!socket.uid) return;
    const engine = roomManager.getGame(payload.gameId) as DominoEngine;
    engine?.onDrawTile(socket.uid);
  });

  socket.on(SOCKET_EVENTS.DOMINO_PASS, (payload: { gameId: string }) => {
    if (!socket.uid) return;
    const engine = roomManager.getGame(payload.gameId) as DominoEngine;
    engine?.onPass(socket.uid);
  });
}
