import { Server } from 'socket.io';
import { AuthenticatedSocket } from '../middleware/authMiddleware';
import { roomManager } from '../rooms/RoomManager';
import { LudoEngine } from '../game/ludo/LudoEngine';
import { LudoBotPlayer } from '../game/ludo/LudoBotPlayer';
import { recordGameResult } from '../services/firestoreService';
import { SOCKET_EVENTS } from '@check-game/shared';

export function scheduleLudoBotTurns(io: Server, roomId: string, engine: LudoEngine): void {
  const bots = roomManager.getLudoBots(roomId);
  if (!bots.length) return;

  const poll = setInterval(() => {
    const state = engine.getPublicState();

    if (state.phase === 'GAME_OVER') {
      clearInterval(poll);
      const winner = state.winners[0];
      for (const p of state.players) {
        if (!p.uid.startsWith('bot-')) {
          recordGameResult(p.uid, p.uid === winner, 'ludo').catch(() => null);
        }
      }
      return;
    }

    for (const bot of bots) {
      const me = state.players.find(p => p.uid === bot.uid);
      if (!me || me.isEliminated || !me.isTurn) continue;

      const action = bot.decideAction(state);
      const delay = 800 + Math.random() * 1200;

      setTimeout(() => {
        if (action.type === 'ROLL') engine.onRollDice(bot.uid);
        else if (action.type === 'MOVE' && action.pieceId) engine.onMovePiece(bot.uid, action.pieceId);
      }, delay);
    }
  }, 600);
}

export function registerLudoEvents(io: Server, socket: AuthenticatedSocket): void {
  socket.on(SOCKET_EVENTS.LUDO_ROLL_DICE, (payload: { gameId: string }) => {
    if (!socket.uid) return;
    const engine = roomManager.getGame(payload.gameId) as LudoEngine;
    engine?.onRollDice(socket.uid);
  });

  socket.on(SOCKET_EVENTS.LUDO_MOVE_PIECE, (payload: { gameId: string; pieceId: string }) => {
    if (!socket.uid) return;
    const engine = roomManager.getGame(payload.gameId) as LudoEngine;
    engine?.onMovePiece(socket.uid, payload.pieceId);
  });

  socket.on(SOCKET_EVENTS.LUDO_SKIP_TURN, (payload: { gameId: string }) => {
    if (!socket.uid) return;
    const engine = roomManager.getGame(payload.gameId) as LudoEngine;
    engine?.onSkipTurn(socket.uid);
  });
}
