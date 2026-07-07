import { createSlice, nanoid } from '@reduxjs/toolkit';
import { maintenanceItems as initial } from '../../data/mockMaintenance';

const today = () => new Date().toISOString().split('T')[0];

const maintenanceSlice = createSlice({
  name: 'maintenance',
  initialState: { items: initial },
  reducers: {
    addMaintenance: (state, { payload }) => {
      state.items.push({
        id: `mt-${nanoid(6)}`,
        status: 'scheduled',
        completedDate: null,
        actualCost: null,
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
    // Legacy — kept for backward compat
    markCompleted: (state, { payload }) => {
      const i = state.items.findIndex((m) => m.id === payload);
      if (i !== -1) {
        state.items[i].status = 'completed';
        state.items[i].completedDate = today();
      }
    },
    // Full status control: set any status + optional completion fields
    setMaintenanceStatus: (state, { payload: { id, status, completedDate, actualCost, completionNotes } }) => {
      const i = state.items.findIndex((m) => m.id === id);
      if (i === -1) return;
      state.items[i].status = status;
      if (status === 'completed') {
        state.items[i].completedDate = completedDate ?? today();
        if (actualCost !== undefined && actualCost !== null) state.items[i].actualCost = actualCost;
        if (completionNotes) state.items[i].completionNotes = completionNotes;
      } else {
        // Reset completion fields when moving back
        if (status !== 'completed') state.items[i].completedDate = null;
      }
    },
    // Auto-mark scheduled tasks whose date has passed as overdue
    autoMarkOverdue: (state) => {
      const todayStr = today();
      state.items.forEach((m, i) => {
        if (m.status === 'scheduled' && m.scheduledDate < todayStr) {
          state.items[i].status = 'overdue';
        }
      });
    },
  },
});

export const {
  addMaintenance, updateMaintenance, deleteMaintenance,
  markCompleted, setMaintenanceStatus, autoMarkOverdue,
} = maintenanceSlice.actions;

const pid = (s) => s.properties?.currentId ?? 'prop-default';
export const selectMaintenance = (s) => (s.maintenance.items ?? []).filter((m) => (m.propertyId || 'prop-default') === pid(s));

export default maintenanceSlice.reducer;
