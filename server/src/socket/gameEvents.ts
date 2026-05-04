import { Server } from 'socket.io';
import { AuthenticatedSocket } from '../middleware/authMiddleware';
import { roomManager } from '../rooms/RoomManager';
import { GameEngine, GameEventEmitter } from '../game/GameEngine';
import { LudoEngine } from '../game/ludo/LudoEngine';
import { DominoEngine } from '../game/domino/DominoEngine';
import { JacaroEngine } from '../game/jackaro/JacaroEngine';
import { recordGameResult, saveMatchHistory } from '../services/firestoreService';
import {
  SOCKET_EVENTS,
  SwapDrawnPayload,
  BurnDiscardPayload,
  SpecialSwapPayload,
  SpecialPeekOwnPayload,
  BurnAttemptPayload,
  TakeDiscardPayload,
} from '@check-game/shared';
import { scheduleLudoBotTurns, registerLudoEvents } from './ludoEvents';
import { scheduleDominoBotTurns, registerDominoEvents } from './dominoEvents';
import { scheduleJacaroBotTurns, registerJacaroEvents } from './jacaroEvents';

export function createEmitter(io: Server, roomId: string): GameEventEmitter {
  return (event: string, data: unknown, _roomId?: string, toUid?: string) => {
    if (toUid) {
      const sockets = Array.from(io.sockets.sockets.values()) as AuthenticatedSocket[];
      const target = sockets.find(s => s.uid === toUid);
      target?.emit(event, data);
    } else {
      io.to(roomId).emit(event, data);
    }
  };
}

export function startGameSession(io: Server, roomId: string): void {
  const gameType = roomManager.getRoomGameType(roomId);

  // Wrap emitter to intercept game:over for non-bot (online) sessions
  const wrappedEmitter: GameEventEmitter = (event, data, rid, toUid) => {
    createEmitter(io, roomId)(event, data, rid, toUid);
    if (event === 'game:over' && gameType === 'check') {
      const d = data as any;
      const engine = roomManager.getGame(d.gameId) as GameEngine | undefined;
      if (!engine) return;
      const state = engine.getPublicState();
      const bots = roomManager.getCheckBots(roomId);
      if (bots.length > 0) return; // handled in bot poll
      const result = [...state.players].sort((a, b) => a.cumulativeScore - b.cumulativeScore);
      const winnerId = result[0]?.uid ?? null;
      for (const p of state.players) {
        if (!p.uid.startsWith('bot-')) {
          recordGameResult(p.uid, p.uid === winnerId, 'check').catch(() => null);
        }
      }
      const realPlayers = state.players.filter(p => !p.uid.startsWith('bot-'));
      if (realPlayers.length > 0) {
        saveMatchHistory({
          gameId: d.gameId ?? 'unknown',
          gameType: 'check',
          playedAt: Date.now(),
          players: realPlayers.map(p => ({ uid: p.uid, displayName: p.displayName, avatarId: p.avatarId, score: p.cumulativeScore })),
          winnerId,
        }).catch(() => null);
      }
    }
  };

  const engine = roomManager.startGame(roomId, wrappedEmitter);
  if (!engine) return;

  const gameId = (engine as any).gameId;
  io.to(roomId).emit(SOCKET_EVENTS.LOBBY_GAME_STARTING, { gameId, countdown: 3, gameType });

  setTimeout(() => {
    (engine as any).start();

    switch (gameType) {
      case 'ludo':
        scheduleLudoBotTurns(io, roomId, engine as LudoEngine);
        break;
      case 'domino':
        scheduleDominoBotTurns(io, roomId, engine as DominoEngine);
        break;
      case 'jackaro':
        scheduleJacaroBotTurns(io, roomId, engine as JacaroEngine);
        break;
      default:
        scheduleCheckBotTurns(io, roomId, engine as GameEngine);
        break;
    }
  }, 3000);
}

