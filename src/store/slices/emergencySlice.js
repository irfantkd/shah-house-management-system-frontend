import { createSlice, nanoid } from '@reduxjs/toolkit';
import { emergencyContacts as initial } from '../../data/mockEmergency';

const emergencySlice = createSlice({
  name: 'emergency',
  initialState: { items: initial },
  reducers: {
    addContact: (state, { payload }) => {
      state.items.push({
        id: `ec-${nanoid(6)}`,
        avatar: 'bg-navy-700',
        ...payload,
      });
    },
    updateContact: (state, { payload }) => {
      const i = state.items.findIndex((c) => c.id === payload.id);
      if (i !== -1) state.items[i] = { ...state.items[i], ...payload };
    },
    deleteContact: (state, { payload }) => {
      state.items = state.items.filter((c) => c.id !== payload);
    },
  },
});

export const { addContact, updateContact, deleteContact } = emergencySlice.actions;

const pid = (s) => s.properties?.currentId ?? 'prop-default';
export const selectEmergency = (s) => (s.emergency.items ?? []).filter((c) => (c.propertyId || 'prop-default') === pid(s));

export default emergencySlice.reducer;
