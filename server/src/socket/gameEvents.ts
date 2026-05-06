import { Server } from 'socket.io';
import { AuthenticatedSocket } from '../middleware/authMiddleware';
import { roomManager } from '../rooms/RoomManager';
import { GameEngine, GameEventEmitter } from '../game/GameEngine';
import { BotPlayer } from '../game/BotPlayer';
import { LudoEngine } from '../game/ludo/LudoEngine';
import { DominoEngine } from '../game/domino/DominoEngine';
import { JacaroEngine } from '../game/jackaro/JacaroEngine';
import { recordGameResult, saveMatchHistory } from '../services/firestoreService';
import { tournamentManager } from '../rooms/TournamentManager';
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
    // When a J swap lands on a bot, let it remember who attacked it so it
    // can swap back later when it draws a J of its own.
    if (event === 'game:swap_executed' && gameType === 'check') {
      const d = data as any;
      if (d?.targetUid && d?.uid && d.targetUid !== d.uid) {
        const targetBot = roomManager.getCheckBots(roomId).find(b => b.uid === d.targetUid);
        targetBot?.noteJSwapAgainstMe(d.uid);
      }
    }
    if (event === 'game:over' && gameType === 'check') {
      const d = data as any;
      const engine = roomManager.getGame(d.gameId) as GameEngine | undefined;
      if (!engine) return;
      const state = engine.getPublicState();
      // Tournament hook — if this match is part of a bracket, advance it.
      // Tournament matches always have a non-empty bot pool, so this fires
      // before the bot-pool early-return below.
      const winnerForBracket = [...state.players].sort((a, b) => a.cumulativeScore - b.cumulativeScore)[0]?.uid ?? null;
      tournamentManager.onGameOver(io, d.gameId, winnerForBracket).catch(() => null);
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
          players: realPlayers.map(p => ({ uid: p.uid, displayName: p.displayName, avatarId: p.avatarId, equippedFrame: (p as any).equippedFrame, score: p.cumulativeScore })),
          winnerId,
        }).catch(() => null);
      }
    }
  };

  const engine = roomManager.startGame(roomId, wrappedEmitter);
  if (!engine) return;

  const gameId = (engine as any).gameId;
  io.to(roomId).emit(SOCKET_EVENTS.LOBBY_GAME_STARTING, { gameId, countdown: 0, gameType });

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
  }, 400);
}

// ─── Abandon timers ─────────────────────────────────────────────────────────
// When a player is replaced by a bot (explicit Exit or disconnect), they have
// 60 seconds to come back. After that, mark them as bot in Room.players so
// getRoomForUid stops auto-resuming them — the game keeps running with the
// bot, and they get a fresh /home next time they open the site.
const ABANDON_GRACE_MS = 60_000;
const abandonTimers = new Map<string, NodeJS.Timeout>();

function abandonKey(roomId: string, uid: string): string {
  return `${roomId}|${uid}`;
}

export function scheduleAbandon(roomId: string, uid: string): void {
  const key = abandonKey(roomId, uid);
  cancelAbandon(roomId, uid);
  const t = setTimeout(() => {
    const room = roomManager.getRoom(roomId);
    abandonTimers.delete(key);
    if (!room) return;
    const rp = room.players.find(p => p.uid === uid);
    if (rp) rp.isBot = true;
  }, ABANDON_GRACE_MS);
  abandonTimers.set(key, t);
}

export function cancelAbandon(roomId: string, uid: string): void {
  const key = abandonKey(roomId, uid);
  const existing = abandonTimers.get(key);
  if (existing) {
    clearTimeout(existing);
    abandonTimers.delete(key);
  }
}

