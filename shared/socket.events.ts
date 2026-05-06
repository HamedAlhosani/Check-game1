export const SOCKET_EVENTS = {
  // Auth
  AUTH_TOKEN: 'auth:token',

  // Ludo - Client → Server
  LUDO_ROLL_DICE: 'ludo:roll_dice',
  LUDO_MOVE_PIECE: 'ludo:move_piece',
  LUDO_SKIP_TURN: 'ludo:skip_turn',

  // Ludo - Server → Client
  LUDO_STATE: 'ludo:state',
  LUDO_DICE_ROLLED: 'ludo:dice_rolled',
  LUDO_PIECE_MOVED: 'ludo:piece_moved',
  LUDO_TURN_START: 'ludo:turn_start',
  LUDO_GAME_OVER: 'ludo:game_over',
  LUDO_INVALID_MOVE: 'ludo:invalid_move',

  // Domino - Client → Server
  DOMINO_PLAY_TILE: 'domino:play_tile',
  DOMINO_DRAW_TILE: 'domino:draw_tile',
  DOMINO_PASS: 'domino:pass',

  // Domino - Server → Client
  DOMINO_STATE: 'domino:state',
  DOMINO_TILE_PLAYED: 'domino:tile_played',
  DOMINO_TILE_DRAWN: 'domino:tile_drawn',
  DOMINO_TILE_DRAWN_PRIVATE: 'domino:tile_drawn_private',
  DOMINO_TURN_START: 'domino:turn_start',
  DOMINO_PLAYER_PASSED: 'domino:player_passed',
  DOMINO_ROUND_OVER: 'domino:round_over',
  DOMINO_GAME_OVER: 'domino:game_over',
  DOMINO_BLOCKED: 'domino:blocked',

  // Jackaro - Client → Server
  JACKARO_DRAW: 'jackaro:draw',
  JACKARO_DISCARD: 'jackaro:discard',
  JACKARO_MELD: 'jackaro:meld',
  JACKARO_EXTEND_MELD: 'jackaro:extend_meld',
  JACKARO_KNOCK: 'jackaro:knock',

  // Jackaro - Server → Client
  JACKARO_STATE: 'jackaro:state',
  JACKARO_CARD_DRAWN: 'jackaro:card_drawn',
  JACKARO_CARD_DISCARDED: 'jackaro:card_discarded',
  JACKARO_MELD_PLACED: 'jackaro:meld_placed',
  JACKARO_MELD_EXTENDED: 'jackaro:meld_extended',
  JACKARO_KNOCKED: 'jackaro:knocked',
  JACKARO_ROUND_OVER: 'jackaro:round_over',
  JACKARO_GAME_OVER: 'jackaro:game_over',
  JACKARO_INVALID_ACTION: 'jackaro:invalid_action',

  // Lobby - Client → Server
  LOBBY_CREATE_ROOM: 'lobby:create_room',
  LOBBY_JOIN_ROOM: 'lobby:join_room',
  LOBBY_JOIN_PRIVATE: 'lobby:join_private',
  LOBBY_LEAVE_ROOM: 'lobby:leave_room',
  LOBBY_PLAYER_READY: 'lobby:player_ready',
  LOBBY_START_GAME: 'lobby:start_game',
  LOBBY_ADD_BOT: 'lobby:add_bot',
  LOBBY_REMOVE_BOT: 'lobby:remove_bot',
  LOBBY_KICK_PLAYER: 'lobby:kick_player',
  LOBBY_INVITE_FRIEND: 'lobby:invite_friend',
  GAME_PLAYER_LEAVE: 'game:player_leave',
  GAME_RECLAIM_SEAT: 'game:reclaim_seat',
  GAME_AUTOPLAY: 'game:autoplay',
  GAME_BOT_TAKEOVER: 'game:bot_takeover',

  // Lobby - Server → Client
  LOBBY_ROOM_LIST: 'lobby:room_list',
  LOBBY_ROOM_UPDATED: 'lobby:room_updated',
  LOBBY_GAME_STARTING: 'lobby:game_starting',
  LOBBY_ERROR: 'lobby:error',
  LOBBY_KICKED: 'lobby:kicked',
  LOBBY_INVITE_RECEIVED: 'lobby:invite_received',

  // Friends - Server → Client
  FRIEND_REQUEST_RECEIVED: 'friend:request_received',
  FRIEND_LIST_CHANGED: 'friend:list_changed',

  // Game - Client → Server
  GAME_PEEK_COMPLETE: 'game:peek_complete',
  GAME_DRAW_DECK: 'game:draw_deck',
  GAME_BURN_DRAWN: 'game:burn_drawn',
  GAME_SWAP_DRAWN: 'game:swap_drawn',
  GAME_BURN_DISCARD: 'game:burn_discard',
  GAME_CALL_CHECK: 'game:call_check',
  GAME_SPECIAL_SWAP: 'game:special_swap',
  GAME_SPECIAL_PEEK_OWN: 'game:special_peek_own',
  GAME_KING_SWAP: 'game:king_swap',
  GAME_KING_BURN: 'game:king_burn',
  GAME_KING_USE_SPECIAL: 'game:king_use_special',
  GAME_BURN_ATTEMPT: 'game:burn_attempt',
  GAME_TAKE_DISCARD: 'game:take_discard',

  // Game - Server → Client
  GAME_STATE: 'game:state',
  GAME_PHASE_CHANGE: 'game:phase_change',
  GAME_TURN_START: 'game:turn_start',
  GAME_CARD_DRAWN: 'game:card_drawn',
  GAME_CARD_DISCARDED: 'game:card_discarded',
  GAME_CARD_BURNED: 'game:card_burned',
  GAME_BURN_INVALID: 'game:burn_invalid',
  GAME_KING_CHOICE: 'game:king_choice',
  GAME_SWAP_EXECUTED: 'game:swap_executed',
  GAME_CHECK_CALLED: 'game:check_called',
  GAME_PEEK_OWN: 'game:peek_own',
  GAME_REVEAL_ALL: 'game:reveal_all',
  GAME_SCORES: 'game:scores',
  GAME_ELIMINATION: 'game:elimination',
  GAME_OVER: 'game:over',
  GAME_ERROR: 'game:error',
  GAME_EPIC_MOMENT: 'game:epic_moment',
  GAME_DECK_RESHUFFLED: 'game:deck_reshuffled',

  // Chat
  CHAT_SEND: 'chat:send',
  CHAT_MESSAGE: 'chat:message',

  // Tournaments — Client → Server
  TOURNAMENT_CREATE:     'tournament:create',
  TOURNAMENT_JOIN:       'tournament:join',
  TOURNAMENT_JOIN_CODE:  'tournament:join_code',
  TOURNAMENT_START:      'tournament:start',
  TOURNAMENT_FILL_BOTS:  'tournament:fill_bots',
  TOURNAMENT_NEXT_MATCH: 'tournament:next_match',
  TOURNAMENT_LEAVE:      'tournament:leave',
  TOURNAMENT_SUBSCRIBE:  'tournament:subscribe',
  TOURNAMENT_LIST_REQUEST: 'tournament:list_request',
  // Tournaments — Server → Client
  TOURNAMENT_STATE:        'tournament:state',
  TOURNAMENT_LIST:         'tournament:list',
  TOURNAMENT_MATCH_START:  'tournament:match_start',
  TOURNAMENT_FINISHED:     'tournament:finished',
  TOURNAMENT_ERROR:        'tournament:error',

  // System
  SYSTEM_RECONNECT_STATE: 'system:reconnect_state',
} as const;

