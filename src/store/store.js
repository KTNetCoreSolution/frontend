import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

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
    name: 'user-storage', // 저장소 키 이름 유지
      storage: createJSONStorage(() => sessionStorage), // localStorage -> sessionStorage로 변경
    }
  )
);

export default useStore;