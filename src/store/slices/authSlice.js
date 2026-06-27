import { createSlice } from '@reduxjs/toolkit';

const USERS = [
  { id: '1', email: 'admin@shahhouse.ae',  password: 'shah2026',  name: 'Shah',         role: 'Property Owner', initials: 'SH' },
  { id: '2', email: 'manager@shahhouse.ae', password: 'manager123', name: 'Shah Manager', role: 'Property Manager', initials: 'SM' },
];

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    isAuthenticated: false,
    user: null,
    error: null,
  },
  reducers: {
    loginUser: (state, { payload: { email, password } }) => {
      const user = USERS.find(
        (u) => u.email.toLowerCase() === email.toLowerCase().trim() && u.password === password,
      );
      if (user) {
        state.isAuthenticated = true;
        state.user = { id: user.id, email: user.email, name: user.name, role: user.role, initials: user.initials };
        state.error = null;
      } else {
        state.error = 'Invalid email or password. Please try again.';
      }
    },
    logoutUser: (state) => {
      state.isAuthenticated = false;
      state.user = null;
      state.error = null;
    },
    clearAuthError: (state) => { state.error = null; },
  },
});

export const { loginUser, logoutUser, clearAuthError } = authSlice.actions;
export const selectIsAuthenticated = (s) => s.auth.isAuthenticated;
export const selectAuthUser         = (s) => s.auth.user;
export const selectAuthError        = (s) => s.auth.error;
export default authSlice.reducer;
