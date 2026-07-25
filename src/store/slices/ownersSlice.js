import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

export const fetchOwners = createAsyncThunk('owners/fetchAll', async (params) => {
  const { data } = await api.get('/owners', { params });
  return data.data;
});

export const addOwner = createAsyncThunk('owners/add', async (payload, { getState }) => {
  const pid = getState().properties?.currentId;
  const { data } = await api.post('/owners', { ...payload, propertyId: pid });
  return data.data;
});

export const updateOwner = createAsyncThunk('owners/update', async ({ id, ...payload }) => {
  const { data } = await api.put(`/owners/${id}`, payload);
  return data.data;
});

export const deleteOwner = createAsyncThunk('owners/delete', async (id) => {
  await api.delete(`/owners/${id}`);
  return id;
});

const ownersSlice = createSlice({
  name: 'owners',
  initialState: { items: [], status: 'idle' },
  reducers: {},
  extraReducers: (b) => {
    b.addCase(fetchOwners.fulfilled,  (state, { payload }) => { state.items = payload; })
     .addCase(addOwner.fulfilled,    (state, { payload }) => { state.items.push(payload); })
     .addCase(updateOwner.fulfilled, (state, { payload }) => {
       const i = state.items.findIndex((o) => o.id === payload.id);
       if (i !== -1) state.items[i] = payload;
     })
     .addCase(deleteOwner.fulfilled, (state, { payload: id }) => {
       state.items = state.items.filter((o) => o.id !== id);
     });
  },
});

const pid = (s) => s.properties?.currentId;

export const selectOwners = (s) => (s.owners.items ?? []).filter((o) => o.propertyId === pid(s));

export const selectOwnerBirthdays = (s) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return (s.owners.items ?? [])
    .filter((o) => o.dateOfBirth && o.propertyId === pid(s))
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
