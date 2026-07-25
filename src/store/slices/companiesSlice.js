import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

export const fetchCompanies = createAsyncThunk('companies/fetchAll', async (params) => {
  const { data } = await api.get('/companies', { params });
  return data.data;
});

export const addCompany = createAsyncThunk('companies/add', async (payload) => {
  const { data } = await api.post('/companies', payload);
  return data.data;
});

export const updateCompany = createAsyncThunk('companies/update', async ({ id, ...payload }) => {
  const { data } = await api.put(`/companies/${id}`, payload);
  return data.data;
});

export const deleteCompany = createAsyncThunk('companies/delete', async (id) => {
  await api.delete(`/companies/${id}`);
  return id;
});

const companiesSlice = createSlice({
  name: 'companies',
  initialState: { items: [], status: 'idle' },
  reducers: {},
  extraReducers: (b) => {
    b.addCase(fetchCompanies.fulfilled, (state, { payload }) => { state.items = payload; })
     .addCase(addCompany.fulfilled,    (state, { payload }) => { state.items.push(payload); })
     .addCase(updateCompany.fulfilled, (state, { payload }) => {
       const i = state.items.findIndex((c) => c.id === payload.id);
       if (i !== -1) state.items[i] = payload;
     })
     .addCase(deleteCompany.fulfilled, (state, { payload: id }) => {
       state.items = state.items.filter((c) => c.id !== id);
     });
  },
});

export const selectCompanies   = (s) => s.companies.items ?? [];
export const selectCompanyById = (id) => (s) => (s.companies.items ?? []).find((c) => c.id === id);
export default companiesSlice.reducer;