export function scheduleCheckBotTurns(io: Server, roomId: string, engine: GameEngine): void {
  // Always start the polling loop — even all-human games may add bot stand-ins
  // later when a player disconnects, AFKs out, or hands their seat to a bot
  // via GAME_BOT_TAKEOVER. The interior already no-ops if there are 0 bots.
  const poll = setInterval(() => {
    const bots = roomManager.getCheckBots(roomId); // re-fetch to include disconnect-added bots
    const state = engine.getPublicState();

    if (state.phase === 'GAME_OVER') {
      clearInterval(poll);
      const result = [...state.players].sort((a, b) => a.cumulativeScore - b.cumulativeScore);
      const winnerId = result[0]?.uid ?? null;
      // Tournament hook — advance the bracket if this was a cup match.
      tournamentManager.onGameOver(io, engine.gameId, winnerId).catch(() => null);
      const realPlayers = state.players.filter(p => !p.uid.startsWith('bot-') && !p.displayName.endsWith('🤖'));
      for (const p of realPlayers) {
        recordGameResult(p.uid, p.uid === winnerId, 'check').catch(() => null);
      }
      if (realPlayers.length > 0) {
        // Capture both human and bot players in the record so the replay
        // shows the full table (the leaderboard credits only humans, but
        // the replay needs everyone for context).
        const meta = engine.getMatchMeta();
        saveMatchHistory({
          gameId: engine.gameId ?? 'unknown',
          gameType: 'check',
          playedAt: Date.now(),
          players: state.players.map(p => ({
            uid: p.uid,
            displayName: p.displayName,
            avatarId: p.avatarId,
            equippedFrame: (p as any).equippedFrame,
            score: p.cumulativeScore,
          })),
          winnerId,
          rounds: engine.getRoundsLog(),
          gameMode: meta.gameMode,
          eliminationScore: meta.eliminationScore,
          durationMs: meta.durationMs,
        }).catch(() => null);
      }
      return;
    }

    if (state.phase === 'PEEK_PHASE') {
      for (const bot of bots) {
        const me = state.players.find(p => p.uid === bot.uid);
        if (me && !me.isEliminated) {
          // Give the bot its actual cards before peeking
          bot.updateCards(engine.getBotCards(bot.uid));
          setTimeout(() => engine.onPeekComplete(bot.uid), 800 + Math.random() * 800);
        }
      }
      return;
    }

    for (const bot of bots) {
      const me = state.players.find(p => p.uid === bot.uid);
      if (!me || me.isEliminated) continue;

      if ((state.phase === 'PLAYING' || state.phase === 'CHECK_CALLED') && me.isTurn) {
        // Update bot's card knowledge from server-side actual cards
        bot.updateCards(engine.getBotCards(bot.uid));
        const action = bot.decideTurn(state);
        const delay = 350 + Math.random() * 350;

        setTimeout(() => {
          if (action.type === 'CALL_CHECK') {
            engine.onCallCheck(bot.uid);
          } else if (action.type === 'BURN_DISCARD') {
            engine.onBurnAttempt(bot.uid, action.position);
          } else if (action.type === 'TAKE_DISCARD') {
            engine.onTakeDiscard(bot.uid, action.position);
          } else if (action.type === 'DRAW') {
            engine.onDrawDeck(bot.uid);
            setTimeout(() => {
              const drawnCard = engine.getDrawnCard(bot.uid);
              if (!drawnCard) return;
              bot.updateCards(engine.getBotCards(bot.uid));
              const postAction = bot.decideTurn(state, drawnCard);
              if (postAction.type === 'SWAP_DRAWN') {
                engine.onSwapDrawn(bot.uid, postAction.position);
              } else {
                engine.onBurnDrawn(bot.uid);
              }
            }, 300 + Math.random() * 300);
          }
        }, delay);
        continue;
      }

      if (state.phase === 'SPECIAL_J' && state.specialActionUid === bot.uid) {
        bot.updateCards(engine.getBotCards(bot.uid));
        const action = bot.decideTurn(state);
        if (action.type === 'SPECIAL_SWAP') {
          setTimeout(() => engine.onSpecialSwap(bot.uid, action.myPosition, action.targetUid, action.targetPosition), 500);
        }
      }

      if (state.phase === 'SPECIAL_Q' && state.specialActionUid === bot.uid) {
        bot.updateCards(engine.getBotCards(bot.uid));
        const action = bot.decideTurn(state);
        if (action.type === 'SPECIAL_PEEK_OWN') {
          setTimeout(() => engine.onSpecialPeekOwn(bot.uid, action.position), 500);
        }
      }

      if (state.phase === 'KING_CHOICE' && state.specialActionUid === bot.uid) {
        // Need king choice cards — they're not in public state, so use onKingSwap with best guess
        // or fall back to burn. The engine emits king choices to the bot's uid privately,
        // but we don't capture that. Use onKingBurn as safe fallback.
        setTimeout(() => engine.onKingBurn(bot.uid), 400 + Math.random() * 300);
      }
    }
  }, 400);
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

  // Player explicitly leaves mid-game → replace immediately with bot AND
  // mark the seat as fully abandoned so the user is NEVER auto-resumed
  // back into this game. (60s grace is only for accidental disconnects.)
  socket.on(SOCKET_EVENTS.GAME_PLAYER_LEAVE, (payload: { gameId: string }) => {
    if (!socket.uid) return;
    const engine = roomManager.getGame(payload.gameId) as GameEngine | undefined;
    if (!engine) return;
    const state = engine.getPublicState();
    if (state.phase === 'GAME_OVER') return;
    engine.replaceWithBot(socket.uid);
    const bot = new BotPlayer(socket.uid, 'medium');
    roomManager.addBotPlayer(engine.roomId, bot);
    const roomId = engine.roomId;
    roomManager.removeSocket(socket.id);
    socket.leave(roomId);
    // Cancel any pending abandon timer and abandon the seat immediately.
    cancelAbandon(roomId, socket.uid);
    const room = roomManager.getRoom(roomId);
    if (room) {
      const rp = room.players.find(p => p.uid === socket.uid);
      if (rp) rp.isBot = true;
    }
  });

  // Client-requested smart auto-play (used when AFK fast-play kicks in)
  socket.on(SOCKET_EVENTS.GAME_AUTOPLAY, (payload: { gameId: string }) => {
    if (!socket.uid) return;
    const engine = roomManager.getGame(payload.gameId) as GameEngine | undefined;
    engine?.smartAutoPlay(socket.uid);
  });

  // Player has been AFK for 2 turns → convert their slot to bot. They stay
  // in the room and see the reclaim modal so they can come back when ready.
  socket.on(SOCKET_EVENTS.GAME_BOT_TAKEOVER, (payload: { gameId: string }) => {
    if (!socket.uid) return;
    const engine = roomManager.getGame(payload.gameId) as GameEngine | undefined;
    if (!engine) return;
    if (engine.isReplacedByBot(socket.uid)) return; // already a bot
    engine.replaceWithBot(socket.uid);
    if (!roomManager.getCheckBots(engine.roomId).find(b => b.uid === socket.uid)) {
      const bot = new BotPlayer(socket.uid, 'medium');
      roomManager.addBotPlayer(engine.roomId, bot);
    }
    scheduleAbandon(engine.roomId, socket.uid);
  });

  // Player came back to find a bot in their seat — give it back to them.
  socket.on(SOCKET_EVENTS.GAME_RECLAIM_SEAT, (payload: { gameId: string }) => {
    if (!socket.uid) return;
    const engine = roomManager.getGame(payload.gameId) as GameEngine | undefined;
    if (!engine) return;
    // Join the room FIRST so we receive the broadcast that reclaimSeat emits.
    socket.join(engine.roomId);
    roomManager.trackSocket(socket.id, engine.roomId);
    if (!engine.reclaimSeat(socket.uid)) {
      // Even if reclaim is a no-op (already a human), push a fresh state so
      // the client clears any stale reclaim modal.
      socket.emit(SOCKET_EVENTS.SYSTEM_RECONNECT_STATE, (engine as any).getPublicState());
      return;
    }
    // Drop the bot stand-in so it stops auto-playing for this slot.
    const bots = roomManager.getCheckBots(engine.roomId);
    const idx = bots.findIndex(b => b.uid === socket.uid);
    if (idx !== -1) bots.splice(idx, 1);
  });

  // Reconnect: find room by socket ID (normal) or by UID (after page refresh)
  const roomId = roomManager.getRoomForSocket(socket.id) ??
    (socket.uid ? roomManager.getRoomForUid(socket.uid) : undefined);
  if (roomId && socket.uid) {
    // Within the 60s grace window — cancel the pending abandonment.
    cancelAbandon(roomId, socket.uid);
    roomManager.trackSocket(socket.id, roomId);
    socket.join(roomId);
    const engine = roomManager.getGame(roomId);
    if (engine) {
      const checkEngine = engine as GameEngine;
      if (typeof checkEngine.isReplacedByBot === 'function' && checkEngine.isReplacedByBot(socket.uid)) {
        checkEngine.reclaimSeat(socket.uid);
        const bots = roomManager.getCheckBots(roomId);
        const idx = bots.findIndex(b => b.uid === socket.uid);
        if (idx !== -1) bots.splice(idx, 1);
      }
      socket.emit(SOCKET_EVENTS.SYSTEM_RECONNECT_STATE, (engine as any).getPublicState());
    }
  }
}
