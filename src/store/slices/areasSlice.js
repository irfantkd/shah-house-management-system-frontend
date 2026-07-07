import { createSlice, nanoid } from '@reduxjs/toolkit';
import { areas as initial } from '../../data/mockAreas';

const DEFAULT_FLOORS = ['Ground Floor', 'First Floor', 'Second Floor', 'Basement', 'Roof Level'];

const initialFloors = [
  ...DEFAULT_FLOORS,
  ...initial.map((a) => a.floor).filter(Boolean),
].filter((v, i, arr) => v && arr.indexOf(v) === i);

const areasSlice = createSlice({
  name: 'areas',
  initialState: { items: initial, floors: initialFloors },
  reducers: {
    addArea: (state, { payload }) => {
      state.items.push({ id: `ar-${nanoid(6)}`, assets: [], photos: [], ...payload });
    },
    updateArea: (state, { payload }) => {
      const i = state.items.findIndex((a) => a.id === payload.id);
      if (i !== -1) state.items[i] = { ...state.items[i], ...payload };
    },
    deleteArea: (state, { payload }) => {
      state.items = state.items.filter((a) => a.id !== payload);
    },
    addFloor: (state, { payload }) => {
      const name = (payload ?? '').trim();
      if (name && !state.floors.includes(name)) state.floors.push(name);
    },
    removeFloor: (state, { payload }) => {
      state.floors = state.floors.filter((f) => f !== payload);
    },
    renameFloor: (state, { payload: { oldName, newName } }) => {
      const idx = state.floors.indexOf(oldName);
      if (idx !== -1) {
        state.floors[idx] = newName;
        state.items.forEach((a) => { if (a.floor === oldName) a.floor = newName; });
      }
    },
  },
});

export const { addArea, updateArea, deleteArea, addFloor, removeFloor, renameFloor } = areasSlice.actions;

const pid = (s) => s.properties?.currentId ?? 'prop-default';

export const selectAreas    = (s) => (s.areas.items ?? []).filter((a) => (a.propertyId || 'prop-default') === pid(s));
export const selectFloors   = (s) => s.areas.floors  ?? [];
export const selectAreaById = (id) => (s) => (s.areas.items ?? []).find((a) => a.id === id);
export default areasSlice.reducer;
