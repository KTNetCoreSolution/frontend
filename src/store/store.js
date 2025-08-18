import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

const useStore = create(
  persist(
    (set) => ({
      user: null,
      menu: null,
      loading: { isLoading: false, progress: 0 },
      view: 'main',
      clientVersion: null,
      setUser: (user) => set({ user }),
      clearUser: () => set({ user: null }),
      setMenu: (menu) => set({ menu }),
      clearMenu: () => set({ menu: null }),
      setLoading: (loading) => set({ loading }),
      setView: (view) => set({ view }),
      setClientVersion: (clientVersion) => set({ clientVersion }),
    }),
    {
    name: 'user-storage', // 저장소 키 이름 유지
      storage: createJSONStorage(() => sessionStorage), // localStorage -> sessionStorage로 변경
      // partialize: (state) => ({ clientVersion: state.clientVersion }), //sessionStorage에 clientVersion 이 정보만 나오게함.
    }
  )
);

export default useStore;