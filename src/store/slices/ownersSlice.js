import { createSlice } from '@reduxjs/toolkit';
import { mockOwners } from '../../data/mockOwners';

const ownersSlice = createSlice({
  name: 'owners',
  initialState: { items: mockOwners },
  reducers: {
    addOwner: (state, { payload }) => {
      state.items.push({ id: `own-${Date.now()}`, notes: '', ...payload });
    },
    updateOwner: (state, { payload }) => {
      const i = state.items.findIndex((o) => o.id === payload.id);
      if (i !== -1) state.items[i] = { ...state.items[i], ...payload };
    },
    deleteOwner: (state, { payload }) => {
      state.items = state.items.filter((o) => o.id !== payload);
    },
  },
});

export const { addOwner, updateOwner, deleteOwner } = ownersSlice.actions;

const pid = (s) => s.properties?.currentId ?? 'prop-default';

export const selectOwners = (s) => (s.owners.items ?? []).filter((o) => (o.propertyId || 'prop-default') === pid(s));

export const selectOwnerBirthdays = (s) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return (s.owners.items ?? [])
    .filter((o) => o.dateOfBirth && (o.propertyId || 'prop-default') === pid(s))
    .map((o) => {
      const dob  = new Date(o.dateOfBirth);
      const yr   = today.getFullYear();
      let next   = new Date(yr, dob.getMonth(), dob.getDate());
      if (next < today) next = new Date(yr + 1, dob.getMonth(), dob.getDate());
      const days = Math.round((next - today) / 86_400_000);
      return { ...o, daysUntilBirthday: days, nextBirthday: next.toISOString().split('T')[0] };
    })
    .filter((o) => o.daysUntilBirthday <= 7)
    .sort((a, b) => a.daysUntilBirthday - b.daysUntilBirthday);
};

export default ownersSlice.reducer;
