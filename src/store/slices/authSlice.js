import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

export const loginUser = createAsyncThunk(
  'auth/login',
  async ({ email, password }, { rejectWithValue }) => {
    try {
      const { data } = await api.post('/auth/login', { email, password });
      localStorage.setItem('ahms-token', data.data.token);
      return data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || 'Invalid email or password. Please try again.');
    }
  },
);

export const logoutUser = createAsyncThunk('auth/logout', async (_, { dispatch }) => {
  // Clear state immediately so the UI reacts before the server responds
  dispatch(logoutSync());
  localStorage.removeItem('ahms-token');
  try { await api.post('/auth/logout'); } catch { /* ignore */ }
});

export const updateAuthProfile = createAsyncThunk('auth/updateProfile', async (payload, { rejectWithValue }) => {
  try {
    const { data } = await api.patch('/auth/profile', payload);
    return data.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.error || 'Profile update failed');
  }
});

export const changePassword = createAsyncThunk('auth/changePassword', async (payload, { rejectWithValue }) => {
  try {
    await api.patch('/auth/change-password', payload);
  } catch (err) {
    return rejectWithValue(err.response?.data?.error || 'Failed to change password');
  }
});

const authSlice = createSlice({
  name: 'auth',
  initialState: { isAuthenticated: false, user: null, token: null, error: null },
  reducers: {
    clearAuthError: (state) => { state.error = null; },
    // Synchronous logout — clears Redux state in the same tick.
    // Used by the 401 interceptor so ProtectedRoute redirects without a hard reload.
    logoutSync: (state) => {
      state.isAuthenticated = false;
      state.user  = null;
      state.token = null;
      state.error = null;
    },
  },
  extraReducers: (b) => {
    b.addCase(loginUser.pending, (state) => { state.error = null; })
     .addCase(loginUser.fulfilled, (state, { payload }) => {
       state.isAuthenticated = true;
       state.user  = payload.user;
       state.token = payload.token;
       state.error = null;
     })
     .addCase(loginUser.rejected, (state, { payload }) => {
       state.error = payload || 'Login failed';
     })
     .addCase(logoutUser.fulfilled, (state) => {
       state.isAuthenticated = false;
       state.user  = null;
       state.token = null;
       state.error = null;
     })
     .addCase(updateAuthProfile.fulfilled, (state, { payload }) => {
       state.user = { ...state.user, ...payload };
     });
  },
});

export const { clearAuthError, logoutSync } = authSlice.actions;
export const selectIsAuthenticated = (s) => s.auth.isAuthenticated;
export const selectAuthUser        = (s) => s.auth.user;
export const selectAuthError       = (s) => s.auth.error;
export default authSlice.reducer;
