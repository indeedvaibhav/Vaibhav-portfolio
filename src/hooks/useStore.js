import { create } from 'zustand';

const useStore = create((set) => ({
  // ── Loading ──
  phase: 'loading', // 'loading' | 'idle'
  setPhase: (phase) => set({ phase }),

  // ── Active asteroid (in-focus via scroll) ──
  activeIndex: -1,        // -1 = none, 0-6 = asteroid index
  activeOpacity: 0,       // 0-1, for caption fade
  setActive: (index, opacity) => set({ activeIndex: index, activeOpacity: opacity }),

  // ── Detail panel (click-to-expand) ──
  expandedIndex: -1,      // -1 = closed, 0-6 = showing detail panel
  setExpandedIndex: (i) => set({ expandedIndex: i }),

  // ── Scroll tracking ──
  hasScrolled: false,
  markScrolled: () => set({ hasScrolled: true }),

  // ── Audio ──
  isMuted: true,
  toggleMute: () => set((s) => ({ isMuted: !s.isMuted })),
}));

export default useStore;
