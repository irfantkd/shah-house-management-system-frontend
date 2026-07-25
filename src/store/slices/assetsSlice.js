import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

export const fetchAssets = createAsyncThunk('assets/fetchAll', async (params) => {
  const { data } = await api.get('/assets', { params });
  return data.data;
});

export const addAsset = createAsyncThunk('assets/add', async (payload, { getState }) => {
  const pid = getState().properties?.currentId;
  const { data } = await api.post('/assets', { ...payload, propertyId: pid });
  return data.data;
});

export const updateAsset = createAsyncThunk('assets/update', async ({ id, ...payload }) => {
  const { data } = await api.put(`/assets/${id}`, payload);
  return data.data;
});

export const deleteAsset = createAsyncThunk('assets/delete', async (id) => {
  await api.delete(`/assets/${id}`);
  return id;
});

const assetsSlice = createSlice({
  name: 'assets',
  initialState: { items: [], status: 'idle' },
  reducers: {},
  extraReducers: (b) => {
    b.addCase(fetchAssets.fulfilled, (state, { payload }) => { state.items = payload; })
     .addCase(addAsset.fulfilled,    (state, { payload }) => { state.items.push(payload); })
     .addCase(updateAsset.fulfilled, (state, { payload }) => {
       const i = state.items.findIndex((a) => a.id === payload.id);
       if (i !== -1) state.items[i] = payload;
     })
     .addCase(deleteAsset.fulfilled, (state, { payload: id }) => {
       state.items = state.items.filter((a) => a.id !== id);
     });
  },
});

const pid = (s) => s.properties?.currentId;
export const selectAssets    = (s) => (s.assets.items ?? []).filter((a) => a.propertyId === pid(s));
export const selectAssetById = (id) => (s) => (s.assets.items ?? []).find((a) => a.id === id);
export default assetsSlice.reducer;
