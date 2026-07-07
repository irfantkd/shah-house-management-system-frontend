import { createSlice, nanoid } from '@reduxjs/toolkit';
import { repairs as initial } from '../../data/mockRepairs';

const repairsSlice = createSlice({
  name: 'repairs',
  initialState: { items: initial },
  reducers: {
    addRepair: (state, { payload }) => {
      state.items.push({
        id: `rp-${nanoid(6)}`,
        status: 'reported',
        completedDate: null,
        actualCost: null,
        reportedDate: new Date().toISOString().split('T')[0],
        ...payload,
      });
    },
    updateRepair: (state, { payload }) => {
      const i = state.items.findIndex((r) => r.id === payload.id);
      if (i !== -1) state.items[i] = { ...state.items[i], ...payload };
    },
    deleteRepair: (state, { payload }) => {
      state.items = state.items.filter((r) => r.id !== payload);
    },
    updateRepairStatus: (state, { payload: { id, status } }) => {
      const i = state.items.findIndex((r) => r.id === id);
      if (i !== -1) {
        state.items[i].status = status;
        if (status === 'completed') state.items[i].completedDate = new Date().toISOString().split('T')[0];
      }
    },
  },
});

export const { addRepair, updateRepair, deleteRepair, updateRepairStatus } = repairsSlice.actions;

const pid = (s) => s.properties?.currentId ?? 'prop-default';
export const selectRepairs = (s) => (s.repairs.items ?? []).filter((r) => (r.propertyId || 'prop-default') === pid(s));

export default repairsSlice.reducer;
