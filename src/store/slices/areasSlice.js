import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

export const fetchAreas = createAsyncThunk('areas/fetchAll', async (params) => {
  const { data } = await api.get('/areas', { params });
  return data.data;
});

export const addArea = createAsyncThunk('areas/add', async (payload, { getState }) => {
  const pid = getState().properties?.currentId;
  const { data } = await api.post('/areas', { ...payload, propertyId: pid });
  return data.data;
});

export const updateArea = createAsyncThunk('areas/update', async ({ id, ...payload }) => {
  const { data } = await api.put(`/areas/${id}`, payload);
  return data.data;
});

export const deleteArea = createAsyncThunk('areas/delete', async (id) => {
  await api.delete(`/areas/${id}`);
  return id;
});

export const addFloor = createAsyncThunk('areas/addFloor', async ({ propertyId, name }) => {
  const { data } = await api.post(`/properties/${propertyId}/floors`, { name });
  return { propertyId, floors: data.data.floors };
});

export const removeFloor = createAsyncThunk('areas/removeFloor', async ({ propertyId, name }) => {
  await api.delete(`/properties/${propertyId}/floors/${encodeURIComponent(name)}`);
  return { name };
});

export const renameFloor = createAsyncThunk('areas/renameFloor', async ({ propertyId, oldName, newName }) => {
  await api.patch(`/properties/${propertyId}/floors/${encodeURIComponent(oldName)}`, { newName });
  return { oldName, newName };
});

const areasSlice = createSlice({
  name: 'areas',
  initialState: { items: [], floors: [], status: 'idle' },
  reducers: {},
  extraReducers: (b) => {
    b.addCase(fetchAreas.fulfilled, (state, { payload }) => {
      state.items = payload;
      const fromAreas = payload.map((a) => a.floor).filter(Boolean);
      const merged = [...new Set([...state.floors, ...fromAreas])];
      state.floors = merged;
    })
    .addCase(addArea.fulfilled, (state, { payload }) => {
      state.items.push(payload);
    })
    .addCase(updateArea.fulfilled, (state, { payload }) => {
      const i = state.items.findIndex((a) => a.id === payload.id);
      if (i !== -1) state.items[i] = payload;
    })
    .addCase(deleteArea.fulfilled, (state, { payload: id }) => {
      state.items = state.items.filter((a) => a.id !== id);
    })
    .addCase(addFloor.fulfilled, (state, { payload }) => {
      if (payload.floors) state.floors = payload.floors;
    })
    .addCase(removeFloor.fulfilled, (state, { payload }) => {
      state.floors = state.floors.filter((f) => f !== payload.name);
    })
    .addCase(renameFloor.fulfilled, (state, { payload }) => {
      const idx = state.floors.indexOf(payload.oldName);
      if (idx !== -1) state.floors[idx] = payload.newName;
      state.items.forEach((a) => { if (a.floor === payload.oldName) a.floor = payload.newName; });
    });
  },
});

const pid = (s) => s.properties?.currentId;
export const selectAreas    = (s) => (s.areas.items ?? []).filter((a) => a.propertyId === pid(s));
export const selectFloors   = (s) => s.areas.floors ?? [];
export const selectAreaById = (id) => (s) => (s.areas.items ?? []).find((a) => a.id === id);
export default areasSlice.reducer;
