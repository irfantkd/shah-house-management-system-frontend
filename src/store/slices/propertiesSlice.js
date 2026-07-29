import { createSlice } from '@reduxjs/toolkit';

const propertiesSlice = createSlice({
  name: 'properties',
  initialState: { items: [], currentId: null, status: 'idle' },
  reducers: {
    setProperties(state, { payload }) {
      state.items  = payload ?? [];
      state.status = 'succeeded';
      const stillExists = state.items.some((p) => p.id === state.currentId);
      if (!stillExists && state.items.length > 0) state.currentId = state.items[0].id;
    },
    setCurrentProperty(state, { payload }) {
      if (state.items.find((p) => p.id === payload)) state.currentId = payload;
    },
  },
});

export const { setProperties, setCurrentProperty } = propertiesSlice.actions;

export const selectProperties        = (s) => s.properties?.items ?? [];
export const selectPropertiesStatus  = (s) => s.properties?.status ?? 'idle';
export const selectCurrentPropertyId = (s) => s.properties?.currentId ?? null;
export const selectCurrentProperty   = (s) => {
  const id = s.properties?.currentId;
  return id ? (s.properties?.items ?? []).find((p) => p.id === id) ?? null : null;
};

export default propertiesSlice.reducer;
