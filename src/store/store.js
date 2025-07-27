import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useStore = create(
  persist(
    (set) => ({
      user: null,
      menu: null,
      loading: { isLoading: false, progress: 0 },
      view: 'main',
      setUser: (user) => set({ user }),
      clearUser: () => set({ user: null }),
      setMenu: (menu) => set({ menu }),
      clearMenu: () => set({ menu: null }),
      setLoading: (loading) => set({ loading }),
      setView: (view) => set({ view }),
    }),
    {
      name: 'user-storage',
      getStorage: () => (typeof window !== 'undefined' ? sessionStorage : undefined),
    }
  )
);

export default useStore;