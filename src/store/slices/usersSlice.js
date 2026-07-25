import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

export const fetchUsers = createAsyncThunk('users/fetchAll', async (_, { rejectWithValue }) => {
  try {
    const { data } = await api.get('/users');
    return data.data;
  } catch { return rejectWithValue([]); }
});

export const addUser = createAsyncThunk('users/add', async (payload, { rejectWithValue }) => {
  try {
    const { data } = await api.post('/users', payload);
    return data.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.error || 'Failed to create user');
  }
});

export const updateUser = createAsyncThunk('users/update', async ({ id, ...payload }, { rejectWithValue }) => {
  try {
    const { data } = await api.put(`/users/${id}`, payload);
    return data.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.error || 'Failed to update user');
  }
});

export const deleteUser = createAsyncThunk('users/delete', async (id, { rejectWithValue }) => {
  try {
    await api.delete(`/users/${id}`);
    return id;
  } catch (err) {
    return rejectWithValue(err.response?.data?.error || 'Failed to delete user');
  }
});

export const adminResetPassword = createAsyncThunk('users/resetPassword', async ({ id, newPassword }, { rejectWithValue }) => {
  try {
    await api.patch(`/users/${id}/reset-password`, { newPassword });
  } catch (err) {
    return rejectWithValue(err.response?.data?.error || 'Failed to reset password');
  }
});

const usersSlice = createSlice({
  name: 'users',
  initialState: { items: [], status: 'idle' },
  reducers: {},
  extraReducers: (b) => {
    b.addCase(fetchUsers.fulfilled,  (state, { payload }) => { state.items = payload; state.status = 'succeeded'; })
     .addCase(fetchUsers.pending,    (state) => { state.status = 'loading'; })
     .addCase(addUser.fulfilled,     (state, { payload }) => { state.items.unshift(payload); })
     .addCase(updateUser.fulfilled,  (state, { payload }) => {
       const i = state.items.findIndex((u) => u.id === payload.id);
       if (i !== -1) state.items[i] = payload;
     })
     .addCase(deleteUser.fulfilled,  (state, { payload: id }) => {
       state.items = state.items.filter((u) => u.id !== id);
     });
  },
});

export const selectUsers      = (s) => s.users?.items ?? [];
export const selectUsersStatus = (s) => s.users?.status ?? 'idle';

export default usersSlice.reducer;
