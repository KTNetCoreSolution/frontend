import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useStore = create(
  persist(
    (set) => ({
      user: null,
      menu: null,
      loading: false,
      setUser: (user) => set({ user }),
      clearUser: () => set({ user: null }),
      setMenu: (menu) => set({ menu }),
      clearMenu: () => set({ menu: null }),
      setLoading: (loading) => set({ loading }),
    }),
    {
      name: 'user-storage',
      getStorage: () => (typeof window !== 'undefined' ? sessionStorage : undefined),
    }
  )
);

export default useStore;