export type SocketEventName = (typeof SOCKET_EVENTS)[keyof typeof SOCKET_EVENTS];

// Payload types
export interface CreateRoomPayload {
  name: string;
  type: 'public' | 'private';
  botCount: number;
  botDifficulty: 'easy' | 'medium' | 'hard';
  gameType: import('./game.types').GameType;
  maxPlayers?: number;
  gameMode?: import('./game.types').GameMode;
}

export interface SwapDrawnPayload {
  gameId: string;
  cardPosition: number;
}

export interface BurnDiscardPayload {
  gameId: string;
  cardPosition: number;
}

export interface SpecialSwapPayload {
  gameId: string;
  myPosition: number;
  targetUid: string;
  targetPosition: number;
}

export interface SpecialPeekOwnPayload {
  gameId: string;
  cardPosition: number;
}

export interface BurnAttemptPayload {
  gameId: string;
  cardPosition: number;
}

export interface TakeDiscardPayload {
  gameId: string;
  handPosition: number;
}

export interface ChatSendPayload {
  roomId: string;
  text: string;
  emoji?: string;
}

export interface ScoresPayload {
  roundNumber: number;
  scores: { [uid: string]: number };
  cumulative: { [uid: string]: number };
  checkPenalty: boolean;
  checkCallerId: string;
  lowestUid: string | null;
}
