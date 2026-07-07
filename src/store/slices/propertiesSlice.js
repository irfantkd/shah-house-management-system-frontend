import { createSlice, nanoid } from '@reduxjs/toolkit';

export const DEFAULT_PROPERTY_ID = 'prop-default';

const propertiesSlice = createSlice({
  name: 'properties',
  initialState: {
    items: [
      {
        id: DEFAULT_PROPERTY_ID,
        name: 'Shah Villa',
        type: 'Villa',
        location: 'Palm Jumeirah, Dubai',
        emoji: '🏛️',
        color: '#0b1d3a',
        createdAt: '2024-01-01',
      },
    ],
    currentId: DEFAULT_PROPERTY_ID,
  },
  reducers: {
    addProperty: (state, { payload }) => {
      const id = `prop-${nanoid(6)}`;
      state.items.push({
        createdAt: new Date().toISOString().split('T')[0],
        emoji: '🏠',
        color: '#0b1d3a',
        ...payload,
        id,
      });
      // Auto-switch to the new property
      state.currentId = id;
    },
    updateProperty: (state, { payload }) => {
      const i = state.items.findIndex((p) => p.id === payload.id);
      if (i !== -1) state.items[i] = { ...state.items[i], ...payload };
    },
    deleteProperty: (state, { payload }) => {
      if (state.items.length <= 1) return;
      state.items = state.items.filter((p) => p.id !== payload);
      if (state.currentId === payload) state.currentId = state.items[0].id;
    },
    setCurrentProperty: (state, { payload }) => {
      if (state.items.find((p) => p.id === payload)) state.currentId = payload;
    },
  },
});

export const { addProperty, updateProperty, deleteProperty, setCurrentProperty } = propertiesSlice.actions;

export const selectProperties        = (s) => s.properties?.items ?? [];
export const selectCurrentPropertyId = (s) => s.properties?.currentId ?? DEFAULT_PROPERTY_ID;
export const selectCurrentProperty   = (s) => {
  const id = s.properties?.currentId ?? DEFAULT_PROPERTY_ID;
  return (s.properties?.items ?? []).find((p) => p.id === id) ?? null;
};

export default propertiesSlice.reducer;
