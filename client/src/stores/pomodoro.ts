import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type PomodoroMode = 'work' | 'shortBreak' | 'longBreak';

interface PomodoroState {
  isMinimized: boolean;
  currentMode: PomodoroMode;
  timeRemaining: number;
  isRunning: boolean;
  sessionCount: number;
  selectedSubjectId: string | null;

  // Actions
  toggleMinimized: () => void;
  start: () => void;
  pause: () => void;
  reset: () => void;
  setSubject: (subjectId: string | null) => void;
  tick: () => void;
  nextSession: () => void;
}

const DURATIONS = {
  work: 25 * 60,
  shortBreak: 5 * 60,
  longBreak: 15 * 60,
};

export const usePomodoroStore = create<PomodoroState>()(
  persist(
    (set, get) => ({
      isMinimized: false,
      currentMode: 'work',
      timeRemaining: DURATIONS.work,
      isRunning: false,
      sessionCount: 0,
      selectedSubjectId: null,

      toggleMinimized: () =>
        set((state) => ({ isMinimized: !state.isMinimized })),

      start: () => set({ isRunning: true }),

      pause: () => set({ isRunning: false }),

      reset: () =>
        set((state) => ({
          timeRemaining: DURATIONS[state.currentMode],
          isRunning: false,
        })),

      setSubject: (selectedSubjectId) => set({ selectedSubjectId }),

      tick: () =>
        set((state) => {
          if (state.timeRemaining > 0) {
            return { timeRemaining: state.timeRemaining - 1 };
          } else {
            // Session ended
            get().nextSession();
            return { timeRemaining: DURATIONS[get().currentMode] };
          }
        }),

      nextSession: () =>
        set((state) => {
          if (state.currentMode === 'work') {
            // Log the session
            const newSessionCount = state.sessionCount + 1;
            if (newSessionCount % 4 === 0) {
              return {
                currentMode: 'longBreak',
                timeRemaining: DURATIONS.longBreak,
                sessionCount: newSessionCount,
                isRunning: false,
              };
            } else {
              return {
                currentMode: 'shortBreak',
                timeRemaining: DURATIONS.shortBreak,
                sessionCount: newSessionCount,
                isRunning: false,
              };
            }
          } else {
            // Break ended, back to work
            return {
              currentMode: 'work',
              timeRemaining: DURATIONS.work,
              isRunning: false,
            };
          }
        }),
    }),
    {
      name: 'pomodoro-storage',
      partialize: (state) => ({
        isMinimized: state.isMinimized,
        currentMode: state.currentMode,
        timeRemaining: state.timeRemaining,
        isRunning: state.isRunning,
        sessionCount: state.sessionCount,
        selectedSubjectId: state.selectedSubjectId,
      }),
    }
  )
);