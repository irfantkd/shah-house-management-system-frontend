import { createSlice, nanoid } from '@reduxjs/toolkit';
import { tasks as initial, defaultCategories } from '../../data/mockTasks';

const today = () => new Date().toISOString().split('T')[0];

const tasksSlice = createSlice({
  name: 'tasks',
  initialState: { items: initial, categories: defaultCategories },
  reducers: {
    addTask: (state, { payload }) => {
      state.items.push({
        id: `tk-${nanoid(6)}`,
        status: 'scheduled',
        completedDate: null,
        actualCost: null,
        contractId: null,
        notes: '',
        completionNotes: '',
        ...payload,
      });
    },
    updateTask: (state, { payload }) => {
      const i = state.items.findIndex((t) => t.id === payload.id);
      if (i !== -1) state.items[i] = { ...state.items[i], ...payload };
    },
    deleteTask: (state, { payload }) => {
      state.items = state.items.filter((t) => t.id !== payload);
    },
    setTaskStatus: (state, { payload: { id, status, completedDate, actualCost, completionNotes } }) => {
      const i = state.items.findIndex((t) => t.id === id);
      if (i === -1) return;
      state.items[i].status = status;
      if (status === 'completed') {
        state.items[i].completedDate = completedDate ?? today();
        if (actualCost !== undefined && actualCost !== null) state.items[i].actualCost = actualCost;
        if (completionNotes) state.items[i].completionNotes = completionNotes;
      } else {
        state.items[i].completedDate = null;
      }
    },
    autoMarkOverdue: (state) => {
      const todayStr = today();
      state.items.forEach((t, i) => {
        if (t.status === 'scheduled' && t.scheduledDate && t.scheduledDate < todayStr) {
          state.items[i].status = 'overdue';
        }
      });
    },
    addCategory: (state, { payload }) => {
      if (payload && !state.categories.includes(payload)) {
        state.categories.push(payload);
      }
    },
    deleteCategory: (state, { payload }) => {
      if (payload !== 'Maintenance' && payload !== 'Repair') {
        state.categories = state.categories.filter((c) => c !== payload);
      }
    },
  },
});

export const {
  addTask, updateTask, deleteTask, setTaskStatus, autoMarkOverdue, addCategory, deleteCategory,
} = tasksSlice.actions;

const pid = (s) => s.properties?.currentId ?? 'prop-default';
export const selectTasks       = (s) => (s.tasks?.items ?? []).filter((t) => (t.propertyId || 'prop-default') === pid(s));
export const selectCategories  = (s) => s.tasks?.categories ?? ['Maintenance', 'Repair'];

export default tasksSlice.reducer;
