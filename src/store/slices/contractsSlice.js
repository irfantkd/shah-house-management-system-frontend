import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

export const fetchContracts = createAsyncThunk('contracts/fetchAll', async (params) => {
  const { data } = await api.get('/contracts', { params });
  return data.data;
});

export const addContract = createAsyncThunk('contracts/add', async (payload, { getState }) => {
  const pid = getState().properties?.currentId;
  const { data } = await api.post('/contracts', { ...payload, propertyId: pid });
  return data.data;
});

export const updateContract = createAsyncThunk('contracts/update', async ({ id, ...payload }) => {
  const { data } = await api.put(`/contracts/${id}`, payload);
  return data.data;
});

export const deleteContract = createAsyncThunk('contracts/delete', async (id) => {
  await api.delete(`/contracts/${id}`);
  return id;
});

const contractsSlice = createSlice({
  name: 'contracts',
  initialState: { items: [], status: 'idle' },
  reducers: {},
  extraReducers: (b) => {
    b.addCase(fetchContracts.fulfilled, (state, { payload }) => { state.items = payload; })
     .addCase(addContract.fulfilled,    (state, { payload }) => { state.items.push(payload); })
     .addCase(updateContract.fulfilled, (state, { payload }) => {
       const i = state.items.findIndex((c) => c.id === payload.id);
       if (i !== -1) state.items[i] = payload;
     })
     .addCase(deleteContract.fulfilled, (state, { payload: id }) => {
       state.items = state.items.filter((c) => c.id !== id);
     });
  },
});

const pid = (s) => s.properties?.currentId;
export const selectContracts          = (s) => (s.contracts.items ?? []).filter((c) => c.propertyId === pid(s));
export const selectContractById       = (id) => (s) => (s.contracts.items ?? []).find((c) => c.id === id);
export const selectContractsByCompany = (companyId) => (s) =>
  (s.contracts.items ?? []).filter((c) => c.companyId === companyId && c.propertyId === pid(s));
export default contractsSlice.reducer;
