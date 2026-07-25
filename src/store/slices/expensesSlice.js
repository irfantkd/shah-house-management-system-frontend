import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

export const fetchExpenses = createAsyncThunk('expenses/fetchAll', async (params) => {
  const { data } = await api.get('/expenses', { params });
  return data.data;
});

export const addExpense = createAsyncThunk('expenses/add', async (payload, { getState }) => {
  const pid = getState().properties?.currentId;
  const { data } = await api.post('/expenses', {
    date: new Date().toISOString().split('T')[0],
    ...payload,
    propertyId: pid,
  });
  return data.data;
});

export const updateExpense = createAsyncThunk('expenses/update', async ({ id, ...payload }) => {
  const { data } = await api.put(`/expenses/${id}`, payload);
  return data.data;
});

export const deleteExpense = createAsyncThunk('expenses/delete', async (id) => {
  await api.delete(`/expenses/${id}`);
  return id;
});

const expensesSlice = createSlice({
  name: 'expenses',
  initialState: { items: [], status: 'idle' },
  reducers: {},
  extraReducers: (b) => {
    b.addCase(fetchExpenses.fulfilled,  (state, { payload }) => { state.items = payload; })
     .addCase(addExpense.fulfilled,    (state, { payload }) => { state.items.push(payload); })
     .addCase(updateExpense.fulfilled, (state, { payload }) => {
       const i = state.items.findIndex((e) => e.id === payload.id);
       if (i !== -1) state.items[i] = payload;
     })
     .addCase(deleteExpense.fulfilled, (state, { payload: id }) => {
       state.items = state.items.filter((e) => e.id !== id);
     });
  },
});

const pid = (s) => s.properties?.currentId;
export const selectExpenses = (s) => (s.expenses.items ?? []).filter((e) => e.propertyId === pid(s));
export default expensesSlice.reducer;
