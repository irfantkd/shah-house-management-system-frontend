import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

export const fetchLetterheads = createAsyncThunk('letterheads/fetchAll', async (params) => {
  const { data } = await api.get('/letterheads', { params });
  return data.data;
});

export const saveLetterhead = createAsyncThunk('letterheads/save', async (payload) => {
  const { data } = await api.post('/letterheads', payload);
  return data.data;
});

export const updateLetterhead = createAsyncThunk('letterheads/update', async ({ id, ...payload }) => {
  const { data } = await api.put(`/letterheads/${id}`, payload);
  return data.data;
});

export const deleteLetterhead = createAsyncThunk('letterheads/delete', async (id) => {
  await api.delete(`/letterheads/${id}`);
  return id;
});

const letterheadsSlice = createSlice({
  name: 'letterheads',
  initialState: { records: [], status: 'idle' },
  reducers: {},
  extraReducers: (b) => {
    b.addCase(fetchLetterheads.fulfilled,  (state, { payload }) => { state.records = payload; })
     .addCase(saveLetterhead.fulfilled,    (state, { payload }) => { state.records.unshift(payload); })
     .addCase(updateLetterhead.fulfilled,  (state, { payload }) => {
       const i = state.records.findIndex((r) => r.id === payload.id);
       if (i !== -1) state.records[i] = payload;
     })
     .addCase(deleteLetterhead.fulfilled,  (state, { payload: id }) => {
       state.records = state.records.filter((r) => r.id !== id);
     });
  },
});

export const selectLetterheads = (s) => s.letterheads?.records ?? [];
export default letterheadsSlice.reducer;
