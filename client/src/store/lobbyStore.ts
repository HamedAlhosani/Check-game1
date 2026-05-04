import { create } from 'zustand';
import { RoomState, GameType } from '@check-game/shared';

interface LobbyStore {
  rooms: RoomState[];
  currentRoom: RoomState | null;
  currentGameType: GameType;
  setRooms: (rooms: RoomState[]) => void;
  setCurrentRoom: (room: RoomState | null) => void;
  setCurrentGameType: (t: GameType) => void;
}

export const useLobbyStore = create<LobbyStore>((set) => ({
  rooms: [],
  currentRoom: null,
  currentGameType: 'check',
  setRooms: (rooms) => set({ rooms }),
  setCurrentRoom: (currentRoom) => set({ currentRoom }),
  setCurrentGameType: (currentGameType) => set({ currentGameType }),
}));
