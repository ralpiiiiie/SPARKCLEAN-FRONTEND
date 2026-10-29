import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  type CustomTask,
  type FilterState,
  type SettingsState,
  type TaskStatus,
  type ThemeState,
} from '../types';

interface TaskState {
  statuses: Record<string, TaskStatus>;
  custom: CustomTask[];
}

interface AppStore {
  filters: FilterState;
  theme: ThemeState;
  settings: SettingsState;
  tasks: TaskState;
  setFilters: (filters: Partial<FilterState>) => void;
  setTheme: (theme: ThemeState) => void;
  updateSettings: (settings: Partial<SettingsState>) => void;
  resetFilters: () => void;
  setTaskStatus: (id: string, status: TaskStatus) => void;
  addCustomTask: (task: CustomTask) => void;
  updateCustomTask: (
    id: string,
    patch: Partial<Omit<CustomTask, 'id' | 'createdAt'>>,
  ) => void;
  deleteCustomTask: (id: string) => void;
}

const defaultFilters: FilterState = {
  dateRange: { start: '2023-01-01', end: '2024-12-31' },
  branch: 'all',
  service: 'all',
};

const defaultSettings: SettingsState = {
  rushCostPerLoad: 150,
  storageCostPerLoad: 75,
  currency: '₱',
  units: 'loads',
};

const defaultTasks: TaskState = {
  statuses: {},
  custom: [],
};

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      filters: defaultFilters,
      theme: 'light',
      settings: defaultSettings,
      tasks: defaultTasks,

      setFilters: (filters) => set((state) => ({
        filters: { ...state.filters, ...filters }
      })),

      setTheme: (theme) => set({ theme }),

      updateSettings: (settings) => set((state) => ({
        settings: { ...state.settings, ...settings }
      })),

      resetFilters: () => set({ filters: defaultFilters }),

      setTaskStatus: (id, status) => set((state) => ({
        tasks: {
          ...state.tasks,
          statuses: { ...state.tasks.statuses, [id]: status },
        },
      })),

      addCustomTask: (task) => set((state) => ({
        tasks: {
          ...state.tasks,
          custom: [task, ...state.tasks.custom],
        },
      })),

      updateCustomTask: (id, patch) => set((state) => ({
        tasks: {
          ...state.tasks,
          custom: state.tasks.custom.map((task) =>
            task.id === id ? { ...task, ...patch } : task,
          ),
        },
      })),

      deleteCustomTask: (id) => set((state) => ({
        tasks: {
          ...state.tasks,
          custom: state.tasks.custom.filter((task) => task.id !== id),
          statuses: Object.fromEntries(
            Object.entries(state.tasks.statuses).filter(([key]) => key !== id),
          ),
        },
      })),
    }),
    {
      name: 'spark-clean-store',
    }
  )
);
