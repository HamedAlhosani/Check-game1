import { Server } from 'socket.io';
import { AuthenticatedSocket } from '../middleware/authMiddleware';
import { roomManager } from '../rooms/RoomManager';
import { LudoEngine } from '../game/ludo/LudoEngine';
import { LudoBotPlayer } from '../game/ludo/LudoBotPlayer';
import { recordGameResult, getUserProfile } from '../services/firestoreService';
import { saveUsers } from '../data/store';
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

  // Re-roll the dice using one Ludo gem. Pre-flight in the handler so the
  // engine never has to know about currency. If the player has 0 gems, no
  // refund-on-failure is needed since we never deducted.
  socket.on(SOCKET_EVENTS.LUDO_REROLL_DICE, async (payload: { gameId: string }) => {
    if (!socket.uid) return;
    const engine = roomManager.getGame(payload.gameId) as LudoEngine;
    if (!engine) return;
    const profile = await getUserProfile(socket.uid);
    if (!profile) return;
    const cur = ((profile as any).ludoGems ?? 0) as number;
    if (cur < 1) return; // silent — UI gates this
    const result = engine.onRerollDice(socket.uid);
    if (!result.ok) return;
    (profile as any).ludoGems = cur - 1;
    saveUsers();
  });
}
