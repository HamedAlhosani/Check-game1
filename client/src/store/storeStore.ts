import { create } from 'zustand';
import { StoreItem } from '@check-game/shared';
import { apiClient } from '../services/api.service';
import { useAuthStore } from './authStore';
import { UserProfile } from '@check-game/shared';

interface StoreState {
  items: StoreItem[];
  loading: boolean;
  fetchItems: () => Promise<void>;
  purchase: (itemId: string) => Promise<void>;
  equip: (itemId: string) => Promise<void>;
}

export const useStoreStore = create<StoreState>((set) => ({
  items: [],
  loading: false,

  fetchItems: async () => {
    set({ loading: true });
    try {
      const items = await apiClient.get<StoreItem[]>('/api/store/items');
      set({ items });
    } finally {
      set({ loading: false });
    }
  },

  purchase: async (itemId: string) => {
    const res = await apiClient.post<{ ok: boolean; profile: UserProfile }>('/api/store/purchase', { itemId });
    useAuthStore.getState().setProfile(res.profile);
  },

  equip: async (itemId: string) => {
    const res = await apiClient.patch<{ ok: boolean; profile: UserProfile }>('/api/store/equip', { itemId });
    useAuthStore.getState().setProfile(res.profile);
  },
}));
