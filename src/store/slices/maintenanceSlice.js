import { createSlice, nanoid } from '@reduxjs/toolkit';
import { maintenanceItems as initial } from '../../data/mockMaintenance';

const maintenanceSlice = createSlice({
  name: 'maintenance',
  initialState: { items: initial },
  reducers: {
    addMaintenance: (state, { payload }) => {
      state.items.push({
        id: `mt-${nanoid(6)}`,
        status: 'scheduled',
        completedDate: null,
        contractId: null,
        ...payload,
      });
    },
    updateMaintenance: (state, { payload }) => {
      const i = state.items.findIndex((m) => m.id === payload.id);
      if (i !== -1) state.items[i] = { ...state.items[i], ...payload };
    },
    deleteMaintenance: (state, { payload }) => {
      state.items = state.items.filter((m) => m.id !== payload);
    },
    markCompleted: (state, { payload }) => {
      const i = state.items.findIndex((m) => m.id === payload);
      if (i !== -1) {
        state.items[i].status = 'completed';
        state.items[i].completedDate = new Date().toISOString().split('T')[0];
      }
    },
  },
});

export const { addMaintenance, updateMaintenance, deleteMaintenance, markCompleted } = maintenanceSlice.actions;
export const selectMaintenance = (s) => s.maintenance.items;
export default maintenanceSlice.reducer;
