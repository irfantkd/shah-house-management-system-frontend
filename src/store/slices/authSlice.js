import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

const API_URL = import.meta.env.VITE_API_URL;

function authFetch(path, method, body, token) {
  return fetch(`${API_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}

export const loginUser = createAsyncThunk(
  'auth/login',
  async ({ email, password }, { rejectWithValue }) => {
    try {
      const res = await authFetch('/auth/login', 'POST', { email, password });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        return rejectWithValue(err.error || 'Invalid email or password. Please try again.');
      }
      const data = await res.json();
      localStorage.setItem('ahms-token', data.data.token);
      return data.data;
    } catch {
      return rejectWithValue('Network error. Please try again.');
    }
  },
);

export const logoutUser = createAsyncThunk('auth/logout', async (_, { dispatch, getState }) => {
  const token = getState().auth?.token;
  dispatch(logoutSync());
  localStorage.removeItem('ahms-token');
  try { await authFetch('/auth/logout', 'POST', null, token); } catch { /* ignore */ }
});

export const updateAuthProfile = createAsyncThunk('auth/updateProfile', async (payload, { getState, rejectWithValue }) => {
  try {
    const token = getState().auth?.token;
    const res = await authFetch('/auth/profile', 'PATCH', payload, token);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return rejectWithValue(err.error || 'Profile update failed');
    }
    const data = await res.json();
    return data.data;
  } catch {
    return rejectWithValue('Profile update failed');
  }
});

export const changePassword = createAsyncThunk('auth/changePassword', async (payload, { getState, rejectWithValue }) => {
  try {
    const token = getState().auth?.token;
    const res = await authFetch('/auth/change-password', 'PATCH', payload, token);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return rejectWithValue(err.error || 'Failed to change password');
    }
  } catch {
    return rejectWithValue('Failed to change password');
  }
});

const authSlice = createSlice({
  name: 'auth',
  initialState: { isAuthenticated: false, user: null, token: null, error: null },
  reducers: {
    clearAuthError: (state) => { state.error = null; },
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