function scheduleCheckBotTurns(io: Server, roomId: string, engine: GameEngine): void {
  const bots = roomManager.getCheckBots(roomId);
  if (!bots.length) return;

  const poll = setInterval(() => {
    const state = engine.getPublicState();

    if (state.phase === 'GAME_OVER') {
      clearInterval(poll);
      const result = [...state.players].sort((a, b) => a.cumulativeScore - b.cumulativeScore);
      const winnerId = result[0]?.uid ?? null;
      const realPlayers = state.players.filter(p => !p.uid.startsWith('bot-'));
      for (const p of realPlayers) {
        recordGameResult(p.uid, p.uid === winnerId, 'check').catch(() => null);
      }
      if (realPlayers.length > 0) {
        saveMatchHistory({
          gameId: (engine as any).gameId ?? 'unknown',
          gameType: 'check',
          playedAt: Date.now(),
          players: state.players.filter(p => !p.uid.startsWith('bot-')).map(p => ({
            uid: p.uid,
            displayName: p.displayName,
            avatarId: p.avatarId,
            score: p.cumulativeScore,
          })),
          winnerId,
        }).catch(() => null);
      }
      return;
    }

    if (state.phase === 'PEEK_PHASE') {
      for (const bot of bots) {
        const me = state.players.find(p => p.uid === bot.uid);
        if (me && !me.isEliminated) {
          setTimeout(() => engine.onPeekComplete(bot.uid), 1000 + Math.random() * 1500);
        }
      }
      return;
    }

    for (const bot of bots) {
      const me = state.players.find(p => p.uid === bot.uid);
      if (!me || me.isEliminated) continue;

      if ((state.phase === 'PLAYING' || state.phase === 'CHECK_CALLED') && me.isTurn) {
        const action = bot.decideTurn(state);
        const delay = 400 + Math.random() * 400;

        setTimeout(() => {
          if (action.type === 'CALL_CHECK') {
            engine.onCallCheck(bot.uid);
          } else if (action.type === 'DRAW') {
            engine.onDrawDeck(bot.uid);
            setTimeout(() => {
              const drawnCard = engine.getDrawnCard(bot.uid);
              if (!drawnCard) return;
              const freshState = engine.getPublicState();
              const postAction = bot.decideTurn(freshState, drawnCard);
              if (postAction.type === 'SWAP_DRAWN') {
                engine.onSwapDrawn(bot.uid, postAction.position);
              } else {
                engine.onBurnDrawn(bot.uid);
              }
            }, 400 + Math.random() * 400);
          }
        }, delay);
        continue;
      }

      if (state.phase === 'SPECIAL_J' && state.specialActionUid === bot.uid) {
        const action = bot.decideTurn(state);
        if (action.type === 'SPECIAL_SWAP') {
          setTimeout(() => engine.onSpecialSwap(bot.uid, action.myPosition, action.targetUid, action.targetPosition), 500);
        }
      }

      if (state.phase === 'SPECIAL_Q' && state.specialActionUid === bot.uid) {
        const botMe = state.players.find(p => p.uid === bot.uid);
        const peekPos = botMe ? botMe.cards.findIndex(c => c !== null) : 0;
        setTimeout(() => engine.onSpecialPeekOwn(bot.uid, peekPos >= 0 ? peekPos : 0), 500);
      }

      if (state.phase === 'KING_CHOICE' && state.specialActionUid === bot.uid) {
        setTimeout(() => engine.onKingBurn(bot.uid), 500 + Math.random() * 400);
      }
    }
  }, 500);
}

