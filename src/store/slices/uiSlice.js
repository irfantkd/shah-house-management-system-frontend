import { createSlice } from '@reduxjs/toolkit';

const uiSlice = createSlice({
  name: 'ui',
  initialState: {
    sidebarCollapsed: false,
    theme: 'light',
  },
  reducers: {
    toggleSidebar: (state) => { state.sidebarCollapsed = !state.sidebarCollapsed; },
    setSidebarCollapsed: (state, action) => { state.sidebarCollapsed = action.payload; },
    setTheme: (state, action) => { state.theme = action.payload; },
  },
});

export const { toggleSidebar, setSidebarCollapsed, setTheme } = uiSlice.actions;
export default uiSlice.reducer;
