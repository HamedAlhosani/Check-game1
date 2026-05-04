import { Server } from 'socket.io';
import { AuthenticatedSocket } from '../middleware/authMiddleware';
import { roomManager } from '../rooms/RoomManager';
import { JacaroEngine } from '../game/jackaro/JacaroEngine';
import { JacaroBotPlayer } from '../game/jackaro/JacaroBotPlayer';
import { recordGameResult } from '../services/firestoreService';
import { SOCKET_EVENTS } from '@check-game/shared';

export function scheduleJacaroBotTurns(io: Server, roomId: string, engine: JacaroEngine): void {
  const bots = roomManager.getJacaroBots(roomId);
  if (!bots.length) return;

  const poll = setInterval(() => {
    const state = engine.getPublicState();

    if (state.phase === 'GAME_OVER') {
      clearInterval(poll);
      for (const p of state.players) {
        if (!p.uid.startsWith('bot-')) {
          recordGameResult(p.uid, false, 'jackaro').catch(() => null);
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
      const delay = 1200 + Math.random() * 1500;

      setTimeout(() => {
        if (action.type === 'DRAW' || action.type === 'DRAW_DISCARD') {
          engine.onDraw(bot.uid, !!action.fromDiscard);
        } else if (action.type === 'DISCARD' && action.cardId) {
          engine.onDiscard(bot.uid, action.cardId);
        } else if (action.type === 'MELD' && action.cardIds) {
          engine.onMeld(bot.uid, action.cardIds);
        } else if (action.type === 'EXTEND_MELD' && action.meldId && action.cardId) {
          engine.onExtendMeld(bot.uid, action.meldId, action.cardId);
        } else if (action.type === 'KNOCK') {
          engine.onKnock(bot.uid);
        }
      }, delay);
    }
  }, 600);
}

export function registerJacaroEvents(io: Server, socket: AuthenticatedSocket): void {
  socket.on(SOCKET_EVENTS.JACKARO_DRAW, (payload: { gameId: string; fromDiscard?: boolean }) => {
    if (!socket.uid) return;
    const engine = roomManager.getGame(payload.gameId) as JacaroEngine;
    engine?.onDraw(socket.uid, !!payload.fromDiscard);
  });

  socket.on(SOCKET_EVENTS.JACKARO_DISCARD, (payload: { gameId: string; cardId: string }) => {
    if (!socket.uid) return;
    const engine = roomManager.getGame(payload.gameId) as JacaroEngine;
    engine?.onDiscard(socket.uid, payload.cardId);
  });

  socket.on(SOCKET_EVENTS.JACKARO_MELD, (payload: { gameId: string; cardIds: string[] }) => {
    if (!socket.uid) return;
    const engine = roomManager.getGame(payload.gameId) as JacaroEngine;
    engine?.onMeld(socket.uid, payload.cardIds);
  });

  socket.on(SOCKET_EVENTS.JACKARO_EXTEND_MELD, (payload: { gameId: string; meldId: string; cardId: string }) => {
    if (!socket.uid) return;
    const engine = roomManager.getGame(payload.gameId) as JacaroEngine;
    engine?.onExtendMeld(socket.uid, payload.meldId, payload.cardId);
  });

  socket.on(SOCKET_EVENTS.JACKARO_KNOCK, (payload: { gameId: string }) => {
    if (!socket.uid) return;
    const engine = roomManager.getGame(payload.gameId) as JacaroEngine;
    engine?.onKnock(socket.uid);
  });
}