export function registerGameEvents(io: Server, socket: AuthenticatedSocket): void {
  // Register all game-specific events
  registerLudoEvents(io, socket);
  registerDominoEvents(io, socket);
  registerJacaroEvents(io, socket);

  // Check game events
  socket.on(SOCKET_EVENTS.GAME_PEEK_COMPLETE, (payload: { gameId: string }) => {
    if (!socket.uid) return;
    const engine = roomManager.getGame(payload.gameId) as GameEngine;
    engine?.onPeekComplete(socket.uid);
  });

  socket.on(SOCKET_EVENTS.GAME_DRAW_DECK, (payload: { gameId: string }) => {
    if (!socket.uid) return;
    const engine = roomManager.getGame(payload.gameId) as GameEngine;
    engine?.onDrawDeck(socket.uid);
  });

  socket.on(SOCKET_EVENTS.GAME_BURN_DRAWN, (payload: { gameId: string }) => {
    if (!socket.uid) return;
    const engine = roomManager.getGame(payload.gameId) as GameEngine;
    engine?.onBurnDrawn(socket.uid);
  });

  socket.on(SOCKET_EVENTS.GAME_SWAP_DRAWN, (payload: SwapDrawnPayload) => {
    if (!socket.uid) return;
    const engine = roomManager.getGame(payload.gameId) as GameEngine;
    engine?.onSwapDrawn(socket.uid, payload.cardPosition);
  });

  socket.on(SOCKET_EVENTS.GAME_BURN_DISCARD, (payload: BurnDiscardPayload) => {
    if (!socket.uid) return;
    const engine = roomManager.getGame(payload.gameId) as GameEngine;
    engine?.onBurnDiscard(socket.uid, payload.cardPosition);
  });

  socket.on(SOCKET_EVENTS.GAME_CALL_CHECK, (payload: { gameId: string }) => {
    if (!socket.uid) return;
    const engine = roomManager.getGame(payload.gameId) as GameEngine;
    engine?.onCallCheck(socket.uid);
  });

  socket.on(SOCKET_EVENTS.GAME_SPECIAL_SWAP, (payload: SpecialSwapPayload) => {
    if (!socket.uid) return;
    const engine = roomManager.getGame(payload.gameId) as GameEngine;
    engine?.onSpecialSwap(socket.uid, payload.myPosition, payload.targetUid, payload.targetPosition);
  });

  socket.on(SOCKET_EVENTS.GAME_SPECIAL_PEEK_OWN, (payload: SpecialPeekOwnPayload) => {
    if (!socket.uid) return;
    const engine = roomManager.getGame(payload.gameId) as GameEngine;
    engine?.onSpecialPeekOwn(socket.uid, payload.cardPosition);
  });

  socket.on(SOCKET_EVENTS.GAME_KING_SWAP, (payload: { gameId: string; choiceIndex: number; handPosition: number }) => {
    if (!socket.uid) return;
    const engine = roomManager.getGame(payload.gameId) as GameEngine;
    engine?.onKingSwap(socket.uid, payload.choiceIndex, payload.handPosition);
  });

  socket.on(SOCKET_EVENTS.GAME_KING_BURN, (payload: { gameId: string }) => {
    if (!socket.uid) return;
    const engine = roomManager.getGame(payload.gameId) as GameEngine;
    engine?.onKingBurn(socket.uid);
  });

  socket.on(SOCKET_EVENTS.GAME_BURN_ATTEMPT, (payload: BurnAttemptPayload) => {
    if (!socket.uid) return;
    const engine = roomManager.getGame(payload.gameId) as GameEngine;
    engine?.onBurnAttempt(socket.uid, payload.cardPosition);
  });

  socket.on(SOCKET_EVENTS.GAME_TAKE_DISCARD, (payload: TakeDiscardPayload) => {
    if (!socket.uid) return;
    const engine = roomManager.getGame(payload.gameId) as GameEngine;
    engine?.onTakeDiscard(socket.uid, payload.handPosition);
  });

  // Reconnect: find room by socket ID (normal) or by UID (after page refresh)
  const roomId = roomManager.getRoomForSocket(socket.id) ??
    (socket.uid ? roomManager.getRoomForUid(socket.uid) : undefined);
  if (roomId) {
    roomManager.trackSocket(socket.id, roomId);
    const engine = roomManager.getGame(roomId);
    if (engine) {
      socket.emit(SOCKET_EVENTS.SYSTEM_RECONNECT_STATE, (engine as any).getPublicState());
    }
  }
}
